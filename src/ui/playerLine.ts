/** Strip account names and chain essays from a line shown on the raid HUD. */
export function playerLine(text: string): string {
  const cleaned = text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+on\s+[\w.-]*testnet\b/gi, "")
    .replace(/\b[\w.-]+\.testnet\b/g, "")
    .replace(/\btestnet\b/gi, "")
    .replace(/\bthe game contract\b/gi, "the hall")
    .replace(/\bthe contract\b/gi, "the hall")
    .replace(/\bcontract\b/gi, "")
    .replace(/\bkeeper\b/gi, "")
    .replace(/\bmint(?:ed|ing)?\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .trim();
  return cleaned || "That call failed.";
}
