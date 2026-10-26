import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../app/chatgpt-auth';
import seed from '../data/stories.server.json';
import { activeSubscription, publicStory } from './policy.mjs';
export function db(){ if(!env.DB) throw new Error('Database unavailable'); return env.DB; }
export const now=()=>Math.floor(Date.now()/1000);
export function config(){ return { billingEnabled:env.BILLING_ENABLED === 'true' && !!env.STRIPE_SECRET_KEY?.startsWith('sk_live_') && !!env.STRIPE_WEBHOOK_SECRET && !!env.STRIPE_PRICE_ID && !!env.SELLER_NAME && !!env.SELLER_CONTACT && !!env.SITE_ORIGIN, seller: env.SELLER_NAME || null, contact:env.SELLER_CONTACT || null }; }
export async function identity(){
 const user=await getChatGPTUser();
 if(user) await db().prepare('INSERT INTO profiles(id,email,display_name,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,display_name=excluded.display_name').bind(user.userId,user.email,user.fullName||'Narrify reader',now()).run();
 return user;
}
export const isAdmin=(u:any)=>!!u && (env.NARRIFY_ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).includes(u.email.toLowerCase());
export async function entitlement(userId:string){
 const s=await db().prepare("SELECT * FROM subscriptions WHERE user_id=? AND status='active' ORDER BY period_end DESC LIMIT 1").bind(userId).first();
 return {active:activeSubscription(s), subscription:s};
}
export async function stories(){
 const rows=await db().prepare("SELECT id,title,content,category,latitude,longitude,author,place,source_url,created_at FROM submissions WHERE status='approved' ORDER BY created_at DESC LIMIT 500").all();
 return [...seed,...rows.results.map((s:any)=>({id:s.id,title:s.title,content:s.content,category:s.category,latitude:s.latitude,longitude:s.longitude,author:s.author,place:s.place,preview:false,source:'Community contribution',sourceUrl:s.source_url||null,createdAt:new Date(s.created_at*1000).toISOString()}))];
}
export async function initialData(){
 const user=await identity();
 const member=user?await entitlement(user.userId):{active:false,subscription:null};
 const all=await stories();
 const saved=user?(await db().prepare('SELECT story_id FROM favorites WHERE user_id=?').bind(user.userId).all()).results.map((s:any)=>s.story_id):[];
 const sub:any=user?await db().prepare('SELECT * FROM subscriptions WHERE user_id=? ORDER BY updated_at DESC LIMIT 1').bind(user.userId).first():null;
 const hasBillingAccount=user?!!await db().prepare('SELECT user_id FROM customers WHERE user_id=?').bind(user.userId).first():false;
 return {user:user?{name:user.fullName||'Reader',admin:isAdmin(user)}:null, member:member.active, billing:config(), subscription:sub?{status:sub.status,periodEnd:sub.period_end,cancelAtPeriodEnd:!!sub.cancel_at_period_end}:null, stories:all.map((s:any)=>publicStory(s,member.active)),saved,hasBillingAccount};
}
export async function rateLimit(key:string,max:number,window=3600){
 const bucket=Math.floor(now()/window)*window;
 const r:any=await db().prepare('INSERT INTO rate_limits(key,bucket,count) VALUES(?,?,1) ON CONFLICT(key,bucket) DO UPDATE SET count=count+1 RETURNING count').bind(key,bucket).first();
 if(Number(r.count)>max) throw new HttpError(429,'Too many requests. Please try again later.');
 // Bounded storage: remove old rate-limit buckets after each bounded write.
 await db().prepare('DELETE FROM rate_limits WHERE bucket < ?').bind(now()-172800).run();
}
export class HttpError extends Error{constructor(public status:number,message:string){super(message)}}
export function requireOrigin(request:Request){const expected=env.SITE_ORIGIN||new URL(request.url).origin; if(request.headers.get('origin')!==expected)throw new HttpError(403,'Please submit from Narrify.');}
