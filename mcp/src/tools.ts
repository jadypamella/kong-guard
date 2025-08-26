import fetch from "node-fetch";

export async function scan_prompt(text: string, baseUrl: string) {
  const r = await fetch(`${baseUrl}/scan`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!r.ok) throw new Error(`scan failed ${r.status}`);
  return await r.json();
}