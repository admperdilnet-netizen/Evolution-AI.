import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import "dotenv/config";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fal } from "@fal-ai/client";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(cors({ origin: process.env.APP_ORIGIN?.split(",") ?? true }));
app.use(express.json({ limit: "10mb" }));
if (process.env.NODE_ENV === "production") app.use(express.static(path.resolve(__dirname, "../dist")));

const PORT = Number(process.env.PORT || 3000);
const jobs = new Map();
const MAX_MODELS = Math.max(1, Math.min(6, Number(process.env.FAL_MAX_MODELS || 1)));
const generationLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.GENERATION_LIMIT_PER_HOUR || 2),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Límite de generaciones alcanzado por esta hora. Intenta más tarde." }
});

const MODEL_CATALOG = [
  { id: "fal-ai/veo3.1/fast", name: "Google Veo 3.1 Fast", family: "Cinematográfico", maxSeconds: 8, tier: 1 },
  { id: "fal-ai/kling-video/v3/standard/text-to-video", name: "Kling 3.0 Standard", family: "Movimiento y escenas", maxSeconds: 15, tier: 2 },
  { id: "fal-ai/wan/v2.7/text-to-video", name: "Wan 2.7", family: "Versatilidad", maxSeconds: 15, tier: 3 },
  { id: "bytedance/seedance-2.0/fast/text-to-video", name: "Seedance 2.0 Fast", family: "Narrativa y audio", maxSeconds: 15, tier: 4 },
  { id: "fal-ai/ltx-2.3-22b/text-to-video", name: "LTX 2.3", family: "Generación flexible", maxSeconds: 10, tier: 5 },
  { id: "minimax/h3-max-turbo/text-to-video", name: "MiniMax H3 Max Turbo", family: "Mejor equilibrio de coste y calidad", maxSeconds: 15, tier: 6 }
];

if (process.env.FAL_KEY) fal.config({ credentials: process.env.FAL_KEY });

function selectedModels() {
  const requested = (process.env.FAL_MODELS || MODEL_CATALOG.slice(0, MAX_MODELS).map(m => m.id).join(","))
    .split(",").map(s => s.trim()).filter(Boolean);
  return requested.slice(0, MAX_MODELS).map(id => MODEL_CATALOG.find(m => m.id === id)).filter(Boolean);
}

function buildInput(model, prompt, format, requestedDuration) {
  const duration = Math.max(5, Math.min(Number(requestedDuration) || 8, model.maxSeconds));
  if (model.id.includes("veo3.1")) {
    return { prompt, aspect_ratio: format === "1:1" ? "16:9" : format, resolution: "720p", generate_audio: false };
  }
  if (model.id.includes("kling-video")) {
    return { prompt, duration: String(Math.min(15, Math.max(3, duration))), aspect_ratio: format, generate_audio: false };
  }
  if (model.id.includes("wan/v2.7")) {
    return { prompt, duration: Math.min(15, Math.max(5, duration)), aspect_ratio: format, resolution: "720p" };
  }
  if (model.id.includes("seedance")) {
    return { prompt, duration: Math.min(15, Math.max(4, duration)), aspect_ratio: format, resolution: "720p", generate_audio: false };
  }
  if (model.id.includes("h3-max-turbo")) {
    return { prompt, duration: Math.min(15, Math.max(2, duration)), resolution: "768P", aspect_ratio: format, prompt_expansion_mode: "balanced" };
  }
  return { prompt };
}

function extractVideoUrl(data) {
  return data?.video?.url || data?.videos?.[0]?.url || data?.output?.video?.url || data?.video_url || null;
}

app.get("/api/health", (_req, res) => res.json({ ok: true, app: "Evolution AI", gateway: "fal.ai", keyConfigured: Boolean(process.env.FAL_KEY) }));

app.get("/api/providers", (_req, res) => {
  res.json({
    gateway: "fal.ai",
    keyConfigured: Boolean(process.env.FAL_KEY),
    parallelLimit: MAX_MODELS,
    providers: MODEL_CATALOG.map(model => ({ ...model, enabled: selectedModels().some(m => m.id === model.id) }))
  });
});

app.post("/api/generate", generationLimit, async (req, res) => {
  const { prompt, duration = 8, format = "16:9" } = req.body || {};
  if (typeof prompt !== "string" || prompt.trim().length < 3 || prompt.length > 5000) {
    return res.status(400).json({ error: "Escribe una descripción válida de máximo 5,000 caracteres." });
  }
  if (![10, 15, 30, 60].includes(Number(duration)) || !["16:9", "9:16", "1:1"].includes(format)) {
    return res.status(400).json({ error: "Duración o formato no válido." });
  }
  if (!process.env.FAL_KEY) {
    return res.status(503).json({ error: "Falta configurar FAL_KEY en las variables privadas del servidor. Ningún motor ha generado ni cobrado nada." });
  }

  const models = selectedModels();
  if (!models.length) return res.status(503).json({ error: "No hay modelos habilitados en FAL_MODELS." });

  const id = randomUUID();
  const submissions = await Promise.allSettled(models.map(async model => {
    const queued = await fal.queue.submit(model.id, {
      input: buildInput(model, prompt.trim(), format, duration)
    });
    return {
      modelId: model.id,
      modelName: model.name,
      requestId: queued.request_id,
      status: queued.status || "IN_QUEUE",
      maxSeconds: model.maxSeconds
    };
  }));

  const outputs = submissions.map((result, index) => result.status === "fulfilled"
    ? result.value
    : { modelId: models[index].id, modelName: models[index].name, status: "ERROR", error: result.reason?.message || "No se pudo enviar al motor." });

  jobs.set(id, { id, prompt: prompt.trim(), duration, format, createdAt: new Date().toISOString(), outputs });
  res.status(202).json({ jobId: id, status: "submitted", outputs });
});

app.get("/api/jobs/:id", async (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "Trabajo no encontrado o el servidor se reinició." });

  const refreshed = await Promise.all(job.outputs.map(async item => {
    if (!item.requestId || ["ERROR", "COMPLETED", "FAILED"].includes(String(item.status).toUpperCase())) return item;
    try {
      const status = await fal.queue.status(item.modelId, { requestId: item.requestId });
      const normalized = String(status.status || "IN_PROGRESS").toUpperCase();
      if (normalized !== "COMPLETED") return { ...item, status: normalized };
      const result = await fal.queue.result(item.modelId, { requestId: item.requestId });
      const videoUrl = extractVideoUrl(result.data);
      return { ...item, status: videoUrl ? "COMPLETED" : "ERROR", videoUrl, error: videoUrl ? undefined : "El motor terminó sin devolver una dirección de video." };
    } catch (error) {
      return { ...item, status: "ERROR", error: error.message || "No se pudo consultar el motor." };
    }
  }));

  job.outputs = refreshed;
  res.json(job);
});

app.listen(PORT, () => console.log(`Evolution AI API listening on :${PORT}`));
