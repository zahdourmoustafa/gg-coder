import { describe, expect, it } from "vitest";

import { MAX_DRAFT_CHARS, parseDraft } from "./companion-draft.js";

describe("parseDraft", () => {
  it("accepts any string, including empty (the phone cleared its box)", () => {
    expect(parseDraft(JSON.stringify({ text: "hel" }))).toEqual({ ok: true, text: "hel" });
    expect(parseDraft(JSON.stringify({ text: "" }))).toEqual({ ok: true, text: "" });
  });

  it("refuses bad bodies and oversized drafts", () => {
    expect(parseDraft("{").ok).toBe(false);
    expect(parseDraft(JSON.stringify({ text: 3 })).ok).toBe(false);
    expect(parseDraft("null").ok).toBe(false);
    expect(parseDraft(JSON.stringify({ text: "x".repeat(MAX_DRAFT_CHARS + 1) })).ok).toBe(false);
  });
});
