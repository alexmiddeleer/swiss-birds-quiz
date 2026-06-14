// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { renderHomePage } from "./homepage";

describe("homepage", () => {
  it("shows the app title and start quiz button", () => {
    const root = document.createElement("main");

    renderHomePage(root);

    expect(root.querySelector("h1")?.textContent).toBe("Swiss Birds Quiz");
    expect(root.querySelector("button")?.textContent).toBe("Start quiz");
  });

  it("starts a quiz with a bird photo, prompt, and citation", async () => {
    const root = document.createElement("main");

    renderHomePage(root, testCatalog, loadTestProvenance);
    root.querySelector("button")?.click();
    await Promise.resolve();

    expect(root.querySelector("img")?.getAttribute("src")).toBe(
      "/birds/turdus-merula/blackbird.webp",
    );
    expect(root.textContent).toContain("tap to show name");
    expect(root.textContent).toContain("Photo: Bird Photographer");
    expect(root.textContent).toContain("Own work");
    expect(root.textContent).toContain("CC0");
    expect(root.textContent).not.toContain("Common blackbird");
  });

  it("reveals common and scientific names after tapping the quiz photo", async () => {
    const root = document.createElement("main");

    renderHomePage(root, testCatalog, loadTestProvenance);
    root.querySelector("button")?.click();
    await Promise.resolve();
    root.querySelector(".quiz-card")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(root.textContent).toContain("Common blackbird");
    expect(root.textContent).toContain("Turdus merula");
  });
});

const testCatalog = {
  birds: [
    {
      scientificName: "Turdus merula",
      commonName: "Common blackbird",
      slug: "turdus-merula",
      images: [
        {
          id: "blackbird",
          path: "/birds/turdus-merula/blackbird.webp",
          provenancePath: "/birds/turdus-merula/blackbird.json",
        },
      ],
    },
  ],
};

async function loadTestProvenance() {
  return {
    artist: "Bird Photographer",
    credit: "Own work",
    filePageUrl: "https://commons.wikimedia.org/wiki/File:Blackbird.jpg",
    licenseShortName: "CC0",
  };
}
