import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Film, Sparkles, Clapperboard, ImagePlus, Clock3, WandSparkles, Menu } from "lucide-react";
import "./style.css";

function App() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("60");
  const [format, setFormat] = useState("16:9");
  const [notice, setNotice] = useState("");

  function handleGenerate(event) {
    event.preventDefault();
    if (!prompt.trim()) {
      setNotice("Escribe una descripción para comenzar.");
      return;
    }
    setNotice("La interfaz está lista. Para generar videos reales falta conectar los motores de IA y sus credenciales seguras en el servidor.");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark"><Film size={22}/></span><span>EVOLUTION <b>AI</b></span></a>
        <nav><a href="#crear">Crear video</a><a href="#como-funciona">Cómo funciona</a></nav>
        <button className="menu-button" aria-label="Menú"><Menu size={21}/></button>
      </header>

      <section className="hero">
        <div className="eyebrow"><Sparkles size={15}/> CREATIVIDAD SIN LÍMITES</div>
        <h1>De tu imaginación<br/><span>a la pantalla.</span></h1>
        <p className="hero-copy">Describe tu idea y prepara el camino para convertirla en un video extraordinario con inteligencia artificial.</p>
        <a className="primary-link" href="#crear">Comenzar a crear <span>↗</span></a>
        <div className="hero-orb orb-one"/><div className="hero-orb orb-two"/>
      </section>

      <section className="workspace" id="crear">
        <div className="section-heading">
          <div><div className="eyebrow"><Clapperboard size={15}/> ESTUDIO DE VIDEO</div><h2>Crear un video</h2></div>
          <span className="duration-note"><Clock3 size={15}/> Hasta 1 minuto</span>
        </div>
        <form className="creator-card" onSubmit={handleGenerate}>
          <label htmlFor="prompt">Describe el video que imaginas</label>
          <textarea id="prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ejemplo: Un automóvil deportivo recorriendo una carretera entre montañas al atardecer, estilo cinematográfico..." rows="5"/>
          <div className="form-row">
            <div className="field"><label htmlFor="duration">Duración</label><select id="duration" value={duration} onChange={e => setDuration(e.target.value)}><option value="10">10 segundos</option><option value="15">15 segundos</option><option value="30">30 segundos</option><option value="60">60 segundos</option></select></div>
            <div className="field"><label htmlFor="format">Formato</label><select id="format" value={format} onChange={e => setFormat(e.target.value)}><option>16:9</option><option>9:16</option><option>1:1</option></select></div>
          </div>
          <button className="generate-button" type="submit"><WandSparkles size={18}/> Preparar mi video</button>
          {notice && <p className="notice" role="status">{notice}</p>}
        </form>
      </section>

      <section className="features" id="como-funciona">
        <div className="feature"><span><Sparkles/></span><h3>Varios motores</h3><p>Arquitectura preparada para conectar distintos proveedores de generación.</p></div>
        <div className="feature"><span><ImagePlus/></span><h3>Texto e imágenes</h3><p>El objetivo es crear desde una descripción o una imagen de referencia.</p></div>
        <div className="feature"><span><Film/></span><h3>Videos de hasta 1 min</h3><p>Diseñado para formatos verticales, cuadrados y panorámicos.</p></div>
      </section>
      <footer>EVOLUTION AI <span>·</span> Tu imaginación marca el comienzo.</footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App/>);