import { createHash } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { spawn } from "node:child_process";
import {
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import sharp from "sharp";

type Species = {
  scientificName: string;
  commonName: string;
};

type MissingBird = Species & {
  reason: "no-approved-image";
};

type CatalogImage = {
  id: string;
  path: string;
  provenancePath: string;
};

type CatalogBird = Species & {
  slug: string;
  images: CatalogImage[];
};

type Catalog = {
  birds: CatalogBird[];
};

type ImportLog = {
  rejectedCommonsPageIds: number[];
};

type FetchJsonCachedOptions = {
  bypassCache?: boolean;
};

type SearchResult = {
  id: number;
  pageid?: number;
  title: string;
  index?: number;
};

type SearchResponse = {
  continue?: {
    gsroffset?: number;
  };
  query?: {
    pages?: Record<string, SearchResult>;
  };
};

type CommonsMetadata = {
  pageId: number;
  title: string;
  filePageUrl: string;
  sourceUrl: string;
  thumbUrl: string;
  mime: string;
  width: number;
  height: number;
  licenseShortName: string;
  licenseCode: string;
  licenseUrl: string;
  usageTerms: string;
  artist: string;
  credit: string;
};

type ProcessedImage = {
  buffer: Buffer;
  width: number;
  height: number;
  bytes: number;
};

const maxBytes = 100 * 1024;
const maxLongEdge = 960;
const commonsThumbnailWidth = 800;
const commonsSearchLimit = 25;
const maxCommonsSearchCandidates = 100;
const publicDomainMarkers = ["public domain", "cc0", "pd-old", "pd-self", "pd-author", "pd-usgov"];
const reusableLicensePatterns = [/^cc-by(?:-[0-9.]+)?$/, /^cc-by-sa(?:-[0-9.]+)?$/];

export function scientificNameToSlug(scientificName: string) {
  return scientificName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function upsertMissingBird(root: string, missingBird: MissingBird) {
  const manifestPath = join(root, "data", "missing-birds.json");
  const missingBirds = await readJson<MissingBird[]>(manifestPath, []);
  const existingIndex = missingBirds.findIndex(
    (bird) => bird.scientificName === missingBird.scientificName,
  );

  if (existingIndex === -1) {
    missingBirds.push(missingBird);
  } else {
    missingBirds[existingIndex] = missingBird;
  }

  missingBirds.sort((left, right) => left.scientificName.localeCompare(right.scientificName));
  await writeJson(manifestPath, missingBirds);
}

export function buildApiHeaders(userAgent: string) {
  return {
    "Accept-Encoding": "gzip",
    "User-Agent": userAgent,
  };
}

export function buildUserAgent(email: string) {
  return `SwissBirdsQuizBot/0.1 (${email})`;
}

export function requireWikimediaEmail(env: Record<string, string | undefined>) {
  const email = env.WIKIMEDIA_EMAIL?.trim();

  if (!email) {
    throw new Error("Set WIKIMEDIA_EMAIL in .env before importing Wikimedia images.");
  }

  return email;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const speciesFile = args["species-file"];

  if (!speciesFile) {
    throw new Error("Usage: pnpm import:bird-images -- --species-file data/species.json");
  }

  const root = process.cwd();
  const env = { ...process.env, ...(await readEnvFile(join(root, ".env"))) };
  const speciesList = await readJson<Species[]>(join(root, speciesFile), []);
  const missingBirds = await readJson<MissingBird[]>(join(root, "data", "missing-birds.json"), []);
  const missingScientificNames = new Set(missingBirds.map((bird) => bird.scientificName));
  const userAgent = buildUserAgent(requireWikimediaEmail(env));
  const rl = createInterface({ input, output });
  const summary = { imported: 0, skipped: 0, missing: 0 };

  try {
    for (const species of speciesList) {
      const result = await importSpeciesImage(
        root,
        species,
        userAgent,
        rl,
        missingScientificNames.has(species.scientificName),
      );
      summary[result] += 1;
    }
  } finally {
    rl.close();
  }

  console.log(
    `Imported ${summary.imported}, skipped ${summary.skipped}, missing ${summary.missing}.`,
  );

  if (summary.missing > 0) {
    process.exitCode = 1;
  }
}

async function importSpeciesImage(
  root: string,
  species: Species,
  userAgent: string,
  rl: ReturnType<typeof createInterface>,
  bypassCache: boolean,
): Promise<"imported" | "skipped" | "missing"> {
  const speciesSlug = scientificNameToSlug(species.scientificName);
  const catalog = await readCatalog(root);
  const existingBird = catalog.birds.find((bird) => bird.scientificName === species.scientificName);

  if (existingBird && existingBird.images.length > 0) {
    console.log(`Skipping ${species.scientificName}: already has MVP image.`);
    return "skipped";
  }

  const importLog = await readImportLog(root, speciesSlug);
  const queries = [species.scientificName, species.commonName];
  const seenPageIds = new Set<number>();

  if (bypassCache) {
    console.log(`Refreshing missing bird without cache: ${species.scientificName}`);
  }

  for (const query of queries) {
    const candidates = await searchCommons(root, query, userAgent, { bypassCache });

    for (const candidate of candidates) {
      if (seenPageIds.has(candidate.id) || importLog.rejectedCommonsPageIds.includes(candidate.id)) {
        continue;
      }

      seenPageIds.add(candidate.id);
      const metadata = await fetchCommonsMetadata(root, candidate, userAgent, { bypassCache });

      if (!metadata || !isAcceptedReusableLicense(metadata)) {
        await rejectCandidate(root, speciesSlug, importLog, candidate.id);
        continue;
      }

      console.log(`Review source for ${species.scientificName}: ${metadata.filePageUrl}`);
      await openUrl(metadata.filePageUrl);

      if (!(await askYesNo(rl, "Approve source page? [y/n] "))) {
        await rejectCandidate(root, speciesSlug, importLog, candidate.id);
        continue;
      }

      const sourceBytes = await downloadBytes(metadata.thumbUrl || metadata.sourceUrl, userAgent);
      const processed = await processImage(sourceBytes);

      if (!processed) {
        await rejectCandidate(root, speciesSlug, importLog, candidate.id);
        continue;
      }

      const imageId = commonsImageId(metadata);
      const previewPath = join(root, "tmp", "import-preview", `${imageId}.webp`);
      await writeFileSafe(previewPath, processed.buffer);
      await openUrl(pathToFileURL(previewPath).href);

      if (!(await askYesNo(rl, "Approve processed WebP? [y/n] "))) {
        await rejectCandidate(root, speciesSlug, importLog, candidate.id);
        await rm(previewPath, { force: true });
        continue;
      }

      await storeApprovedImage(root, species, speciesSlug, imageId, metadata, processed, previewPath);
      await removeMissingBird(root, species.scientificName);
      return "imported";
    }
  }

  await upsertMissingBird(root, {
    scientificName: species.scientificName,
    commonName: species.commonName,
    reason: "no-approved-image",
  });
  return "missing";
}

export async function searchCommons(
  root: string,
  query: string,
  userAgent: string,
  options: FetchJsonCachedOptions = {},
) {
  const candidates: Array<{ id: number; title: string; index: number }> = [];
  const seenPageIds = new Set<number>();
  let offset = 0;

  while (candidates.length < maxCommonsSearchCandidates) {
    const url = buildCommonsSearchUrl(query, offset);
    const response = await fetchJsonCached<SearchResponse>(root, url, userAgent, options);
    const pages = Object.values(response.query?.pages ?? {})
      .map((page) => ({
        id: page.id ?? page.pageid ?? 0,
        title: page.title,
        index: page.index ?? Number.MAX_SAFE_INTEGER,
      }))
      .filter((page) => page.id && page.title.startsWith("File:"))
      .sort((left, right) => left.index - right.index);

    for (const page of pages) {
      if (!seenPageIds.has(page.id)) {
        seenPageIds.add(page.id);
        candidates.push(page);
      }
    }

    const nextOffset = response.continue?.gsroffset;

    if (nextOffset === undefined || nextOffset <= offset) {
      break;
    }

    offset = nextOffset;
  }

  return candidates.slice(0, maxCommonsSearchCandidates).map(({ id, title }) => ({ id, title }));
}

export function buildCommonsSearchUrl(query: string, offset = 0) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", query);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", String(commonsSearchLimit));
  if (offset > 0) {
    url.searchParams.set("gsroffset", String(offset));
  }
  url.searchParams.set("prop", "info");
  return url;
}

async function fetchCommonsMetadata(
  root: string,
  candidate: SearchResult,
  userAgent: string,
  options: FetchJsonCachedOptions = {},
): Promise<CommonsMetadata | null> {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("pageids", String(candidate.id));
  url.searchParams.set("iiprop", "url|mime|size|extmetadata");
  url.searchParams.set("iiurlwidth", String(commonsThumbnailWidth));

  const response = await fetchJsonCached<any>(root, url, userAgent, options);
  const page = response.query?.pages?.[candidate.id];
  const imageInfo = page?.imageinfo?.[0];

  if (!page || !imageInfo) {
    return null;
  }

  const ext = imageInfo.extmetadata ?? {};
  return {
    pageId: Number(page.pageid),
    title: page.title,
    filePageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title).replace(/%20/g, "_")}`,
    sourceUrl: imageInfo.url,
    thumbUrl: imageInfo.thumburl ?? imageInfo.url,
    mime: imageInfo.mime,
    width: Number(imageInfo.width),
    height: Number(imageInfo.height),
    licenseShortName: htmlToText(ext.LicenseShortName?.value ?? ""),
    licenseCode: htmlToText(ext.License?.value ?? ""),
    licenseUrl: htmlToText(ext.LicenseUrl?.value ?? ""),
    usageTerms: htmlToText(ext.UsageTerms?.value ?? ""),
    artist: htmlToText(ext.Artist?.value ?? ""),
    credit: htmlToText(ext.Credit?.value ?? ""),
  };
}

export function isAcceptedReusableLicense(metadata: {
  licenseCode: string;
  licenseShortName: string;
  usageTerms: string;
}) {
  const licenseCode = metadata.licenseCode.toLowerCase();

  if (reusableLicensePatterns.some((pattern) => pattern.test(licenseCode))) {
    return true;
  }

  const licenseText = `${metadata.licenseShortName} ${metadata.usageTerms}`.toLowerCase();
  return publicDomainMarkers.some((marker) => licenseText.includes(marker));
}

async function processImage(sourceBytes: Buffer): Promise<ProcessedImage | null> {
  const widths = [960, 800, 640];
  const qualities = [82, 74, 66];

  for (const width of widths) {
    for (const quality of qualities) {
      const buffer = await sharp(sourceBytes)
        .rotate()
        .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();

      if (buffer.byteLength <= maxBytes) {
        const metadata = await sharp(buffer).metadata();
        return {
          buffer,
          width: metadata.width ?? 0,
          height: metadata.height ?? 0,
          bytes: buffer.byteLength,
        };
      }
    }
  }

  return null;
}

async function storeApprovedImage(
  root: string,
  species: Species,
  speciesSlug: string,
  imageId: string,
  metadata: CommonsMetadata,
  processed: ProcessedImage,
  previewPath: string,
) {
  const imagePath = join(root, "public", "birds", speciesSlug, `${imageId}.webp`);
  const provenancePath = join(root, "public", "birds", speciesSlug, `${imageId}.json`);
  await mkdir(dirname(imagePath), { recursive: true });
  await rename(previewPath, imagePath).catch(async () => copyFile(previewPath, imagePath));
  await writeJson(provenancePath, {
    id: imageId,
    scientificName: species.scientificName,
    commonName: species.commonName,
    commonsPageId: metadata.pageId,
    commonsTitle: metadata.title,
    filePageUrl: metadata.filePageUrl,
    sourceUrl: metadata.sourceUrl,
    downloadedUrl: metadata.thumbUrl || metadata.sourceUrl,
    licenseShortName: metadata.licenseShortName,
    licenseUrl: metadata.licenseUrl,
    usageTerms: metadata.usageTerms,
    artist: metadata.artist,
    credit: metadata.credit,
    originalWidth: metadata.width,
    originalHeight: metadata.height,
    processedWidth: processed.width,
    processedHeight: processed.height,
    processedBytes: processed.bytes,
  });

  const catalog = await readCatalog(root);
  const catalogImage = {
    id: imageId,
    path: `/birds/${speciesSlug}/${imageId}.webp`,
    provenancePath: `/birds/${speciesSlug}/${imageId}.json`,
  };
  let bird = catalog.birds.find((entry) => entry.scientificName === species.scientificName);

  if (!bird) {
    bird = { ...species, slug: speciesSlug, images: [] };
    catalog.birds.push(bird);
  }

  if (!bird.images.some((image) => image.id === imageId)) {
    bird.images.push(catalogImage);
  }

  catalog.birds.sort((left, right) => left.scientificName.localeCompare(right.scientificName));
  await writeJson(join(root, "src", "birds", "catalog.json"), catalog);
}

async function rejectCandidate(
  root: string,
  speciesSlug: string,
  importLog: ImportLog,
  pageId: number,
) {
  if (!importLog.rejectedCommonsPageIds.includes(pageId)) {
    importLog.rejectedCommonsPageIds.push(pageId);
    importLog.rejectedCommonsPageIds.sort((left, right) => left - right);
    await writeImportLog(root, speciesSlug, importLog);
  }
}

async function readCatalog(root: string) {
  return readJson<Catalog>(join(root, "src", "birds", "catalog.json"), { birds: [] });
}

async function readImportLog(root: string, speciesSlug: string) {
  return readJson<ImportLog>(join(root, "data", "imports", `${speciesSlug}.json`), {
    rejectedCommonsPageIds: [],
  });
}

async function writeImportLog(root: string, speciesSlug: string, importLog: ImportLog) {
  await writeJson(join(root, "data", "imports", `${speciesSlug}.json`), importLog);
}

async function removeMissingBird(root: string, scientificName: string) {
  const manifestPath = join(root, "data", "missing-birds.json");
  const missingBirds = await readJson<MissingBird[]>(manifestPath, []);
  await writeJson(
    manifestPath,
    missingBirds.filter((bird) => bird.scientificName !== scientificName),
  );
}

export async function fetchJsonCached<T>(
  root: string,
  url: URL,
  userAgent: string,
  options: FetchJsonCachedOptions = {},
): Promise<T> {
  const cachePath = join(root, "tmp", "wikimedia-cache", `${hash(url.toString())}.json`);

  if (!options.bypassCache && existsSync(cachePath)) {
    return JSON.parse(await readFile(cachePath, "utf8"));
  }

  const response = await fetchWithRetry(url, { headers: buildApiHeaders(userAgent) });

  if (!response.ok) {
    throw new Error(`Wikimedia request failed: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as T;

  if (!options.bypassCache) {
    await writeJson(cachePath, json);
  }

  return json;
}

async function downloadBytes(url: string, userAgent: string) {
  const response = await fetchWithRetry(url, { headers: { "User-Agent": userAgent } });

  if (!response.ok) {
    throw new Error(`Image download failed: ${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function fetchWithRetry(url: URL | string, init: RequestInit) {
  const response = await fetch(url, init);

  if (response.status !== 429) {
    return response;
  }

  const retryAfter = response.headers.get("retry-after");
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : 5;
  await sleep(Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : 5000);
  return fetch(url, init);
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function askYesNo(rl: ReturnType<typeof createInterface>, prompt: string) {
  const answer = (await rl.question(prompt)).trim().toLowerCase();
  return answer === "y" || answer === "yes";
}

async function openUrl(url: string) {
  const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(opener, args, { detached: true, stdio: "ignore" });
  child.unref();
}

function commonsImageId(metadata: CommonsMetadata) {
  return `commons-${metadata.pageId}-${scientificNameToSlug(metadata.title.replace(/^File:/, "")).slice(0, 48)}`;
}

export function parseArgs(args: string[]) {
  const parsed: Record<string, string | undefined> = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--") {
      continue;
    }

    if (arg.startsWith("--")) {
      parsed[arg.slice(2)] = args[index + 1];
      index += 1;
    }
  }

  return parsed;
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  if (!existsSync(path)) {
    return fallback;
  }

  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function readEnvFile(path: string) {
  if (!existsSync(path)) {
    return {};
  }

  const env: Record<string, string> = {};
  const lines = (await readFile(path, "utf8")).split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^"|"$/g, "");
    env[key] = value;
  }

  return env;
}

async function writeJson(path: string, value: unknown) {
  await writeFileSafe(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeFileSafe(path: string, contents: string | Buffer) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function htmlToText(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
