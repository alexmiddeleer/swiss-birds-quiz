// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import { renderHomePage } from "./homepage";

describe("homepage", () => {
  it("shows the app title and Start quiz button after Offline Warmup", async () => {
    const root = document.createElement("main");

    renderHomePage(root, testCatalog, loadTestProvenance, noShuffle, readyWarmAssets);
    await settle();

    expect(root.querySelector("h1")?.textContent).toBe("Swiss Birds Quiz");
    expect(root.querySelector("button")?.textContent).toBe("Start quiz");
  });

  it("runs Offline Warmup on home screen before enabling Start quiz", async () => {
    const root = document.createElement("main");
    const warmup = deferred<void>();
    const warmAssets = vi.fn(() => warmup.promise);

    renderHomePage(root, testCatalog, loadTestProvenance, noShuffle, warmAssets);

    expect(warmAssets).toHaveBeenCalledOnce();
    expect(root.querySelector("button")?.textContent).toBe("loading...");
    expect(root.querySelector("button")?.hasAttribute("disabled")).toBe(true);

    warmup.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(root.querySelector("button")?.textContent).toBe("Start quiz");
    expect(root.querySelector("button")?.hasAttribute("disabled")).toBe(false);
  });

  it("shows Loading failed. Retry when Offline Warmup fails", async () => {
    const root = document.createElement("main");
    const warmAssets = vi.fn().mockRejectedValue(new Error("offline"));

    renderHomePage(root, testCatalog, loadTestProvenance, noShuffle, warmAssets);
    await Promise.resolve();
    await Promise.resolve();

    expect(root.querySelector("button")?.textContent).toBe("Loading failed. Retry");
    expect(root.querySelector("button")?.hasAttribute("disabled")).toBe(false);
  });

  it("retries Offline Warmup after failure", async () => {
    const root = document.createElement("main");
    const retryWarmup = deferred<void>();
    const warmAssets = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementationOnce(() => retryWarmup.promise);

    renderHomePage(root, testCatalog, loadTestProvenance, noShuffle, warmAssets);
    await Promise.resolve();
    await Promise.resolve();

    root.querySelector("button")?.click();

    expect(root.querySelector("button")?.textContent).toBe("loading...");
    expect(root.querySelector("button")?.hasAttribute("disabled")).toBe(true);

    retryWarmup.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(warmAssets).toHaveBeenCalledTimes(2);
    expect(root.querySelector("button")?.textContent).toBe("Start quiz");
    expect(root.querySelector("button")?.hasAttribute("disabled")).toBe(false);
  });

  it("starts a quiz with a bird photo, prompt, and citation", async () => {
    const root = document.createElement("main");

    renderHomePage(root, testCatalog, loadTestProvenance, noShuffle, readyWarmAssets);
    await settle();
    root.querySelector("button")?.click();
    await settle();

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

    renderHomePage(root, testCatalog, loadTestProvenance, noShuffle, readyWarmAssets);
    await settle();
    root.querySelector("button")?.click();
    await settle();
    root.querySelector(".quiz-card")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(root.textContent).toContain("Common blackbird");
    expect(root.textContent).toContain("Turdus merula");
  });

  it("shows a tab bird to proceed prompt after the name is revealed", async () => {
    const root = document.createElement("main");

    renderHomePage(root, testCatalog, loadTestProvenance, noShuffle, readyWarmAssets);
    await settle();
    root.querySelector("button")?.click();
    await settle();

    expect(root.querySelector("[data-action='next-bird']")).toBeNull();

    root.querySelector(".quiz-card")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(root.textContent).toContain("tab bird to proceed");
    expect(root.querySelector("[data-action='next-bird']")).toBeNull();
  });
});

describe("quiz round progression", () => {
  it("advances to the next bird unrevealed after tapping the revealed bird", async () => {
    const root = document.createElement("main");

    renderHomePage(root, twoBirdCatalog, loadTestProvenance, noShuffle, readyWarmAssets);
    await settle();
    root.querySelector("button")?.click();
    await settle();

    // Reveal first bird
    root.querySelector(".quiz-card")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Tap revealed bird to proceed
    root.querySelector(".quiz-card")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
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

    renderHomePage(root, testCatalog, loadTestProvenance, noShuffle, readyWarmAssets);
    await settle();
    root.querySelector("button")?.click();
    await settle();

    expect(root.querySelector("[data-action='end-quiz']")).not.toBeNull();
    expect(root.querySelector("[data-action='refresh-app']")).not.toBeNull();
  });

  it("shows End Quiz and Refresh App buttons after the name is revealed", async () => {
    const root = document.createElement("main");

    renderHomePage(root, testCatalog, loadTestProvenance, noShuffle, readyWarmAssets);
    await settle();
    root.querySelector("button")?.click();
    await settle();
    root.querySelector(".quiz-card")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(root.querySelector("[data-action='end-quiz']")).not.toBeNull();
    expect(root.querySelector("[data-action='refresh-app']")).not.toBeNull();
  });

  it("returns to the home screen when End Quiz is clicked", async () => {
    const root = document.createElement("main");

    renderHomePage(root, testCatalog, loadTestProvenance, noShuffle, readyWarmAssets);
    await settle();
    root.querySelector("button")?.click();
    await settle();
    root.querySelector("[data-action='end-quiz']")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(root.querySelector("h1")?.textContent).toBe("Swiss Birds Quiz");
    expect(root.querySelector("[data-action='end-quiz']")).toBeNull();
  });

  it("returns to the home screen when End Quiz is activated by touch", async () => {
    const root = document.createElement("main");

    renderHomePage(root, testCatalog, loadTestProvenance, noShuffle, readyWarmAssets);
    await settle();
    root.querySelector("button")?.click();
    await settle();
    root.querySelector("[data-action='end-quiz']")?.dispatchEvent(new Event("touchend", { bubbles: true }));

    expect(root.querySelector("h1")?.textContent).toBe("Swiss Birds Quiz");
    expect(root.querySelector("[data-action='end-quiz']")).toBeNull();
  });
});

describe("Refresh App", () => {
  it("calls location.reload when Refresh App is clicked", async () => {
    const reload = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, reload });

    const root = document.createElement("main");
    renderHomePage(root, testCatalog, loadTestProvenance, noShuffle, readyWarmAssets);
    await settle();
    root.querySelector("button")?.click();
    await settle();

    root.querySelector("[data-action='refresh-app']")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(reload).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });
});

describe("Quiz round restart", () => {
  it("shows birds again after all birds in a round have been seen", async () => {
    const root = document.createElement("main");

    renderHomePage(root, twoBirdCatalog, loadTestProvenance, noShuffle, readyWarmAssets);
    await settle();
    root.querySelector("button")?.click();
    await settle();

    // Reveal first bird and advance
    root.querySelector(".quiz-card")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    root.querySelector(".quiz-card")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();

    // Reveal second bird and advance (round should restart)
    root.querySelector(".quiz-card")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    root.querySelector(".quiz-card")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
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

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function noShuffle<T>(arr: T[]): T[] {
  return [...arr];
}

async function readyWarmAssets() {}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
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
