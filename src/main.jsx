import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Film, Sparkles, Clapperboard, ImagePlus, Clock3, WandSparkles, Menu, Cpu, LoaderCircle } from "lucide-react";
import "./style.css";



function App() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("60");
  const [format, setFormat] = useState("16:9");
  const [notice, setNotice] = useState("");
  const [providers, setProviders] = useState([]);
  const [gatewayReady, setGatewayReady] = useState(false);
  const [outputs, setOutputs] = useState([]);
  const [jobId, setJobId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/providers")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setProviders(data.providers || []); setGatewayReady(Boolean(data.keyConfigured)); })
      .catch(() => setNotice("El servidor de generación todavía no está iniciado."));
  }, []);

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;
        setOutputs(data.outputs || []);
        if ((data.outputs || []).length && data.outputs.every(item => ["completed", "error", "failed"].includes((item.status || "").toLowerCase()))) {
          setNotice("Los motores terminaron. Revisa los resultados disponibles.");
          clearInterval(timer);
        }
      } catch (_) {}
    };
    const timer = setInterval(poll, 8000);
    poll();
    return () => { active = false; clearInterval(timer); };
  }, [jobId]);

  async function handleGenerate(event) {
    event.preventDefault();
    if (!prompt.trim()) {
      setNotice("Escribe una descripción para comenzar.");
      return;
    }
    setLoading(true);
    setOutputs([]);
    setJobId("");
    setNotice("Enviando tu idea a los motores que estén configurados...");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, duration: Number(duration), format })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo iniciar la generación.");
      setOutputs(data.outputs || []);
      setJobId(data.jobId || "");
      setNotice("Solicitud enviada. Los modelos están trabajando en paralelo; sus resultados se consultan automáticamente.");
    } catch (error) {
      setNotice(error.message || "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
      fetch("/api/providers").then(r => r.json()).then(data => setProviders(data.providers || [])).catch(() => {});
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark"><Film size={22}/></span><span>EVOLUTION <b>AI</b></span></a>
        <nav><a href="#crear">Crear video</a><a href="#motores">Motores IA</a></nav>
        <button className="menu-button" aria-label="Menú"><Menu size={21}/></button>
      </header>

      <section className="hero">
        <div className="eyebrow"><Sparkles size={15}/> CREATIVIDAD SIN LÍMITES</div>
        <h1>De tu imaginación<br/><span>a la pantalla.</span></h1>
        <p className="hero-copy">Describe tu idea y Evolution AI coordinará los motores de video disponibles para crear tu proyecto.</p>
        <a className="primary-link" href="#crear">Comenzar a crear <span>↗</span></a>
        <div className="hero-orb orb-one"/><div className="hero-orb orb-two"/>
      </section>

      <section className="workspace" id="crear">
        <div className="section-heading">
          <div><div className="eyebrow"><Clapperboard size={15}/> ESTUDIO DE VIDEO</div><h2>Crear un video</h2></div>
          <span className="duration-note"><Clock3 size={15}/> Proyecto de hasta 1 minuto · clips por motor</span>
        </div>
        <form className="creator-card" onSubmit={handleGenerate}>
          <label htmlFor="prompt">Describe el video que imaginas</label>
          <textarea id="prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ejemplo: Un automóvil deportivo recorriendo una carretera entre montañas al atardecer, estilo cinematográfico..." rows="5"/>
          <div className="form-row">
            <div className="field"><label htmlFor="duration">Duración del proyecto</label><select id="duration" value={duration} onChange={e => setDuration(e.target.value)}><option value="10">10 segundos</option><option value="15">15 segundos</option><option value="30">30 segundos</option><option value="60">60 segundos</option></select></div>
            <div className="field"><label htmlFor="format">Formato</label><select id="format" value={format} onChange={e => setFormat(e.target.value)}><option>16:9</option><option>9:16</option><option>1:1</option></select></div>
          </div>
          <button className="generate-button" type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18}/> : <WandSparkles size={18}/>} {loading ? "Enviando a los motores..." : "Crear mi video"}</button>
          {notice && <p className="notice" role="status">{notice}</p>}
          {!gatewayReady && <p className="notice">El motor central fal.ai aún no tiene su clave privada configurada. No se enviarán solicitudes ni se producirán cargos.</p>}
          {outputs.length > 0 && <div className="job-results"><h3>Estado de los motores</h3>{outputs.map(item => <div className="job-row" key={item.modelId}><span>{item.modelName || item.modelId}</span><span className={["error", "failed"].includes((item.status || "").toLowerCase()) ? "status-error" : "status-wait"}>{["error", "failed"].includes((item.status || "").toLowerCase()) ? (item.error || "El motor no pudo generar el video") : item.status === "COMPLETED" ? (item.videoUrl ? <a href={item.videoUrl} target="_blank" rel="noreferrer">Video listo · Abrir</a> : "Completado") : item.status === "IN_QUEUE" ? "En cola" : "Procesando"}</span></div>)}</div>}
        </form>
      </section>

      <section className="providers" id="motores">
        <div className="section-heading"><div><div className="eyebrow"><Cpu size={15}/> SISTEMA MULTIMOTOR</div><h2>Motores de generación</h2></div></div>
        <div className="provider-grid">
          {providers.map(model => <div className="provider-card" key={model.id}><span className="provider-icon"><Sparkles size={18}/></span><div><h3>{model.name}</h3><p>{model.family} · clips de hasta {model.maxSeconds} segundos</p></div><span className={model.enabled ? "provider-ready" : "provider-pending"}>{model.enabled ? "En el grupo activo" : "Disponible"}</span></div>)}
        </div>
      </section>

      <section className="features">
        <div className="feature"><span><Sparkles/></span><h3>Trabajo en paralelo</h3><p>Evolution AI envía tu idea a varios modelos mediante una sola conexión segura.</p></div>
        <div className="feature"><span><ImagePlus/></span><h3>Texto e imágenes</h3><p>Arquitectura preparada para ampliar a imágenes de referencia.</p></div>
        <div className="feature"><span><Film/></span><h3>Montaje final</h3><p>El proyecto contempla unir escenas, audio, subtítulos y formato final.</p></div>
      </section>
      <footer>EVOLUTION AI <span>·</span> Tu imaginación marca el comienzo.</footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App/>);