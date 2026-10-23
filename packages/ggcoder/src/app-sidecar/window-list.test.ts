import path from "node:path";
import { describe, expect, it } from "vitest";

import { chooseOpenTarget, listWindows, type WindowSource } from "./window-list.js";

function source(id: string, cwd: string, over: Partial<WindowSource> = {}): WindowSource {
  return {
    id,
    mode: "code",
    chatAgent: "general",
    cwd,
    clients: { size: 1 },
    session: { getState: () => ({ sessionPath: `/s/${id}.jsonl` }) },
    isBusy: () => false,
    ...over,
  };
}

describe("listWindows", () => {
  it("reports each session in a stable order", () => {
    const windows = listWindows([source("b", "/work/zeta"), source("a", "/work/alpha")]);
    expect(windows.map((w) => w.sessionId)).toEqual(["a", "b"]);
    expect(windows[0]).toEqual({
      sessionId: "a",
      mode: "code",
      chatAgent: "general",
      cwd: path.resolve("/work/alpha"),
      sessionPath: "/s/a.jsonl",
      busy: false,
      viewers: 1,
    });
  });

  it("prefers the live conversation file and reports busy and viewers", () => {
    const [win] = listWindows([
      source("x", "/w", {
        sessionPath: "/old.jsonl",
        session: { getState: () => ({ sessionPath: null }) },
        isBusy: () => true,
        clients: { size: 3 },
      }),
    ]);
    expect(win?.sessionPath).toBe("/old.jsonl");
    expect(win?.busy).toBe(true);
    expect(win?.viewers).toBe(3);
  });

  it("is empty with no sessions", () => {
    expect(listWindows([])).toEqual([]);
  });
});

describe("chooseOpenTarget", () => {
  it("prefers an idle, watched window already on the project", () => {
    const picked = chooseOpenTarget(
      [
        source("busy-same", "/p", { isBusy: () => true }),
        source("other", "/q", { clients: { size: 3 } }),
        source("same", "/p"),
        source("unwatched", "/p", { clients: { size: 0 } }),
      ],
      { cwd: "/p" },
    );
    expect(picked?.id).toBe("same");
  });

  it("falls back to the most-watched idle window, or none", () => {
    expect(
      chooseOpenTarget([source("a", "/x", { clients: { size: 1 } }), source("b", "/y", { clients: { size: 2 } })], {
        cwd: "/p",
      })?.id,
    ).toBe("b");
    expect(chooseOpenTarget([source("a", "/p", { isBusy: () => true })], { cwd: "/p" })).toBeUndefined();
  });
});
