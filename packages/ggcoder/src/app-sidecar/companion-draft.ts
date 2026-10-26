/**
 * Live typing from a companion (tappy on the user's phone).
 *
 * While the user types on the phone, tappy posts the whole text so far to
 * `POST /draft`; the window shows it in its message box as it grows. Nothing
 * is sent to the agent — the real message still arrives through `/prompt`.
 */

/** Longer than any message worth typing on a phone; keeps a stray post small. */
export const MAX_DRAFT_CHARS = 20_000;

/** The draft text from a request body, or an error to answer with. */
export function parseDraft(raw: string): { ok: true; text: string } | { ok: false; error: string } {
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false, error: "invalid JSON body" };
  }
  const text = (body as { text?: unknown } | null)?.text;
  if (typeof text !== "string") return { ok: false, error: "text must be a string" };
  if (text.length > MAX_DRAFT_CHARS) return { ok: false, error: "draft too long" };
  return { ok: true, text };
}
