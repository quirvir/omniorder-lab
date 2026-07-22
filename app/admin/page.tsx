"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import "./simphony-admin.css";

type Config = Record<"apiBaseUrl"|"oidcBaseUrl"|"clientId"|"username"|"password"|"orgShortName"|"locRef"|"rvcRef"|"employeeRef"|"orderTypeRef"|"orderChannelRef"|"menuId"|"menuItemId"|"quantity", string>;
const initial: Config = { apiBaseUrl:"", oidcBaseUrl:"", clientId:"", username:"", password:"", orgShortName:"", locRef:"", rvcRef:"", employeeRef:"", orderTypeRef:"", orderChannelRef:"", menuId:"", menuItemId:"", quantity:"1" };
type Action = "test"|"menuSummary"|"menu"|"trainingCheck";

export default function SimphonyAdmin() {
  const [config, setConfig] = useState<Config>(initial);
  const [result, setResult] = useState<unknown>(null);
  const [message, setMessage] = useState("Completa la conexión y prueba autenticación antes de consultar el menú.");
  const [busy, setBusy] = useState<Action | null>(null);
  const update = (key:keyof Config, value:string) => setConfig(current => ({...current,[key]:value}));
  async function run(action:Action) {
    setBusy(action); setResult(null); setMessage("Conectando con Simphony…");
    try { const response=await fetch("/api/simphony",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,config})}); const data=await response.json(); setResult(data); setMessage(data.message || (data.ok ? "Operación completada." : "Simphony devolvió un error.")); }
    catch { setMessage("No fue posible comunicarse con el servidor local del lab."); }
    finally { setBusy(null); }
  }
  function submit(event:FormEvent) { event.preventDefault(); void run("test"); }
  return <main className="admin-shell">
    <header className="admin-header"><Link href="/" className="back">← Volver al e-commerce</Link><div><span className="admin-kicker">CONFIGURACIÓN LOCAL</span><h1>Admin de Simphony STS Gen 2</h1></div><span className="local-only">● Sólo sesión actual</span></header>
    <section className="admin-intro"><b>Las credenciales no se guardan, no se muestran de nuevo y no se suben a Git.</b><span>Este panel las envía únicamente al servidor local para ejecutar cada prueba.</span></section>
    <form onSubmit={submit} className="admin-grid">
      <section className="admin-card"><div className="card-title"><span>1</span><div><h2>Conexión OIDC</h2><p>Valores de EMC: Services URL y OpenID Provider.</p></div></div>
        <Field label="STS Gen2 Services URL" hint="Ej. https://host/api/v1" value={config.apiBaseUrl} onChange={value=>update("apiBaseUrl",value)} placeholder="https://…/api/v1" required />
        <Field label="OpenID Provider URL" hint="Ej. https://host/oidc-provider/v1" value={config.oidcBaseUrl} onChange={value=>update("oidcBaseUrl",value)} placeholder="https://…/oidc-provider/v1" required />
        <Field label="Client ID" value={config.clientId} onChange={value=>update("clientId",value)} required />
        <Field label="Usuario API" value={config.username} onChange={value=>update("username",value)} required />
        <Field label="Contraseña API" type="password" value={config.password} onChange={value=>update("password",value)} required />
      </section>
      <section className="admin-card"><div className="card-title"><span>2</span><div><h2>Contexto de tu lab</h2><p>Identifica dónde Simphony debe crear el check.</p></div></div>
        <Field label="orgShortName" value={config.orgShortName} onChange={value=>update("orgShortName",value.toLowerCase())} required />
        <Field label="locRef" value={config.locRef} onChange={value=>update("locRef",value.toLowerCase())} required />
        <Field label="rvcRef" type="number" value={config.rvcRef} onChange={value=>update("rvcRef",value)} required />
        <Field label="checkEmployeeRef" type="number" value={config.employeeRef} onChange={value=>update("employeeRef",value)} hint="Requerido para crear un check" />
        <Field label="orderTypeRef" type="number" value={config.orderTypeRef} onChange={value=>update("orderTypeRef",value)} hint="To Go / Pickup / e-commerce" />
        <Field label="orderChannelRef" type="number" value={config.orderChannelRef} onChange={value=>update("orderChannelRef",value)} hint="Opcional: canal e-commerce" />
        <button disabled={busy!==null} className="test-button" type="submit">{busy === "test" ? "Probando…" : "Probar autenticación y RVC"}</button>
      </section>
      <section className="admin-card wide"><div className="card-title"><span>3</span><div><h2>Menú e-commerce: sólo hamburguesas</h2><p>Consulta el resumen, toma el menuId y sincroniza. El filtro busca “hamburguesa” en el resultado.</p></div></div>
        <div className="inline-actions"><button type="button" onClick={()=>void run("menuSummary")} disabled={busy!==null}>{busy === "menuSummary" ? "Consultando…" : "1. Ver menús disponibles"}</button><Field label="menuId" value={config.menuId} onChange={value=>update("menuId",value)} placeholder="Pega el ID del menú" /><button type="button" onClick={()=>void run("menu")} disabled={busy!==null}>{busy === "menu" ? "Sincronizando…" : "2. Sincronizar hamburguesas"}</button></div>
        <div className="warning">No crees la orden todavía. Primero valida en el resultado que el menú y los <code>menuItemId</code> de hamburguesa sean los esperados.</div>
      </section>
      <section className="admin-card wide danger"><div className="card-title"><span>4</span><div><h2>Hito: check de entrenamiento</h2><p>Publica una hamburguesa desde el e-commerce como <code>isTrainingCheck: true</code>.</p></div></div>
        <div className="inline-actions"><Field label="menuItemId de hamburguesa" type="number" value={config.menuItemId} onChange={value=>update("menuItemId",value)} /><Field label="Cantidad" type="number" value={config.quantity} onChange={value=>update("quantity",value)} /><button type="button" className="post-button" onClick={()=>void run("trainingCheck")} disabled={busy!==null || !config.menuItemId}>{busy === "trainingCheck" ? "Creando…" : "Crear training check"}</button></div>
        <small>Esta acción sí hace POST a Simphony. Sólo úsala si tu lab permite training checks y los IDs ya fueron validados.</small>
      </section>
    </form>
    <section className="result-card"><div><span className="admin-kicker">RESULTADO</span><h2>{message}</h2></div>{result && <pre>{JSON.stringify(result,null,2)}</pre>}</section>
  </main>;
}

function Field({label,hint,type="text",value,onChange,placeholder,required}:{label:string;hint?:string;type?:string;value:string;onChange:(value:string)=>void;placeholder?:string;required?:boolean}) { return <label className="field"><span>{label}{required && <b> *</b>}</span><input type={type} value={value} onChange={event=>onChange(event.target.value)} placeholder={placeholder} required={required}/>{hint && <small>{hint}</small>}</label>; }
