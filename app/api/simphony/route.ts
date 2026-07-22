import { NextResponse } from "next/server";

type Config = { apiBaseUrl:string; oidcBaseUrl:string; clientId:string; username:string; password:string; orgShortName:string; locRef:string; rvcRef:string; employeeRef:string; orderTypeRef:string; orderChannelRef?:string; menuId?:string; menuItemId?:string; quantity?:string };
type Modifier = { condimentId:number; definitionSequence:number; name:string; price:number };
type ModifierGroup = { id:number; name:string; minimumCount:number; maximumCount:number; items:Modifier[] };
type CatalogItem = { menuItemId:number; definitionSequence:number; name:string; description:string; price:number; imageUrl?:string; imageAlt?:string; modifierGroups:ModifierGroup[] };
type DraftItem = { menuItemId:number; definitionSequence:number; quantity:number; condiments?:{condimentId:number;definitionSequence:number;quantity:number}[] };
type Body = { action:"test"|"menuSummary"|"menu"|"trainingCheck"|"activateMenu"|"catalog"|"createTrainingCheck"; config?:Config; sessionId?:string; draft?:{items:DraftItem[];informationLines?:string[]} };
type Session = { config:Config; catalog:CatalogItem[]; expiresAt:number };

const sessions = new Map<string, Session>();
const SESSION_TTL_MS = 30 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const body = await request.json() as Body;
    if (body.action === "catalog") return catalogResponse(requireSession(body.sessionId));
    if (body.action === "createTrainingCheck") return createTrainingCheck(requireSession(body.sessionId), body.draft);

    const config = body.config;
    if (!config) throw new Error("Falta la configuracion de Simphony para esta accion.");
    validate(config);
    const token = await authenticate(config);
    if (body.action === "test") return result(await api(config, token, `/organizations/${encodeURIComponent(config.orgShortName)}/locations/${encodeURIComponent(config.locRef)}/revenueCenters/${encodeURIComponent(config.rvcRef)}`), "Conexion autenticada y Revenue Center validado.");
    if (body.action === "menuSummary") return result(await api(config, token, "/menus/summary"), "Resumen de menus recibido.");
    if (body.action === "menu" || body.action === "activateMenu") {
      if (!config.menuId) throw new Error("Ingresa el menuId que deseas sincronizar.");
      const response = await api(config, token, `/menus/${encodeURIComponent(config.menuId)}`);
      const data = await json(response);
      if (!response.ok) return NextResponse.json({ ok:false, status:response.status, message:"Simphony no pudo devolver el menu.", data }, { status:response.status });
      const catalog = normalizeMenu(data);
      if (body.action === "menu") return NextResponse.json({ ok:true, status:response.status, message:`Menu sincronizado: ${catalog.length} productos listos para e-commerce.`, catalog, data });
      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, { config, catalog, expiresAt:Date.now() + SESSION_TTL_MS });
      return NextResponse.json({ ok:true, message:`Catalogo activo para esta sesion (${catalog.length} productos). Las credenciales quedan solo en memoria por 30 minutos.`, sessionId, catalog });
    }
    if (body.action === "trainingCheck") {
      if (!config.menuItemId) throw new Error("Completa menuItemId antes de crear el training check.");
      return postCheck(config, token, { items:[{ menuItemId:Number(config.menuItemId), definitionSequence:0, quantity:Number(config.quantity || "1") }], informationLines:["OmniOrder Lab e-commerce training check"] });
    }
    throw new Error("Accion no soportada.");
  } catch (error) {
    return NextResponse.json({ ok:false, message:error instanceof Error ? error.message : "No fue posible conectar con Simphony." }, { status:400 });
  }
}

async function createTrainingCheck(session:Session, draft?:Body["draft"]) {
  if (!draft?.items?.length) throw new Error("Agrega al menos un producto antes de enviar la orden.");
  const token = await authenticate(session.config);
  return postCheck(session.config, token, draft);
}

async function postCheck(config:Config, token:string, draft:{items:DraftItem[];informationLines?:string[]}) {
  if (!config.employeeRef || !config.orderTypeRef) throw new Error("La sesion necesita checkEmployeeRef y orderTypeRef para crear un check.");
  const informationLines = (draft.informationLines || []).map(line => line.trim()).filter(Boolean).slice(0, 4).map(line => line.slice(0, 255));
  const payload = {
    header:{ orgShortName:config.orgShortName, locRef:config.locRef, rvcRef:Number(config.rvcRef), checkEmployeeRef:Number(config.employeeRef), orderTypeRef:Number(config.orderTypeRef), ...(config.orderChannelRef ? { orderChannelRef:Number(config.orderChannelRef) } : {}), idempotencyId:crypto.randomUUID().replaceAll("-", ""), checkName:`WEB-${Date.now().toString().slice(-10)}`, guestCount:1, isTrainingCheck:true, ...(informationLines.length ? { informationLines } : {}) },
    menuItems:draft.items.map(item => ({ menuItemId:item.menuItemId, definitionSequence:item.definitionSequence, quantity:item.quantity, ...(item.condiments?.length ? { condiments:item.condiments } : {}) })),
  };
  const response = await api(config, token, "/checks", { method:"POST", body:JSON.stringify(payload), headers:{ "Content-Type":"application/json", "Simphony-Features":"detect-duplicate-request,enable-condiment-prefix" } });
  const data = await json(response);
  return NextResponse.json({ ok:response.ok, status:response.status, message:response.ok ? "Training check creado en Simphony." : "Simphony rechazo el training check.", data, payload }, { status:response.ok ? 200 : response.status });
}

function catalogResponse(session:Session) { return NextResponse.json({ ok:true, message:`Catalogo Simphony activo: ${session.catalog.length} productos.`, catalog:session.catalog, expiresAt:session.expiresAt }); }
function requireSession(sessionId?:string) { if (!sessionId) throw new Error("Primero activa un menu desde Admin Simphony."); const session=sessions.get(sessionId); if (!session || session.expiresAt<Date.now()) { sessions.delete(sessionId); throw new Error("La sesion de Simphony expiro. Activa nuevamente el menu desde Admin."); } return session; }

function normalizeMenu(value:unknown):CatalogItem[] {
  const menu = record(value); const condimentItems = asArray(menu.condimentItems); const groups = asArray(menu.condimentGroups); const familyGroups = asArray(menu.familyGroups);
  const condiments = new Map<number, Record<string,unknown>>(); condimentItems.forEach(item => { const row=record(item); const id=numberOf(row.condimentId ?? row.id); if (id) condiments.set(id,row); });
  const groupById = new Map<number, Record<string,unknown>>(); groups.forEach(item => { const row=record(item); const id=numberOf(row.condimentGroupId ?? row.condimentGroupRef ?? row.id); if(id) groupById.set(id,row); });
  const familyById = new Map<number, Record<string,unknown>>(); familyGroups.forEach(item => { const row=record(item); const id=numberOf(row.familyGroupItemId ?? row.familyGroupRef ?? row.id); if(id) familyById.set(id,row); });
  return asArray(menu.menuItems).map(item => {
    const row=record(item); const definition=record(asArray(row.definitions)[0]); const consumer=record(definition.ConsumerContentProperties ?? definition.consumerContentProperties);
    const family=familyById.get(numberOf(row.familyGroupRef)); const image=imageOf(consumer) ?? imageOf(definition) ?? imageOf(family || {});
    const rules=asArray(definition.condimentGroupRules).map(rule => { const r=record(rule); const id=numberOf(r.condimentGroupRef); const group=groupById.get(id) || {}; const refs=asArray(group.condimentItemRefs ?? group.condimentItems ?? group.items); const items=refs.map(ref => { const rr=record(ref); const condiment=condiments.get(numberOf(rr.condimentItemRef ?? rr.condimentId ?? rr.id)) || {}; const condimentDefinition=record(asArray(condiment.definitions).find(candidate => numberOf(record(candidate).definitionSequence)===numberOf(rr.definitionSequence)) ?? asArray(condiment.definitions)[0]); return { condimentId:numberOf(rr.condimentItemRef ?? rr.condimentId ?? condiment.condimentId), definitionSequence:numberOf(rr.definitionSequence ?? condimentDefinition.definitionSequence), name:textOf(condimentDefinition.ConsumerContentProperties ? record(condimentDefinition.ConsumerContentProperties).consumerName : condimentDefinition.name) || textOf(condiment.name) || "Modificador", price:priceOf(condimentDefinition) }; }).filter(modifier => modifier.condimentId); return { id, name:textOf(group.consumerName) || textOf(group.name) || "Personaliza tu producto", minimumCount:numberOf(r.minimumCount), maximumCount:numberOf(r.maximumCount), items }; }).filter(group => group.id && group.items.length);
    return { menuItemId:numberOf(row.menuItemId), definitionSequence:numberOf(definition.definitionSequence), name:textOf(consumer.consumerName) || textOf(definition.name) || textOf(row.name) || `Producto ${row.menuItemId}`, description:textOf(consumer.consumerDescription) || textOf(definition.consumerDescription) || "Producto disponible en Simphony", price:priceOf(definition), imageUrl:image?.url, imageAlt:image?.altText, modifierGroups:rules };
  }).filter(item => item.menuItemId && item.name).slice(0, 60);
}

function record(value:unknown):Record<string,unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string,unknown> : {}; }
function asArray(value:unknown):unknown[] { return Array.isArray(value) ? value : []; }
function numberOf(value:unknown):number { const parsed=Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function textOf(value:unknown):string { if(typeof value === "string") return value; const row=record(value); return ["es-GT","es","en-US","en"].map(key => row[key]).find((item):item is string => typeof item === "string") || Object.values(row).find((item):item is string => typeof item === "string") || ""; }
function priceOf(value:Record<string,unknown>):number { const prices=asArray(value.prices ?? value.priceDetails); return numberOf(record(prices[0]).price ?? value.price ?? value.unitPrice); }
function imageOf(value:Record<string,unknown>):{url:string;altText?:string}|undefined { const image=record(asArray(value.images)[0]); return typeof image.url === "string" && image.url.startsWith("https://") ? { url:image.url, altText:typeof image.altText === "string" ? image.altText : undefined } : undefined; }

function validate(c:Config) { const keys:(keyof Config)[]=["apiBaseUrl","oidcBaseUrl","clientId","username","password","orgShortName","locRef","rvcRef"]; const missing=keys.filter(key=>!c[key]?.trim()); if(missing.length) throw new Error(`Faltan: ${missing.join(", ")}.`); [c.apiBaseUrl,c.oidcBaseUrl].forEach(value=>{if(new URL(value).protocol!=="https:") throw new Error("Simphony debe usar HTTPS.");}); }
async function authenticate(c:Config) {
  const verifier=base64Url(crypto.getRandomValues(new Uint8Array(32))); const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier));
  const configured=trim(c.oidcBaseUrl); const candidates=[configured,...(configured.endsWith("/v1")?[]:[`${configured}/v1`])]; let oidc=""; let cookie=""; let authorizeStatus=0;
  for(const candidate of candidates){ const authorizeUrl=new URL(`${candidate}/oauth2/authorize`); authorizeUrl.search=new URLSearchParams({response_type:"code",client_id:c.clientId,scope:"openid",redirect_uri:"apiaccount://callback",code_challenge:base64Url(new Uint8Array(digest)),code_challenge_method:"S256"}).toString(); const authorize=await fetch(authorizeUrl,{redirect:"manual"}); authorizeStatus=authorize.status; const nextCookie=authorize.headers.get("set-cookie"); if(nextCookie){oidc=candidate;cookie=nextCookie;break;} }
  if(!cookie) throw new Error(`Simphony no devolvio la cookie OIDC (HTTP ${authorizeStatus}). Se probaron la URL configurada y su variante /v1.`);
  const signin=await fetch(`${oidc}/oauth2/signin`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded",Cookie:cookie},body:new URLSearchParams({username:c.username,password:c.password,orgname:c.orgShortName})}); const signed=await json(signin) as {redirectUrl?:string;success?:boolean;message?:string}; if(!signin.ok||!signed.success||!signed.redirectUrl) throw new Error(signed.message||"Inicio de sesion rechazado por Simphony."); const code=new URL(signed.redirectUrl).searchParams.get("code"); if(!code) throw new Error("Simphony no devolvio el codigo de autorizacion."); const token=await fetch(`${oidc}/oauth2/token`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded",Cookie:cookie},body:new URLSearchParams({scope:"openid",grant_type:"authorization_code",client_id:c.clientId,code_verifier:verifier,code,redirect_uri:"apiaccount://callback"})}); const data=await json(token) as {id_token?:string;message?:string}; if(!token.ok||!data.id_token) throw new Error(data.message||"No fue posible obtener el token de Simphony."); return data.id_token;
}
async function api(c:Config,token:string,path:string,init:RequestInit={}) { const headers=new Headers(init.headers); headers.set("Authorization",`Bearer ${token}`); headers.set("Accept","application/json"); headers.set("Simphony-OrgShortName",c.orgShortName); headers.set("Simphony-LocRef",c.locRef); headers.set("Simphony-RvcRef",c.rvcRef); return fetch(`${trim(c.apiBaseUrl)}${path}`,{...init,headers}); }
async function result(response:Response,message:string) { const data=await json(response); return NextResponse.json({ok:response.ok,status:response.status,message,data},{status:response.ok?200:response.status}); }
async function json(response:Response):Promise<unknown> { const text=await response.text(); try{return text?JSON.parse(text):{};}catch{return {raw:text};} }
function trim(value:string){return value.replace(/\/+$/,"");} function base64Url(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");}
