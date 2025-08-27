import http, { IncomingMessage, ServerResponse } from "node:http";
import { scan_prompt } from "./tools.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 7070;
const BASE = process.env.SCANNER_BASE_URL || "http://api:8080";

const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method === "POST" && req.url === "/tools/scan_prompt") {
    let body = "";
    req.on("data", (chunk: Buffer) => body += chunk.toString());
    req.on("end", async () => {
      try {
        const { text } = JSON.parse(body || "{}");
        const result = await scan_prompt(text || "", BASE as string);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: String(e) }));
      }
    });
    return;
  }
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: true, name: "kongguard-mcp" }));
});

server.listen(PORT, () => {
  console.log(`mcp ready on ${PORT}`);
});
