import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildApiHeaders,
  buildCommonsSearchUrl,
  buildUserAgent,
  fetchJsonCached,
  isAcceptedReusableLicense,
  parseArgs,
  requireWikimediaEmail,
  searchCommons,
  scientificNameToSlug,
  upsertMissingBird,
} from "./import-bird-images";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("bird image import helpers", () => {
  it("uses scientific names for stable species slugs", () => {
    expect(scientificNameToSlug("Turdus merula")).toBe("turdus-merula");
    expect(scientificNameToSlug("  Parus   major  ")).toBe("parus-major");
  });

  it("identifies Wikimedia API requests with contact info", () => {
    expect(buildApiHeaders("SwissBirdsQuizBot/0.1 (https://example.test/contact)")).toEqual({
      "Accept-Encoding": "gzip",
      "User-Agent": "SwissBirdsQuizBot/0.1 (https://example.test/contact)",
    });
  });

  it("builds Wikimedia User-Agent from required email", () => {
    expect(buildUserAgent("birder@example.test")).toBe(
      "SwissBirdsQuizBot/0.1 (birder@example.test)",
    );
  });

  it("fails when Wikimedia email is missing", () => {
    expect(() => requireWikimediaEmail({})).toThrow("Set WIKIMEDIA_EMAIL in .env");
  });

  it("accepts pnpm script argument separator", () => {
    expect(parseArgs(["--", "--species-file", "data/species.json"])).toEqual({
      "species-file": "data/species.json",
    });
  });

  it("uses Commons Action API for file search", () => {
    const url = buildCommonsSearchUrl("Turdus merula");

    expect(url.pathname).toBe("/w/api.php");
    expect(url.searchParams.get("generator")).toBe("search");
    expect(url.searchParams.get("gsrnamespace")).toBe("6");
    expect(url.searchParams.get("gsrsearch")).toBe("Turdus merula");
  });

  it("continues Commons search past first page and keeps API order", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "commons-search-pages-"));

    try {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              continue: { gsroffset: 25 },
              query: {
                pages: {
                  1: { pageid: 1, title: "File:First page result.jpg", index: 2 },
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              query: {
                pages: {
                  2: { pageid: 2, title: "File:Second page result.jpg", index: 26 },
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        ) as typeof fetch;

      const results = await searchCommons(
        workspace,
        "Erithacus rubecula",
        "SwissBirdsQuizBot/0.1 (birder@example.test)",
        { bypassCache: true },
      );

      expect(results).toEqual([
        { id: 1, title: "File:First page result.jpg" },
        { id: 2, title: "File:Second page result.jpg" },
      ]);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    } finally {
      await rm(workspace, { force: true, recursive: true });
    }
  });

  it("accepts CC BY and CC BY-SA bird images", () => {
    expect(
      isAcceptedReusableLicense({
        licenseCode: "cc-by-4.0",
        licenseShortName: "CC BY 4.0",
        usageTerms: "Creative Commons Attribution 4.0",
      }),
    ).toBe(true);
    expect(
      isAcceptedReusableLicense({
        licenseCode: "cc-by-sa-4.0",
        licenseShortName: "CC BY-SA 4.0",
        usageTerms: "Creative Commons Attribution-Share Alike 4.0",
      }),
    ).toBe(true);
  });

  it("rejects non-commercial or unknown licenses", () => {
    expect(
      isAcceptedReusableLicense({
        licenseCode: "cc-by-nc-4.0",
        licenseShortName: "CC BY-NC 4.0",
        usageTerms: "Creative Commons Attribution-NonCommercial 4.0",
      }),
    ).toBe(false);
    expect(
      isAcceptedReusableLicense({
        licenseCode: "",
        licenseShortName: "All rights reserved",
        usageTerms: "All rights reserved",
      }),
    ).toBe(false);
  });

  it("records missing birds without duplicating entries", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "missing-birds-"));

    try {
      await upsertMissingBird(workspace, {
        scientificName: "Turdus merula",
        commonName: "Common blackbird",
        reason: "no-approved-image",
      });
      await upsertMissingBird(workspace, {
        scientificName: "Turdus merula",
        commonName: "Common blackbird",
        reason: "no-approved-image",
      });

      const contents = JSON.parse(
        await readFile(join(workspace, "data", "missing-birds.json"), "utf8"),
      );

      expect(contents).toEqual([
        {
          scientificName: "Turdus merula",
          commonName: "Common blackbird",
          reason: "no-approved-image",
        },
      ]);
    } finally {
      await rm(workspace, { force: true, recursive: true });
    }
  });

  it("bypasses cache for missing-bird refreshes without overwriting cache", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "wikimedia-cache-bypass-"));
    const url = new URL("https://commons.wikimedia.org/w/api.php?action=query&gsrsearch=Turdus%20merula");
    const cachePath = join(
      workspace,
      "tmp",
      "wikimedia-cache",
      `${createHash("sha256").update(url.toString()).digest("hex")}.json`,
    );

    try {
      await mkdir(join(workspace, "tmp", "wikimedia-cache"), { recursive: true });
      await writeFile(cachePath, `${JSON.stringify({ value: "stale" })}\n`, { encoding: "utf8" });
      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ value: "fresh" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ) as typeof fetch;

      const result = await fetchJsonCached<{ value: string }>(
        workspace,
        url,
        "SwissBirdsQuizBot/0.1 (birder@example.test)",
        { bypassCache: true },
      );

      expect(result).toEqual({ value: "fresh" });
      expect(JSON.parse(await readFile(cachePath, "utf8"))).toEqual({ value: "stale" });
      expect(global.fetch).toHaveBeenCalledOnce();
    } finally {
      await rm(workspace, { force: true, recursive: true });
    }
  });

  it("uses cached Wikimedia JSON for non-missing species", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "wikimedia-cache-hit-"));
    const url = new URL("https://commons.wikimedia.org/w/api.php?action=query&gsrsearch=Parus%20major");
    const cachePath = join(
      workspace,
      "tmp",
      "wikimedia-cache",
      `${createHash("sha256").update(url.toString()).digest("hex")}.json`,
    );

    try {
      await mkdir(join(workspace, "tmp", "wikimedia-cache"), { recursive: true });
      await writeFile(cachePath, `${JSON.stringify({ value: "cached" })}\n`, { encoding: "utf8" });
      global.fetch = vi.fn() as typeof fetch;

      const result = await fetchJsonCached<{ value: string }>(
        workspace,
        url,
        "SwissBirdsQuizBot/0.1 (birder@example.test)",
      );

      expect(result).toEqual({ value: "cached" });
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      await rm(workspace, { force: true, recursive: true });
    }
  });
});
