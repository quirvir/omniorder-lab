"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import "../app-navigation.css";
import "../module-shell.css";
type Entry={time:string;action:string;status:number;ok:boolean;elapsed:number;message:string};
export default function Activity(){const [entries,setEntries]=useState<Entry[]>([]);useEffect(()=>{try{setEntries(JSON.parse(sessionStorage.getItem("omniorder.orderLog")||"[]"));}catch{}},[]);return <main className="module-shell"><Nav/><section className="module-content"><span className="module-kicker">ACTIVIDAD</span><h1>Registro de integración</h1><p>Historial local de solicitudes y respuestas. No guarda credenciales.</p><article className="module-card"><h2>Últimas respuestas API</h2>{entries.length?<div className="activity-list">{entries.map((entry,index)=><div className={entry.ok?"activity-row":"activity-row error"} key={`${entry.time}-${index}`}><span>{entry.time}</span><b>{entry.action}</b><em>HTTP {entry.status||"—"} · {entry.elapsed} ms</em><small>{entry.message}</small></div>)}</div>:<div className="empty-module">Aún no hay actividad en esta sesión.</div>}</article></section></main>}
function Nav(){return <nav className="app-navigation"><Link href="/">Pedir</Link><Link href="/operation">Operación</Link><Link className="active" href="/activity">Actividad</Link><Link href="/admin">Configuración</Link><span className="nav-status">Log local</span></nav>}
