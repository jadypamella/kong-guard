export const rules = [
  { name: "Potential password", regex: /(password|passwd|pwd)\s*[:=]\s*["']?[^"'\n]{4,}/i },
  { name: "JWT like token", regex: /\beyJ[a-zA-Z0-9_-]+?\.[a-zA-Z0-9_-]+?\.[a-zA-Z0-9_-]+/ },
  { name: "AWS key id", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "AWS secret", regex: /\b[A-Za-z0-9\/+=]{40}\b/ },
  { name: "Private key block", regex: /BEGIN\s+PRIVATE\s+KEY[\s\S]+END\s+PRIVATE\s+KEY/ }
];

export function scanText(txt) {
  const reasons = [];
  const redactions = {};
  let flagged = false;

  for (const r of rules) {
    const m = txt.match(r.regex);
    if (m) {
      flagged = true;
      reasons.push(r.name);
      redactions[m[0]] = "***redacted***";
    }
  }
  return { ok: !flagged, reasons, redactions };
}