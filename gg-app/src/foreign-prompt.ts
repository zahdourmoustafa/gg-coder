/**
 * A `prompt_sent` event the window did not send itself — from a companion such
 * as tappy on the user's phone. The window's own prompts carry no origin and
 * the sidecar labels them "window"; their bubble was already pushed on send.
 */
export function isForeignPrompt(data: Record<string, unknown>): boolean {
  return (
    typeof data.text === "string" &&
    data.text.trim().length > 0 &&
    typeof data.origin === "string" &&
    data.origin !== "window"
  );
}
