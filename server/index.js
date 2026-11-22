import express from "express";
import cors from "cors";
import "dotenv/config";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(cors({ origin: process.env.APP_ORIGIN?.split(",") ?? true }));
app.use(express.json({ limit: "10mb" }));
const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (process.env.NODE_ENV === "production") app.use(express.static(path.resolve(__dirname, "../dist")));

const jobs = new Map();
const PORT = Number(process.env.PORT || 3000);

function configured(name) {
  if (name === "veo") return Boolean(process.env.GOOGLE_CLOUD_PROJECT && process.env.GOOGLE_CLOUD_LOCATION && process.env.GOOGLE_OUTPUT_GCS_URI);
  if (name === "wan") return Boolean(process.env.WAN_API_KEY && process.env.WAN_API_URL);
  if (name === "ltx") return Boolean(process.env.LTX_API_KEY);
  return false;
}

app.get("/api/health", (_req, res) => res.json({ ok: true, app: "Evolution AI" }));

app.get("/api/providers", (_req, res) => {
  res.json({
    providers: [
      { id: "veo", name: "Google Veo", configured: configured("veo"), mode: "Vertex AI" },
      { id: "wan", name: "Wan", configured: configured("wan"), mode: "Alibaba Cloud Model Studio" },
      { id: "ltx", name: "LTX Video", configured: configured("ltx"), mode: "LTX API" }
    ],
    parallel: true
  });
});

async function submitLtx({ prompt, duration, format }) {
  const resolution = format === "9:16" ? "1080x1920" : format === "1:1" ? "1080x1080" : "1920x1080";
  const response = await fetch("https://api.ltx.io/v2/text-to-video", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.LTX_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      model: process.env.LTX_MODEL || "ltx-2-5-fast",
      duration: Math.min(Number(duration), 20),
      resolution
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || data?.message || `LTX respondió ${response.status}`);
  return { providerJobId: data.id, status: "submitted", details: data };
}

async function submitWan({ prompt, duration, format }) {
  const response = await fetch(process.env.WAN_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WAN_API_KEY}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable"
    },
    body: JSON.stringify({
      model: process.env.WAN_MODEL || "wan2.2-t2v-plus",
      input: { prompt },
      parameters: { duration: Math.min(Number(duration), 10), size: format === "9:16" ? "720*1280" : "1280*720" }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.code || `Wan respondió ${response.status}`);
  return { providerJobId: data.output?.task_id || data.task_id, status: "submitted", details: data };
}

async function submitVeo({ prompt, format }) {
  const client = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION || "global"
  });
  const operation = await client.models.generateVideos({
    model: process.env.VEO_MODEL || "veo-3.1-fast-generate-001",
    prompt,
    config: {
      aspectRatio: format === "9:16" ? "9:16" : "16:9",
      outputGcsUri: process.env.GOOGLE_OUTPUT_GCS_URI
    }
  });
  return { providerJobId: operation.name, status: "submitted", details: { operation: operation.name } };
}

const submitters = { veo: submitVeo, wan: submitWan, ltx: submitLtx };

app.post("/api/generate", async (req, res) => {
  const { prompt, duration = 10, format = "16:9" } = req.body || {};
  if (typeof prompt !== "string" || prompt.trim().length < 3) {
    return res.status(400).json({ error: "Escribe una descripción válida." });
  }
  const enabled = Object.keys(submitters).filter(configured);
  if (!enabled.length) {
    return res.status(503).json({
      error: "Los motores todavía no tienen credenciales configuradas en el servidor.",
      providers: Object.keys(submitters).map(id => ({ id, configured: false }))
    });
  }

  const id = randomUUID();
  const results = await Promise.allSettled(enabled.map(async provider => {
    const result = await submitters[provider]({ prompt: prompt.trim(), duration, format });
    return { provider, ...result };
  }));
  const outputs = results.map((result, index) => result.status === "fulfilled"
    ? result.value
    : { provider: enabled[index], status: "error", error: result.reason?.message || "Error desconocido" });
  jobs.set(id, { id, prompt: prompt.trim(), duration, format, createdAt: new Date().toISOString(), outputs });
  res.status(202).json({ jobId: id, status: "submitted", outputs });
});

app.get("/api/jobs/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "Trabajo no encontrado o servidor reiniciado." });
  res.json(job);
});

app.listen(PORT, () => console.log(`Evolution AI API listening on :${PORT}`));
