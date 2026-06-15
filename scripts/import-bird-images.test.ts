import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  buildApiHeaders,
  buildCommonsSearchUrl,
  buildUserAgent,
  isAcceptedReusableLicense,
  parseArgs,
  requireWikimediaEmail,
  scientificNameToSlug,
  upsertMissingBird,
} from "./import-bird-images";

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
});
