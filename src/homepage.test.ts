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
});
