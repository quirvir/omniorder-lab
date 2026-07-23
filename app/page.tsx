"use client";

import { useEffect, useMemo, useState } from "react";
import "./commerce.css";
import "./payment-choice.css";
import "./assisted.css";
import "./app-navigation.css";

type Channel = "Web" | "WhatsApp" | "Voz";
type Modifier = { condimentId:number; definitionSequence:number; name:string; price:number };
type Group = { id:number; name:string; minimumCount:number; maximumCount:number; items:Modifier[] };
type Product = { menuItemId:number; objNum:number; definitionSequence:number; name:string; description:string; price:number; imageUrl?:string; imageAlt?:string; modifierGroups:Group[] };
type Line = { key:string; product:Product; quantity:number; modifiers:Modifier[] };
type Tender = { tenderId:number; name:string; type:string };
type Confirmation = { checkNumber?:number; checkRef?:string; checkName?:string; status?:string; totalDue?:number };

const demo:Product[] = [
  { menuItemId:1,objNum:1,definitionSequence:0,name:"Combo clasico",description:"Hamburguesa, papas y bebida",price:69,modifierGroups:[] },
  { menuItemId:2,objNum:2,definitionSequence:0,name:"Pollo crispy",description:"Pollo crujiente, papas y salsa",price:59,modifierGroups:[] },
  { menuItemId:3,objNum:3,definitionSequence:0,name:"Cafe americano",description:"Tueste local, 12 oz",price:23,modifierGroups:[] },
];
const range = { min:1103011, max:1103043 };
const errorText = (value:unknown) => { const row=value&&typeof value==="object" ? value as Record<string,unknown> : {}; const data=row.data&&typeof row.data==="object" ? row.data as Record<string,unknown> : {}; return String(data.message||data.detail||row.message||"Simphony rechazó la orden."); };
const isCard = (tender?:Tender) => /card|tarjeta|credit|debit|visa|mastercard|amex/i.test(`${tender?.name||""} ${tender?.type||""}`);

export default function Home() {
  const [catalog,setCatalog] = useState<Product[]>(demo);
  const [cart,setCart] = useState<Line[]>([]);
  const [tenders,setTenders] = useState<Tender[]>([]);
  const [method,setMethod] = useState("");
  const [session,setSession] = useState<string>();
  const [source,setSource] = useState(false);
  const [search,setSearch] = useState("");
  const [channel,setChannel] = useState<Channel>("Web");
  const [customer,setCustomer] = useState("Web");
  const [notes,setNotes] = useState("");
  const [assistedText,setAssistedText] = useState("");
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState("Activa tu catálogo desde Admin Simphony para operar con productos reales.");
  const [confirmation,setConfirmation] = useState<Confirmation>();

  useEffect(() => { const id=sessionStorage.getItem("omniorder.simphonySession"); if(id){ setSession(id); void load(id); } else window.location.replace("/admin?setup=1"); }, []);
  useEffect(() => { if(!confirmation)return; writeLog(true,200,`Check #${confirmation.checkNumber||"—"} ${confirmation.status||"confirmado"}`); }, [confirmation]);
  useEffect(() => { if(/rechaz|unable|no se pudo/i.test(notice))writeLog(false,400,notice); }, [notice]);

  function writeLog(ok:boolean,status:number,message:string) { try { const current=JSON.parse(sessionStorage.getItem("omniorder.orderLog")||"[]"); sessionStorage.setItem("omniorder.orderLog",JSON.stringify([{time:new Date().toLocaleTimeString(),action:"createTrainingCheck",status,ok,elapsed:0,message},...current].slice(0,12))); } catch {} }
  async function load(id:string) { setBusy(true); try { const res=await fetch("/api/simphony",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"catalog",sessionId:id})}); const data=await res.json(); if(!data.ok)throw Error(data.message); const items=(data.catalog as Product[]).filter(x=>x.objNum>=range.min&&x.objNum<=range.max); const payments=(data.tenders as Tender[]).filter(x=>/cash|efectivo|card|tarjeta|credit|debit/i.test(`${x.name} ${x.type}`)); setCatalog(items); setTenders(payments); setMethod(payments[0]?.name||""); setSource(true); setNotice(`Catálogo sincronizado: ${items.length} productos. Elige cómo pagar al recoger.`); } catch(e) { sessionStorage.removeItem("omniorder.simphonySession"); setNotice(e instanceof Error?e.message:"No fue posible cargar Simphony."); } finally { setBusy(false); } }

  const products = useMemo(() => catalog.filter(x=>`${x.name} ${x.description}`.toLowerCase().includes(search.toLowerCase())),[catalog,search]);
  const total = useMemo(() => cart.reduce((sum,line)=>sum+(line.product.price+line.modifiers.reduce((a,m)=>a+m.price,0))*line.quantity,0),[cart]);
  const count = cart.reduce((sum,line)=>sum+line.quantity,0);
  const selectedTender=tenders.find(t=>t.name===method);

  function add(product:Product, quantity=1) { setCart(now=>{ const found=now.find(x=>x.key===String(product.menuItemId)); return found ? now.map(x=>x===found?{...x,quantity:x.quantity+quantity}:x) : [...now,{key:String(product.menuItemId),product,quantity,modifiers:[]}]; }); }
  function quantity(key:string, delta:number) { setCart(now=>now.flatMap(x=>x.key!==key?[x]:x.quantity+delta>0?[{...x,quantity:x.quantity+delta}]:[])); }
  function modifier(key:string, group:Group, modifier:Modifier) { setCart(now=>now.map(line=>{ if(line.key!==key)return line; const has=line.modifiers.some(x=>x.condimentId===modifier.condimentId&&x.definitionSequence===modifier.definitionSequence); let list=line.modifiers.filter(x=>x.condimentId!==modifier.condimentId||x.definitionSequence!==modifier.definitionSequence); if(!has){ const inGroup=list.filter(x=>group.items.some(i=>i.condimentId===x.condimentId)); if(group.maximumCount===1)list=list.filter(x=>!inGroup.includes(x)); if(!group.maximumCount||inGroup.length<group.maximumCount)list=[...list,modifier]; } return {...line,modifiers:list}; })); }
  function validate() { for(const line of cart)for(const group of line.product.modifierGroups){ const chosen=line.modifiers.filter(item=>group.items.some(x=>x.condimentId===item.condimentId&&x.definitionSequence===item.definitionSequence)).length; if(chosen<group.minimumCount)return `Completa ${group.name} para ${line.product.name}.`; } return ""; }
  function interpretAssistedOrder() { const text=assistedText.trim().toLowerCase(); if(!text)return setNotice(channel==="WhatsApp"?"Pega el mensaje recibido por WhatsApp.":"Escribe o dicta la transcripción del pedido."); const matched=catalog.filter(product=>text.includes(product.name.toLowerCase())); if(!matched.length)return setNotice("No identifiqué productos del menú. Prueba usando el nombre del producto."); matched.forEach(product=>{ const near=text.slice(Math.max(0,text.indexOf(product.name.toLowerCase())-14),text.indexOf(product.name.toLowerCase())); const amount=Number((near.match(/\d+/)||["1"])[0])||1; add(product,Math.min(amount,9)); }); setAssistedText(""); setNotice(`${matched.length} producto(s) interpretado(s) desde ${channel}. Revísalos antes de confirmar.`); }
  async function confirm() { if(!cart.length)return setNotice("Agrega al menos un producto."); const issue=validate(); if(issue)return setNotice(issue); if(!source||!session){setCart([]);return setNotice("Orden demo confirmada.");} if(!method)return setNotice("Selecciona efectivo o tarjeta."); setBusy(true); try { const res=await fetch("/api/simphony",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"createTrainingCheck",sessionId:session,draft:{items:cart.map(line=>({menuItemId:line.product.menuItemId,definitionSequence:line.product.definitionSequence,quantity:line.quantity,condiments:line.modifiers.map(mod=>({condimentId:mod.condimentId,definitionSequence:mod.definitionSequence,quantity:1}))})),checkName:customer||"Web",paymentMethod:method,informationLines:[`Cliente: ${customer||"Web"}`,`Canal: ${channel}`,`Pago previsto: ${method}`,notes]}})}); const data=await res.json(); if(!data.ok)throw Error(errorText(data)); setConfirmation(data.confirmation||{}); setCart([]); setNotes(""); setNotice(data.message||"Pedido confirmado."); } catch(e) { setNotice(e instanceof Error?e.message:"No se pudo confirmar el pedido."); } finally { setBusy(false); } }

  return <main>
    <header className="topbar"><div className="brand"><img src="/oracle-redwood.svg" alt="Oracle"/><span className="brand-divider"/><span className="product-name">OmniOrder Lab</span></div><div className="environment"><span className="dot"/> {source?"CATÁLOGO SIMPHONY ACTIVO":"ENTORNO DEMO SEGURO"}</div><a className="operator" href="/admin#parametros">Admin Simphony</a></header>
    <nav className="app-navigation" aria-label="Módulos de OmniOrder"><a className="active" href="/">Pedir</a><a href="/operation">Operación</a><a href="/activity">Actividad</a><a href="/admin">Configuración</a><span className="nav-status"><strong>●</strong> Catálogo activo</span></nav>
    <section className="hero commerce-hero"><div><p className="eyebrow">PEDIDO RÁPIDO · SIMPHONY</p><h1>Elige. Personaliza.<br/><em>Confirma.</em></h1><p className="hero-copy">Una sola orden, desde web, WhatsApp o voz.</p></div><aside className="trust-card"><span>Autoservicio seguro</span><strong>Orden trazable.<br/>Pago al recoger.</strong><small>Sin tarjetas ni credenciales expuestas</small></aside></section>
    <section id="orden" className="workspace commerce-workspace"><article className="panel order-panel"><div className="panel-heading"><div><p className="eyebrow">{source?"MENÚ SINCRONIZADO":"CATÁLOGO DEMO"}</p><h2>¿Qué te gustaría ordenar?</h2></div><span className="secure-label">{products.length} opciones</span></div><div id="canales" className="quick-controls"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar en el menú..."/><div className="channel-tabs compact">{(["Web","WhatsApp","Voz"] as Channel[]).map(item=><button key={item} className={channel===item?"active":""} onClick={()=>setChannel(item)}>{item}</button>)}</div></div>
      {channel!=="Web"&&<div className="assisted-order"><b>{channel==="WhatsApp"?"Pedido recibido por WhatsApp":"Pedido por voz"}</b><p>{channel==="WhatsApp"?"Pega el mensaje del cliente; interpretaremos solo productos del menú sincronizado.":"Escribe la transcripción. La orden no se envía hasta que el cliente la revise y confirme."}</p><textarea value={assistedText} onChange={e=>setAssistedText(e.target.value)} placeholder={channel==="WhatsApp"?"Ej. Quiero 2 Casero atol de elote":"Ej. Quiero un Casero atol de elote"}/><button type="button" className="secondary" onClick={interpretAssistedOrder}>Interpretar y agregar al carrito</button></div>}
      <label className="customer-field"><span>Nombre para la orden <small>(visible en POS/KDS)</small></span><input value={customer} onChange={e=>setCustomer(e.target.value.slice(0,12))} maxLength={12} placeholder="Web"/></label>
      <div className="product-grid">{products.map(product=><button className="menu-card" key={product.menuItemId} onClick={()=>add(product)}><span className="menu-image">{product.imageUrl?<img src={product.imageUrl} alt={product.imageAlt||product.name}/>:"🍽"}</span><span><b>{product.name}</b><small>{product.description}</small><strong>${product.price.toFixed(2)}</strong><em>Agregar +</em></span></button>)}</div>
    </article>
    <article className="panel customization-panel"><div className="panel-heading"><div><p className="eyebrow">TU PEDIDO</p><h2>Revisa y confirma</h2></div><span className="voice-badge">{count} item(s)</span></div>{cart.length?<div className="cart-lines">{cart.map(line=><div className="cart-line" key={line.key}><div><b>{line.product.name}</b><small>{line.modifiers.map(x=>x.name).join(", ")||"Sin modificaciones"}</small></div><div className="stepper"><button onClick={()=>quantity(line.key,-1)}>−</button><b>{line.quantity}</b><button onClick={()=>quantity(line.key,1)}>+</button></div>{line.product.modifierGroups.map(group=><div className="modifier-group" key={group.id}><small>{group.name}{group.minimumCount?` · mínimo ${group.minimumCount}`:""}</small><div>{group.items.map(modifier=>{const on=line.modifiers.some(x=>x.condimentId===modifier.condimentId&&x.definitionSequence===modifier.definitionSequence);return <button className={on?"modifier active":"modifier"} key={modifier.condimentId} onClick={()=>modifier(line.key,group,modifier)}>{on?"✓ ":"+ "}{modifier.name}{modifier.price?` · $${modifier.price}`:""}</button>})}</div></div>)}</div>)}</div>:<p className="empty-cart">Toca un producto para agregarlo.</p>}
      {source&&<fieldset id="pagos" className="payment-choice"><legend>¿Cómo pagarás al recoger?</legend>{tenders.map(tender=><label key={tender.tenderId} className={isCard(tender)?"payment-card":"payment-cash"}><input type="radio" name="payment" checked={method===tender.name} onChange={()=>setMethod(tender.name)}/><span>{tender.name}</span></label>)}<small>{isCard(selectedTender)?"La tarjeta se registra como pago y el check queda cerrado.":"Efectivo crea un check abierto; el cobro se realiza en el establecimiento."}</small></fieldset>}
      <label className="note-field"><span>Indicaciones para el restaurante</span><textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={255} placeholder="Ej. Sin cebolla, recoger en 20 minutos."/></label><div className="summary"><span>{count} producto(s) · {channel}</span><strong>${total.toFixed(2)}</strong></div><button className="primary" disabled={busy} onClick={()=>void confirm()}>{busy?"Enviando...":"Confirmar pedido"}<span>→</span></button>
    </article></section>
    <section id="operacion" className="operations"><div className="section-heading"><div><p className="eyebrow">ESTADO DE LA ORDEN</p><h2>{confirmation?"Pedido confirmado":"Listo para ordenar"}</h2></div><p>{notice}</p></div>{confirmation&&<div className="order-confirmation"><b>✓ Orden recibida por Simphony</b><span>Check #{confirmation.checkNumber||"—"} · {confirmation.checkName||"Orden Web"} · Estado {confirmation.status||"open"}</span><small>Referencia: {confirmation.checkRef||"disponible en POS"}</small></div>}</section>
    <footer><b>OmniOrder Lab</b><span>Demo para Oracle Simphony · no usa datos de producción</span></footer>
  </main>;
}
