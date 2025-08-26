import express from "express";
import cors from "cors";
import { scanText } from "./scanner.js";
import { redactText } from "./redactor.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const LOGS = [];

app.post("/scan", (req, res) => {
  const { text = "", team = "" } = req.body || {};
  const result = scanText(text);
  LOGS.unshift({
    ts: new Date().toISOString(),
    ok: result.ok,
    reasons: result.reasons,
    length: text.length,
    team
  });
  if (LOGS.length > 100) LOGS.pop();
  res.json(result);
});

app.get("/logs", (_req, res) => {
  res.json(LOGS);
});

app.post("/logs", (req, res) => {
  const { ts = new Date().toISOString(), ok = true, reasons = [], team = "" } = req.body || {};
  LOGS.unshift({ ts, ok, reasons, length: 0, team });
  if (LOGS.length > 100) LOGS.pop();
  res.json({ ok: true });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("api ready on", port));