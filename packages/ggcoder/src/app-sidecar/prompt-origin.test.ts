import { describe, expect, it } from "vitest";

import { promptOrigin } from "./prompt-routes.js";

describe("promptOrigin", () => {
  it("keeps a companion's short lowercase label", () => {
    expect(promptOrigin("tappy")).toBe("tappy");
    expect(promptOrigin("my-tool2")).toBe("my-tool2");
  });

  it("treats anything else as the window", () => {
    expect(promptOrigin(undefined)).toBe("window");
    expect(promptOrigin("")).toBe("window");
    expect(promptOrigin("Tappy")).toBe("window");
    expect(promptOrigin("x".repeat(40))).toBe("window");
    expect(promptOrigin(7)).toBe("window");
  });
});
