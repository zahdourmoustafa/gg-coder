import { describe, expect, it } from "vitest";

import { skillRows } from "./skill-list.js";

describe("skillRows", () => {
  it("lists name, description and source, sorted, without the skill body", () => {
    const rows = skillRows([
      { name: "tdd", description: "Test first", content: "SECRET BODY", source: "global" },
      { name: "bulletproof", description: "Harden", content: "x", source: "bundled", root: "/r" },
    ]);
    expect(rows).toEqual([
      { name: "bulletproof", description: "Harden", source: "bundled" },
      { name: "tdd", description: "Test first", source: "global" },
    ]);
    expect(JSON.stringify(rows)).not.toContain("SECRET BODY");
  });
});
