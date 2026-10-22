import { describe, expect, it } from "vitest";

import { isForeignPrompt } from "./foreign-prompt";

describe("isForeignPrompt", () => {
  it("shows prompts a companion sent", () => {
    expect(isForeignPrompt({ text: "fix the build", origin: "tappy" })).toBe(true);
  });

  it("skips the window's own prompts and anything malformed", () => {
    expect(isForeignPrompt({ text: "hi", origin: "window" })).toBe(false);
    expect(isForeignPrompt({ text: "hi" })).toBe(false);
    expect(isForeignPrompt({ text: "   ", origin: "tappy" })).toBe(false);
    expect(isForeignPrompt({ text: 4, origin: "tappy" })).toBe(false);
  });
});
