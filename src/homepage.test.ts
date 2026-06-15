// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

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
    expect(root.textContent).toContain("Blackbird portrait");
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

  it("shows a Next bird button after the name is revealed", async () => {
    const root = document.createElement("main");

    renderHomePage(root, testCatalog, loadTestProvenance, noShuffle);
    root.querySelector("button")?.click();
    await Promise.resolve();

    expect(root.querySelector("[data-action='next-bird']")).toBeNull();

    root.querySelector(".quiz-card")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(root.querySelector("[data-action='next-bird']")?.textContent).toBe("Next bird");
  });
});

describe("quiz round progression", () => {
  it("advances to the next bird unrevealed after clicking Next bird", async () => {
    const root = document.createElement("main");

    renderHomePage(root, twoBirdCatalog, loadTestProvenance, noShuffle);
    root.querySelector("button")?.click();
    await Promise.resolve();

    // Reveal first bird
    root.querySelector(".quiz-card")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Click Next bird
    root.querySelector("[data-action='next-bird']")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();

    expect(root.querySelector("img")?.getAttribute("src")).toBe("/birds/parus-major/greattit.webp");
    expect(root.textContent).toContain("tap to show name");
    expect(root.textContent).not.toContain("Great tit");
    expect(root.querySelector("[data-action='next-bird']")).toBeNull();
  });
});

describe("quiz controls", () => {
  it("shows End Quiz and Refresh App buttons before the name is revealed", async () => {
    const root = document.createElement("main");

    renderHomePage(root, testCatalog, loadTestProvenance, noShuffle);
    root.querySelector("button")?.click();
    await Promise.resolve();

    expect(root.querySelector("[data-action='end-quiz']")).not.toBeNull();
    expect(root.querySelector("[data-action='refresh-app']")).not.toBeNull();
  });

  it("shows End Quiz and Refresh App buttons after the name is revealed", async () => {
    const root = document.createElement("main");

    renderHomePage(root, testCatalog, loadTestProvenance, noShuffle);
    root.querySelector("button")?.click();
    await Promise.resolve();
    root.querySelector(".quiz-card")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(root.querySelector("[data-action='end-quiz']")).not.toBeNull();
    expect(root.querySelector("[data-action='refresh-app']")).not.toBeNull();
  });

  it("returns to the home screen when End Quiz is clicked", async () => {
    const root = document.createElement("main");

    renderHomePage(root, testCatalog, loadTestProvenance, noShuffle);
    root.querySelector("button")?.click();
    await Promise.resolve();
    root.querySelector("[data-action='end-quiz']")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(root.querySelector("h1")?.textContent).toBe("Swiss Birds Quiz");
    expect(root.querySelector("[data-action='end-quiz']")).toBeNull();
  });
});

describe("Refresh App", () => {
  it("calls location.reload when Refresh App is clicked", async () => {
    const reload = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, reload });

    const root = document.createElement("main");
    renderHomePage(root, testCatalog, loadTestProvenance, noShuffle);
    root.querySelector("button")?.click();
    await Promise.resolve();

    root.querySelector("[data-action='refresh-app']")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(reload).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });
});

describe("Quiz round restart", () => {
  it("shows birds again after all birds in a round have been seen", async () => {
    const root = document.createElement("main");

    renderHomePage(root, twoBirdCatalog, loadTestProvenance, noShuffle);
    root.querySelector("button")?.click();
    await Promise.resolve();

    // Reveal first bird and advance
    root.querySelector(".quiz-card")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    root.querySelector("[data-action='next-bird']")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();

    // Reveal second bird and advance (round should restart)
    root.querySelector(".quiz-card")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    root.querySelector("[data-action='next-bird']")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();

    // Should be back to an unrevealed bird card (round restarted)
    expect(root.querySelector(".quiz-card")).not.toBeNull();
    expect(root.textContent).toContain("tap to show name");
    expect(root.querySelector("[data-action='next-bird']")).toBeNull();
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
    commonsTitle: "Blackbird portrait",
    credit: "Own work",
    filePageUrl: "https://commons.wikimedia.org/wiki/File:Blackbird.jpg",
    licenseShortName: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
  };
}

function noShuffle<T>(arr: T[]): T[] {
  return [...arr];
}

const twoBirdCatalog = {
  birds: [
    {
      scientificName: "Turdus merula",
      commonName: "Common blackbird",
      images: [{ path: "/birds/turdus-merula/blackbird.webp", provenancePath: "/birds/turdus-merula/blackbird.json" }],
    },
    {
      scientificName: "Parus major",
      commonName: "Great tit",
      images: [{ path: "/birds/parus-major/greattit.webp", provenancePath: "/birds/parus-major/greattit.json" }],
    },
  ],
};
