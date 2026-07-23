"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import "../app-navigation.css";
import "../module-shell.css";
type Entry={time:string;action:string;status:number;ok:boolean;elapsed:number;message:string};
export default function Operation(){const [entries,setEntries]=useState<Entry[]>([]);useEffect(()=>{try{setEntries(JSON.parse(sessionStorage.getItem("omniorder.orderLog")||"[]").filter((entry:Entry)=>entry.action==="createTrainingCheck"));}catch{}},[]);return <main className="module-shell"><Nav/><section className="module-content"><span className="module-kicker">OPERACIÓN</span><h1>Órdenes y checks</h1><p>Confirma el resultado de los pedidos enviados a Simphony y continúa el seguimiento desde POS o KDS.</p><article className="module-card"><h2>Actividad de órdenes de esta sesión</h2>{entries.length?<div className="activity-list">{entries.map((entry,index)=><div className={entry.ok?"activity-row":"activity-row error"} key={`${entry.time}-${index}`}><span>{entry.time}</span><b>{entry.ok?"Orden enviada":"Orden rechazada"}</b><em>HTTP {entry.status||"—"}</em><small>{entry.message}</small></div>)}</div>:<div className="empty-module">Aún no hay órdenes enviadas. Ve a Pedir para crear una.</div>}</article></section></main>}
function Nav(){return <nav className="app-navigation"><Link href="/">Pedir</Link><Link className="active" href="/operation">Operación</Link><Link href="/activity">Actividad</Link><Link href="/admin">Configuración</Link><span className="nav-status">Seguimiento local</span></nav>}
