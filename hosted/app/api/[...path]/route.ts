import { env } from 'cloudflare:workers';
import Stripe from 'stripe';
import { verifyWebhook } from '../../../lib/webhook.mjs';
import { identity, isAdmin, config, db, now, stories, entitlement, initialData, rateLimit, HttpError, requireOrigin } from '../../../lib/server';
import { stripe, checkedPrice, customer, syncSubscription, reconcile } from '../../../lib/billing';
import { publicStory, validateStory } from '../../../lib/policy.mjs';
export const dynamic='force-dynamic';
const json=(v:any,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
async function body(req:Request){const raw=await req.text();if(raw.length>18000)throw new HttpError(413,'That request is too large.');try{return JSON.parse(raw)}catch{throw new HttpError(400,'Invalid request.')}}
async function handle(req:Request){
 try{
 const path=new URL(req.url).pathname.replace(/^\/api\//,'');
 // Signature validation is independent of visitor identity and origin checks.
 if(path==='billing/webhook' && req.method==='POST'){
  if(!env.STRIPE_WEBHOOK_SECRET||!env.STRIPE_SECRET_KEY)return json({error:'Webhook is not configured.'},503);
  const raw=await req.text(); if(raw.length>250000)return json({error:'Too large'},413);
  let event:Stripe.Event;
  try{event=await verifyWebhook(raw,req.headers.get('stripe-signature')||'',env.STRIPE_WEBHOOK_SECRET);}catch{return json({error:'Invalid webhook signature.'},400)}
  if(!event.livemode)return json({error:'Live events only.'},400);
  if(await db().prepare('SELECT id FROM stripe_events WHERE id=?').bind(event.id).first())return json({received:true});
  const obj:any=event.data.object;
  let subscriptionId:string|undefined;
  if(event.type.startsWith('customer.subscription.'))subscriptionId=obj.id;
  if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded')subscriptionId=typeof obj.subscription==='string'?obj.subscription:obj.subscription?.id;
  if(event.type==='invoice.paid'||event.type==='invoice.payment_failed')subscriptionId=typeof obj.subscription==='string'?obj.subscription:(obj.parent?.subscription_details?.subscription||undefined);
  if(subscriptionId){const current=await stripe().subscriptions.retrieve(subscriptionId);await syncSubscription(current);}
  // Mark only after processing; retries safely upsert current Stripe state.
  await db().prepare('INSERT OR IGNORE INTO stripe_events(id,processed_at) VALUES(?,?)').bind(event.id,now()).run();
  return json({received:true});
 }
 if(req.method!=='GET')requireOrigin(req);
 const user=await identity();
 const requireUser=()=>{if(!user)throw new HttpError(401,'Sign in to continue.');return user;};
 if(path==='status'&&req.method==='GET')return json(await initialData());
 if(path==='health'&&req.method==='GET'){await db().prepare('SELECT 1').first();return json({ok:true,billingOpen:config().billingEnabled});}
 if(path==='stories'&&req.method==='GET'){const m=user?await entitlement(user.userId):{active:false};return json((await stories()).map((s:any)=>publicStory(s,m.active)));}
 if(path.startsWith('stories/')&&req.method==='GET'){
  const story=(await stories()).find((s:any)=>s.id===decodeURIComponent(path.slice(8)));
  if(!story)throw new HttpError(404,'Story not found.');
  const m=user?await entitlement(user.userId):{active:false};
  if(!story.preview&&!m.active)return json({error:'Membership is needed to read this story.',story:publicStory(story,false)},402);
  return json(story);
 }
 if(path==='billing/checkout'&&req.method==='POST'){
  const u=requireUser();if(!config().billingEnabled)throw new HttpError(503,'Membership checkout is not open yet. No payment has been taken.');
  await rateLimit('checkout:'+u.userId,10);
  const p=await checkedPrice();await reconcile(u.userId);
  if((await entitlement(u.userId)).active)throw new HttpError(409,'You already have an active membership.');
  const c=await customer(u);
  const pending=await db().prepare("SELECT id FROM subscriptions WHERE user_id=? AND status IN ('past_due','unpaid','incomplete','trialing','paused') LIMIT 1").bind(u.userId).first();
  if(pending)throw new HttpError(409,'A membership already exists. Manage it from My account before starting another.');
  // A customer can have one unfinished Checkout at a time; reuse it on retries.
  if(c.checkout_id&&c.checkout_expires>now()){
   const existing=await stripe().checkout.sessions.retrieve(c.checkout_id);
   if(existing.status==='open'&&existing.url)return json({url:existing.url});
   if(existing.status==='complete')throw new HttpError(409,'Your payment is being confirmed. Refresh your membership status.');
  }
  const session=await stripe().checkout.sessions.create({mode:'subscription',customer:c.customer_id,line_items:[{price:p.id,quantity:1}],client_reference_id:u.userId,subscription_data:{metadata:{narrify_user_id:u.userId}},success_url:env.SITE_ORIGIN+'/?checkout=success',cancel_url:env.SITE_ORIGIN+'/?checkout=cancelled',allow_promotion_codes:false,automatic_tax:{enabled:false}},{idempotencyKey:'narrify-checkout-'+u.userId+'-'+Math.floor(now()/1800)});
  await db().prepare('UPDATE customers SET checkout_id=?,checkout_expires=? WHERE user_id=?').bind(session.id,session.expires_at,u.userId).run();
  return json({url:session.url});
 }
 if(path==='billing/refresh'&&req.method==='POST'){const u=requireUser();await rateLimit('refresh:'+u.userId,30);await reconcile(u.userId);return json(await initialData());}
 if(path==='billing/portal'&&req.method==='POST'){
  const u=requireUser();await rateLimit('portal:'+u.userId,20);const c:any=await db().prepare('SELECT customer_id FROM customers WHERE user_id=?').bind(u.userId).first();if(!c)throw new HttpError(404,'No billing account exists yet.');
  const s=await stripe().billingPortal.sessions.create({customer:c.customer_id,return_url:env.SITE_ORIGIN+'/#membership'});return json({url:s.url});
 }
 if(path==='saved'&&req.method==='POST'){
  const u=requireUser();if(!(await entitlement(u.userId)).active)throw new HttpError(402,'Saved stories are included with membership.');await rateLimit('save:'+u.userId,200);const b=await body(req);
  if(!(await stories()).some((s:any)=>s.id===b.storyId))throw new HttpError(404,'Story not found.');
  if(b.saved===true)await db().prepare('INSERT OR IGNORE INTO favorites(user_id,story_id) VALUES(?,?)').bind(u.userId,b.storyId).run();else await db().prepare('DELETE FROM favorites WHERE user_id=? AND story_id=?').bind(u.userId,b.storyId).run();return json({ok:true});
 }
 if(path==='contributions'&&req.method==='POST'){
  const u=requireUser();await rateLimit('submit:'+u.userId,5,86400);let s;try{s=validateStory(await body(req))}catch(e:any){throw new HttpError(400,e.message)}
  await db().prepare("INSERT INTO submissions(id,user_id,title,content,category,latitude,longitude,author,place,source_url,language,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,'pending',?)").bind(crypto.randomUUID(),u.userId,s.title,s.content,s.category,s.latitude,s.longitude,s.author,s.place,s.sourceUrl||null,s.language,now()).run();return json({message:'Thank you. Your story is waiting for human review.'},201);
 }
 if(path==='admin/submissions'&&req.method==='GET'){
  requireUser();if(!isAdmin(user))throw new HttpError(403,'Moderator access required.');const r=await db().prepare('SELECT id,title,content,category,latitude,longitude,author,place,source_url,language,status,created_at FROM submissions ORDER BY created_at DESC LIMIT 100').all();return json(r.results);
 }
 if(path==='admin/review'&&req.method==='POST'){
  const u=requireUser();if(!isAdmin(u))throw new HttpError(403,'Moderator access required.');const b=await body(req);if(!['approved','rejected','pending'].includes(b.status))throw new HttpError(400,'Choose a review decision.');const r=await db().prepare('UPDATE submissions SET status=?,reviewed_by=? WHERE id=?').bind(b.status,u.userId,b.id).run();if(!r.meta.changes)throw new HttpError(404,'Contribution not found.');return json({ok:true});
 }
 throw new HttpError(404,'Page not found.');
 }catch(e:any){if(e instanceof HttpError)return json({error:e.message},e.status);console.error('Narrify API failure',e?.name||'Error');return json({error:'The request could not be completed. Please try again.'},500);}
}
export const GET=handle;
export const POST=handle;
