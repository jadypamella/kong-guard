export function redactText(txt, redactions) {
  if (!redactions) return txt;
  let out = txt;
  for (const key of Object.keys(redactions)) {
    const esc = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    out = out.replace(new RegExp(esc, "g"), redactions[key]);
  }
  return out;
}