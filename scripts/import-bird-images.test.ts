import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { scientificNameToSlug, upsertMissingBird } from "./import-bird-images";

describe("bird image import helpers", () => {
  it("uses scientific names for stable species slugs", () => {
    expect(scientificNameToSlug("Turdus merula")).toBe("turdus-merula");
    expect(scientificNameToSlug("  Parus   major  ")).toBe("parus-major");
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
