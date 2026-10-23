/**
 * `GET /windows`: the sessions this daemon is running, for companion tools.
 *
 * Every open GG Coder window owns one daemon session, but the session ids only
 * ever lived in the webview, so a companion (tappy) had no way to join the
 * conversation that is actually on screen. With this list it can subscribe to
 * that session's `/events` and post to its `/prompt` like a second window.
 */

import path from "node:path";

/** The parts of a running session this list reads; kept narrow for tests. */
export interface WindowSource {
  id: string;
  mode: string;
  chatAgent: string;
  cwd: string;
  sessionPath?: string;
  clients: { size: number };
  session: { getState(): { sessionPath?: string | null } };
  isBusy(): boolean;
}

export interface WindowInfo {
  sessionId: string;
  mode: string;
  chatAgent: string;
  cwd: string;
  /** The conversation file; null until the session has written one. */
  sessionPath: string | null;
  busy: boolean;
  /** Live `/events` subscribers — the window itself, plus any companions. */
  viewers: number;
}

export function listWindows(sources: Iterable<WindowSource>): WindowInfo[] {
  return [...sources]
    .map((source) => ({
      sessionId: source.id,
      mode: source.mode,
      chatAgent: source.chatAgent,
      cwd: path.resolve(source.cwd),
      sessionPath: source.session.getState().sessionPath ?? source.sessionPath ?? null,
      busy: source.isBusy(),
      viewers: source.clients.size,
    }))
    .sort((a, b) => a.cwd.localeCompare(b.cwd) || a.sessionId.localeCompare(b.sessionId));
}

/** What a companion asks a window to show. */
export interface OpenRequest {
  cwd: string;
  /** A stored conversation to resume; absent for a fresh one. */
  sessionPath?: string;
}

export interface OpenTarget extends WindowSource {
  broadcast(type: string, data: unknown): void;
}

/**
 * The window that should open a conversation for a companion (tappy's phone).
 *
 * Only a window with a viewer can switch — a session no window is watching has
 * no webview to receive the request — and never one mid-run, which switching
 * would abandon. Among those: the window already on that project, else the
 * most-watched one. Undefined when no window can take it; the companion then
 * runs the conversation without a window, as before.
 */
export function chooseOpenTarget<T extends WindowSource>(
  sources: Iterable<T>,
  request: OpenRequest,
): T | undefined {
  const candidates = [...sources].filter((s) => s.clients.size > 0 && !s.isBusy());
  const target = path.resolve(request.cwd);
  const sameProject = (s: T) => path.resolve(s.cwd) === target;
  return candidates.sort(
    (a, b) =>
      Number(sameProject(b)) - Number(sameProject(a)) ||
      b.clients.size - a.clients.size ||
      a.id.localeCompare(b.id),
  )[0];
}
