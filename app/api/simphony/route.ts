import { NextResponse } from "next/server";

type Config = { apiBaseUrl:string; oidcBaseUrl:string; clientId:string; username:string; password:string; orgShortName:string; locRef:string; rvcRef:string; employeeRef:string; orderTypeRef:string; orderChannelRef?:string; menuId?:string; menuItemId?:string; quantity?:string };
type Body = { action:"test"|"menuSummary"|"menu"|"trainingCheck"; config:Config };

export async function POST(request: Request) {
  try {
    const { action, config } = await request.json() as Body;
    validate(config);
    const token = await authenticate(config);
    if (action === "test") return result(await api(config, token, `/organizations/${encodeURIComponent(config.orgShortName)}/locations/${encodeURIComponent(config.locRef)}/revenueCenters/${encodeURIComponent(config.rvcRef)}`), "Conexión autenticada y Revenue Center validado.");
    if (action === "menuSummary") return result(await api(config, token, "/menus/summary"), "Resumen de menús recibido.");
    if (action === "menu") {
      if (!config.menuId) throw new Error("Ingresa el menuId que deseas sincronizar.");
      const response = await api(config, token, `/menus/${encodeURIComponent(config.menuId)}`); const data = await json(response);
      return NextResponse.json({ ok:response.ok, status:response.status, message:"Menú sincronizado. Se muestran coincidencias con hamburguesa.", data, hamburguesas:findHamburgers(data) }, { status:response.ok ? 200 : response.status });
    }
    if (action === "trainingCheck") {
      if (!config.menuItemId || !config.employeeRef || !config.orderTypeRef) throw new Error("Completa employeeRef, orderTypeRef y menuItemId antes de crear el training check.");
      const payload = { header:{ orgShortName:config.orgShortName, locRef:config.locRef, rvcRef:Number(config.rvcRef), checkEmployeeRef:Number(config.employeeRef), orderTypeRef:Number(config.orderTypeRef), ...(config.orderChannelRef ? { orderChannelRef:Number(config.orderChannelRef) } : {}), idempotencyId:crypto.randomUUID().replaceAll("-", ""), checkName:`WEB-${Date.now().toString().slice(-10)}`, guestCount:1, isTrainingCheck:true, informationLines:["OmniOrder Lab e-commerce training check"] }, menuItems:[{ menuItemId:Number(config.menuItemId), quantity:Number(config.quantity || "1") }] };
      const response = await api(config, token, "/checks", { method:"POST", body:JSON.stringify(payload), headers:{ "Content-Type":"application/json", "Simphony-Features":"detect-duplicate-request" } });
      const data = await json(response);
      return NextResponse.json({ ok:response.ok, status:response.status, message:response.ok ? "Training check creado en Simphony." : "Simphony rechazó el training check.", data, payload }, { status:response.ok ? 200 : response.status });
    }
    throw new Error("Acción no soportada.");
  } catch (error) { return NextResponse.json({ ok:false, message:error instanceof Error ? error.message : "No fue posible conectar con Simphony." }, { status:400 }); }
}

function validate(c:Config) { const keys:(keyof Config)[]=["apiBaseUrl","oidcBaseUrl","clientId","username","password","orgShortName","locRef","rvcRef"]; const missing=keys.filter(key=>!c[key]?.trim()); if(missing.length) throw new Error(`Faltan: ${missing.join(", ")}.`); [c.apiBaseUrl,c.oidcBaseUrl].forEach(value=>{if(new URL(value).protocol!=="https:") throw new Error("Simphony debe usar HTTPS.");}); }
async function authenticate(c:Config) { const verifier=base64Url(crypto.getRandomValues(new Uint8Array(32))); const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier)); const oidc=trim(c.oidcBaseUrl); const authorizeUrl=new URL(`${oidc}/oauth2/authorize`); authorizeUrl.search=new URLSearchParams({response_type:"code",client_id:c.clientId,scope:"openid",redirect_uri:"apiaccount://callback",code_challenge:base64Url(new Uint8Array(digest)),code_challenge_method:"S256"}).toString(); const authorize=await fetch(authorizeUrl,{redirect:"manual"}); const cookie=authorize.headers.get("set-cookie"); if(!cookie) throw new Error("Simphony no devolvió la cookie OIDC. Revisa OpenID Provider URL y Client ID."); const signin=await fetch(`${oidc}/oauth2/signin`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded",Cookie:cookie},body:new URLSearchParams({username:c.username,password:c.password,orgname:c.orgShortName})}); const signed=await json(signin) as {redirectUrl?:string;success?:boolean;message?:string}; if(!signin.ok||!signed.success||!signed.redirectUrl) throw new Error(signed.message||"Inicio de sesión rechazado por Simphony."); const code=new URL(signed.redirectUrl).searchParams.get("code"); if(!code) throw new Error("Simphony no devolvió el código de autorización."); const token=await fetch(`${oidc}/oauth2/token`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded",Cookie:cookie},body:new URLSearchParams({scope:"openid",grant_type:"authorization_code",client_id:c.clientId,code_verifier:verifier,code,redirect_uri:"apiaccount://callback"})}); const data=await json(token) as {id_token?:string;message?:string}; if(!token.ok||!data.id_token) throw new Error(data.message||"No fue posible obtener el token de Simphony."); return data.id_token; }
async function api(c:Config,token:string,path:string,init:RequestInit={}) { const headers=new Headers(init.headers); headers.set("Authorization",`Bearer ${token}`); headers.set("Accept","application/json"); headers.set("Simphony-OrgShortName",c.orgShortName); headers.set("Simphony-LocRef",c.locRef); headers.set("Simphony-RvcRef",c.rvcRef); return fetch(`${trim(c.apiBaseUrl)}${path}`,{...init,headers}); }
async function result(response:Response,message:string) { const data=await json(response); return NextResponse.json({ok:response.ok,status:response.status,message,data},{status:response.ok?200:response.status}); }
async function json(response:Response):Promise<unknown> { const text=await response.text(); try{return text?JSON.parse(text):{};}catch{return {raw:text};} }
function trim(value:string){return value.replace(/\/+$/,"");} function base64Url(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");}
function findHamburgers(value:unknown):unknown[]{const found:unknown[]=[];const scan=(item:unknown):void=>{if(Array.isArray(item)){item.forEach(scan);return;}if(!item||typeof item!=="object")return;const record=item as Record<string,unknown>;if(Object.values(record).some(field=>typeof field==="string"&&field.toLowerCase().includes("hamburguesa")))found.push(record);Object.values(record).forEach(scan);};scan(value);return found.slice(0,100);}
