import Stripe from 'stripe';
import { env } from 'cloudflare:workers';
import { db, now, HttpError } from './server';
import { validPrice } from './policy.mjs';
export function stripe(){if(!env.STRIPE_SECRET_KEY)throw new HttpError(503,'Membership checkout is not open yet.');return new Stripe(env.STRIPE_SECRET_KEY,{httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:1,timeout:15000});}
export async function checkedPrice(){const p=await stripe().prices.retrieve(env.STRIPE_PRICE_ID!); if(!validPrice(p)||!p.livemode)throw new HttpError(503,'Membership checkout is awaiting configuration.');return p;}
export async function customer(user:any){
 let r:any=await db().prepare('SELECT * FROM customers WHERE user_id=?').bind(user.userId).first();
 if(!r){const c=await stripe().customers.create({email:user.email,metadata:{narrify_user_id:user.userId}},{idempotencyKey:'narrify-customer-'+user.userId});await db().prepare('INSERT INTO customers(user_id,customer_id) VALUES(?,?) ON CONFLICT(user_id) DO NOTHING').bind(user.userId,c.id).run();r=await db().prepare('SELECT * FROM customers WHERE user_id=?').bind(user.userId).first();}
 return r;
}
export async function syncSubscription(subscription:Stripe.Subscription){
 const s:any=subscription;
 const customerId=typeof s.customer==='string'?s.customer:s.customer.id;
 const account:any=await db().prepare('SELECT user_id FROM customers WHERE customer_id=?').bind(customerId).first();
 // Never attach entitlement from an arbitrary metadata user ID or a checkout redirect.
 if(!account)return;
 const items=s.items?.data||[];
 const item=items.find((i:any)=>i.price?.id===env.STRIPE_PRICE_ID);
 const periodEnd=Number(item?.current_period_end||s.current_period_end||0);
 const eligible=item && validPrice(item.price) && s.livemode===true && items.length===1 && item.quantity===1;
 await db().prepare('INSERT INTO subscriptions(id,user_id,customer_id,price_id,status,period_end,cancel_at_period_end,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,period_end=excluded.period_end,cancel_at_period_end=excluded.cancel_at_period_end,updated_at=excluded.updated_at,price_id=excluded.price_id').bind(s.id,account.user_id,customerId,item?.price?.id||'',eligible?s.status:'ineligible',periodEnd,s.cancel_at_period_end?1:0,now()).run();
}
export async function reconcile(userId:string){
 const c:any=await db().prepare('SELECT customer_id FROM customers WHERE user_id=?').bind(userId).first();
 if(!c||!env.STRIPE_SECRET_KEY)return;
 const result=await stripe().subscriptions.list({customer:c.customer_id,status:'all',limit:100});
 for(const s of result.data)await syncSubscription(s);
}
