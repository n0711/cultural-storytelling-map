import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Stripe from 'stripe';
import {createHash} from 'node:crypto';
import {validPrice,activeSubscription,publicStory,validateStory} from '../lib/policy.mjs';
import {verifyWebhook} from '../lib/webhook.mjs';
const price={active:true,currency:'eur',unit_amount:199,type:'recurring',recurring:{interval:'month',interval_count:1,usage_type:'licensed'},billing_scheme:'per_unit'};
test('only a fixed €1.99 monthly EUR price passes the checkout price boundary',()=>{
 assert.equal(validPrice(price),true);
 for(const patch of [{currency:'usd'},{unit_amount:1990},{unit_amount:1},{active:false},{type:'one_time'},{billing_scheme:'tiered'},{recurring:{interval:'year',interval_count:1}},{recurring:{interval:'month',interval_count:2}},{recurring:{interval:'month',interval_count:1,usage_type:'metered'}}])assert.equal(validPrice({...price,...patch}),false,JSON.stringify(patch));
});
test('failed, expired, trial and cancellation states do not unlock paid text',()=>{
 const t=1000000;
 assert.equal(activeSubscription({status:'active',period_end:t+1},t),true);
 assert.equal(activeSubscription({status:'active',period_end:t,cancel_at_period_end:1},t),false);
 for(const status of ['canceled','past_due','unpaid','trialing','incomplete','incomplete_expired','paused','ineligible'])assert.equal(activeSubscription({status,period_end:t+999},t),false,status);
 assert.equal(activeSubscription(null,t),false);
});
test('public catalogue cannot leak full paid story bodies',()=>{
 const text='unique paid paragraph '.repeat(100);
 const s={id:'paid',title:'Title',content:text,preview:false};
 const v=publicStory(s,false);assert.equal(v.locked,true);assert.equal('content' in v,false);assert.ok(v.excerpt.length<=151);assert.ok(!JSON.stringify(v).includes(text));
 assert.equal(publicStory({...s,preview:true},false).locked,false);
});
test('the hosted collection contains only curated approved records and three free previews',()=>{
 const all=JSON.parse(fs.readFileSync(new URL('../data/stories.server.json',import.meta.url)));
 const original=JSON.parse(fs.readFileSync(new URL('../data/collection-provenance.json',import.meta.url)));
 assert.equal(all.length,11);assert.equal(all.filter(s=>s.preview).length,3);
 for(const s of all){const source=original.records.find(x=>x.id===s.id);assert.equal(source.status,'approved');assert.equal(source.content_sha256,createHash('sha256').update(s.content).digest('hex'));assert.ok(!original.excluded_ids.includes(source.id));assert.ok(!('email' in s));}
});
test('submissions require permission, bounded text and a finite Cyprus location',()=>{
 const good={title:'A village story',content:'An original memory from a village in Cyprus. '.repeat(4),author:'Anonymous',place:'Lefkara',latitude:34.86,longitude:33.3,category:'heritage',consent:true};
 assert.equal(validateStory(good).place,'Lefkara');
 for(const patch of [{consent:false},{content:'short'},{latitude:NaN},{longitude:70},{latitude:''},{category:'other'},{sourceUrl:'javascript:alert(1)'},{title:'x'.repeat(141)}])assert.throws(()=>validateStory({...good,...patch}));
});
test('real webhook verifier rejects forged, stale or transformed payloads',async()=>{
 const signing=new Stripe('sk_test_local_only');const secret='whsec_unit_test_only';
 const payload=JSON.stringify({id:'evt_example',object:'event',type:'customer.subscription.updated',data:{object:{id:'sub_example'}}});
 const header=signing.webhooks.generateTestHeaderString({payload,secret});
 assert.equal((await verifyWebhook(payload,header,secret)).id,'evt_example');
 await assert.rejects(verifyWebhook(payload+' ',header,secret));
 await assert.rejects(verifyWebhook(payload,header,'whsec_wrong'));
 await assert.rejects(verifyWebhook(payload,signing.webhooks.generateTestHeaderString({payload,secret,timestamp:Math.floor(Date.now()/1000)-600}),secret));
});
