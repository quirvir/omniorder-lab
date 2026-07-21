"use client";

import { useMemo, useState } from "react";

type Channel = "Web" | "WhatsApp" | "POS";
type Stage = "Borrador" | "Confirmada" | "En preparación" | "Facturada";

type Order = {
  id: string;
  channel: Channel;
  customer: string;
  items: string;
  total: number;
  stage: Stage;
  createdAt: string;
};

const initialOrders: Order[] = [
  { id: "ORD-1042", channel: "Web", customer: "María López", items: "Combo clásico × 2", total: 138, stage: "En preparación", createdAt: "Hace 3 min" },
  { id: "ORD-1041", channel: "WhatsApp", customer: "Carlos Ruiz", items: "Pollo crispy + bebida", total: 79, stage: "Confirmada", createdAt: "Hace 7 min" },
  { id: "ORD-1040", channel: "POS", customer: "Consumidor final", items: "Café americano × 2", total: 46, stage: "Facturada", createdAt: "Hace 12 min" },
];

const catalog = [
  { name: "Combo clásico", price: 69, description: "Hamburguesa, papas y bebida" },
  { name: "Pollo crispy", price: 59, description: "Pollo crujiente, papas y salsa" },
  { name: "Café americano", price: 23, description: "Tueste local, 12 oz" },
];

function stageClass(stage: Stage) {
  return stage.toLowerCase().replaceAll(" ", "-");
}

export default function Home() {
  const [channel, setChannel] = useState<Channel>("Web");
  const [selected, setSelected] = useState(0);
  const [customer, setCustomer] = useState("Ana Morales");
  const [orders, setOrders] = useState(initialOrders);
  const [notice, setNotice] = useState("Listo para recibir una orden omnicanal.");
  const [voiceText, setVoiceText] = useState("");
  const [listening, setListening] = useState(false);

  const active = catalog[selected];
  const stats = useMemo(() => ({
    total: orders.length,
    active: orders.filter((order) => order.stage !== "Facturada").length,
    whatsapp: orders.filter((order) => order.channel === "WhatsApp").length,
    revenue: orders.reduce((sum, order) => sum + order.total, 0),
  }), [orders]);

  function createOrder(source = channel, itemName = active.name, amount = active.price) {
    const order: Order = {
      id: `ORD-${1043 + orders.length}`,
      channel: source,
      customer: customer || "Consumidor final",
      items: itemName,
      total: amount,
      stage: "Confirmada",
      createdAt: "Ahora",
    };
    setOrders((current) => [order, ...current]);
    setNotice(`${order.id} creada. Evento sellado y enviado a adaptadores STS Gen 2 y Simphony (modo demo).`);
  }

  function processVoice() {
    const clean = voiceText.trim();
    if (!clean) {
      setNotice("Escribe o dicta un pedido primero para que el asistente pueda interpretarlo.");
      return;
    }
    const lower = clean.toLowerCase();
    const match = catalog.find((item) => lower.includes(item.name.toLowerCase().split(" ")[0]));
    const item = match ?? catalog[0];
    setChannel("WhatsApp");
    setSelected(catalog.indexOf(item));
    setNotice(`Entendido: ${item.name}. Sugerencia generada: agrega una bebida por Q20. Confirma para crear la orden.`);
  }

  function listen() {
    const Recognition = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : undefined;
    if (!Recognition) {
      setNotice("Tu navegador no expone reconocimiento de voz. Puedes escribir el audio transcrito para el demo.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "es-GT";
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event: SpeechRecognitionEvent) => setVoiceText(event.results[0][0].transcript);
    recognition.start();
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">O</span><span>OmniOrder <b>Lab</b></span></div>
        <div className="environment"><span className="dot" /> ENTORNO DEMO SEGURO</div>
        <button className="operator">Operador demo</button>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">COMERCIO + OPERACIÓN + FACTURACIÓN</p>
          <h1>Una orden. Cualquier canal.<br /><em>Una sola operación.</em></h1>
          <p className="hero-copy">Laboratorio de comercio omnicanal para demostrar cómo una venta web, POS, WhatsApp o voz conserva su trazabilidad hasta operación y facturación.</p>
        </div>
        <aside className="trust-card"><span>Arquitectura orientada a eventos</span><strong>Canales desacoplados.<br />Datos auditables.</strong><small>Adaptadores aislados para STS Gen 2 y Simphony</small></aside>
      </section>

      <section className="metrics" aria-label="Métricas operativas">
        <div><small>Órdenes hoy</small><strong>{stats.total}</strong><span>+3 demo</span></div>
        <div><small>En operación</small><strong>{stats.active}</strong><span>flujo central</span></div>
        <div><small>Canal WhatsApp</small><strong>{stats.whatsapp}</strong><span>texto y voz</span></div>
        <div><small>Venta consolidada</small><strong>Q{stats.revenue}</strong><span>todos los canales</span></div>
      </section>

      <section className="workspace">
        <article className="panel order-panel">
          <div className="panel-heading"><div><p className="eyebrow">NUEVA ORDEN</p><h2>Canal de entrada</h2></div><span className="secure-label">● validación activa</span></div>
          <div className="channel-tabs" role="tablist">
            {(["Web", "WhatsApp", "POS"] as Channel[]).map((item) => <button key={item} onClick={() => setChannel(item)} className={channel === item ? "active" : ""}>{item === "WhatsApp" ? "◔ " : ""}{item}</button>)}
          </div>
          <label>Cliente <input value={customer} onChange={(event) => setCustomer(event.target.value)} aria-label="Cliente" /></label>
          <p className="field-title">Menú disponible</p>
          <div className="products">
            {catalog.map((item, index) => <button key={item.name} onClick={() => setSelected(index)} className={selected === index ? "product selected" : "product"}><span><b>{item.name}</b><small>{item.description}</small></span><strong>Q{item.price}</strong></button>)}
          </div>
          <div className="summary"><span>{active.name}</span><strong>Q{active.price}</strong></div>
          <button className="primary" onClick={() => createOrder()}>Confirmar orden de {channel} <span>→</span></button>
        </article>

        <article className="panel voice-panel">
          <div className="panel-heading"><div><p className="eyebrow">ASISTENTE CONVERSACIONAL</p><h2>Pedido por audio</h2></div><span className="voice-badge">Voz + IA</span></div>
          <div className="voice-orb"><div className={listening ? "orb listening" : "orb"}>⌁</div><p>{listening ? "Escuchando…" : "Envía una nota de voz"}</p><small>“Quiero dos hamburguesas sin cebolla para recoger.”</small></div>
          <textarea value={voiceText} onChange={(event) => setVoiceText(event.target.value)} placeholder="Transcripción del audio o pedido de prueba…" aria-label="Transcripción del pedido por audio" />
          <div className="voice-actions"><button onClick={listen} className="secondary">{listening ? "Escuchando…" : "Usar micrófono"}</button><button onClick={processVoice} className="secondary">Interpretar pedido</button></div>
          <div className="assistant-message"><span>✦</span><p><b>Asistente:</b> Identifico productos, restricciones y modalidad. Sugiero complementos según catálogo aprobado, nunca confirmo sin validación explícita.</p></div>
        </article>
      </section>

      <section className="flow-strip"><div><span>01</span><b>Entrada</b><small>{channel} / Voz</small></div><i>→</i><div><span>02</span><b>Orden canónica</b><small>idempotencia y validación</small></div><i>→</i><div><span>03</span><b>Operación</b><small>Adaptador Simphony</small></div><i>→</i><div><span>04</span><b>Facturación</b><small>Adaptador STS Gen 2</small></div><i>→</i><div><span>05</span><b>Auditoría</b><small>evento inmutable</small></div></section>

      <section className="operations">
        <div className="section-heading"><div><p className="eyebrow">CONTROL OPERATIVO</p><h2>Órdenes consolidadas</h2></div><p>{notice}</p></div>
        <div className="table-wrap"><table><thead><tr><th>Orden</th><th>Canal</th><th>Cliente</th><th>Detalle</th><th>Total</th><th>Estado</th><th>Integración</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><b>{order.id}</b><small>{order.createdAt}</small></td><td><span className={`channel-chip ${order.channel.toLowerCase()}`}>{order.channel}</span></td><td>{order.customer}</td><td>{order.items}</td><td><b>Q{order.total}</b></td><td><span className={`stage ${stageClass(order.stage)}`}>{order.stage}</span></td><td><span className="integration">STS ✓ &nbsp; Simphony ✓</span></td></tr>)}</tbody></table></div>
      </section>

      <footer><b>OmniOrder Lab</b><span>Demo sin datos de producción · contratos de integración versionados · acceso mínimo necesario</span></footer>
    </main>
  );
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
  interface SpeechRecognition { lang: string; onstart: (() => void) | null; onend: (() => void) | null; onresult: ((event: SpeechRecognitionEvent) => void) | null; start: () => void; }
  interface SpeechRecognitionEvent { results: { [index: number]: { [index: number]: { transcript: string } } }; }
}
