import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Stripe from 'stripe';
import {createHash} from 'node:crypto';
import {validPrice,activeSubscription,publicStory,validateStory} from '../lib/policy.mjs';
import {verifyWebhook} from '../lib/webhook.mjs';
import {DatabaseSync} from 'node:sqlite';
import {STORY_LANGUAGES,storyLanguage,normalizeSearch,filterStories} from '../lib/languages.mjs';
import {CYPRUS_BOUNDS,withinCyprusBounds,publicMapPoint} from '../lib/location.mjs';
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
 for(const s of all){const source=original.records.find(x=>x.id===s.id);assert.equal(source.status,'approved');assert.equal(s.language,'en');assert.equal(source.content_sha256,createHash('sha256').update(s.content).digest('hex'));assert.ok(!original.excluded_ids.includes(source.id));assert.ok(!('email' in s));}
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
test('story languages are validated without changing original multilingual text',()=>{
 const base={title:'A village story',content:'A shared memory from our village in Cyprus. '.repeat(4),author:'Anonymous',place:'Lefkara',latitude:34.86,longitude:33.3,category:'heritage',consent:true};
 for(const language of STORY_LANGUAGES){
  const text='Μνήμες · Köyümüz · حكاية · זיכרון · Память · Հիշողություն\n'.repeat(3);
  const result=validateStory({...base,language:language.code,content:text});
  assert.equal(result.language,language.code);assert.equal(result.content,text.trim());
 }
 assert.equal(validateStory(base).language,'und');
 for(const language of ['invented','EN','',null,{},['en']])assert.throws(()=>validateStory({...base,language}));
 assert.throws(()=>validateStory({...base,language:'ar',consent:false}));
 assert.equal(storyLanguage(undefined).code,'und');assert.equal(storyLanguage('unknown').code,'und');
});
test('search accepts Greek accents, composed Unicode, final sigma and Turkish letter variants',()=>{
 for(const [first,second] of [['Κύπρος','κυπροσ'],['ΛΕΥΚΩΣΊΑ','λευκωσια'],['İstanbul','istanbul'],['Kıbrıs','kibris'],['Λέξη','Λέξη']])assert.equal(normalizeSearch(first),normalizeSearch(second));
 const stories=[{id:'el',language:'el',title:'Μνήμες της Κύπρου',place:'Λευκωσία',excerpt:'Μια ιστορία',author:'Άννα'}];
 assert.deepEqual(filterStories(stories,{query:'  ΛΕΥΚΩΣΙΑ  μνημες anna ' }),[]);
 assert.equal(filterStories(stories,{query:'  ΛΕΥΚΩΣΙΑ  μνημες αννα '})[0].id,'el');
 assert.equal(stories[0].title,'Μνήμες της Κύπρου');
});
test('language, category, free preview and saved filters work together',()=>{
 const records=[
  {id:'a',language:'el',title:'Κύπρος',place:'Λευκωσία',category:'heritage',preview:true},
  {id:'b',language:'el-CY',title:'Κύπρος',place:'Λεμεσός',category:'heritage',preview:false},
  {id:'c',language:'tr',title:'Kıbrıs',place:'Lefkoşa',category:'food',preview:true},
  {id:'d',title:'An earlier story',place:'Paphos',category:'heritage',preview:true},
 ];
 const ids=options=>filterStories(records,options).map(s=>s.id);
 assert.deepEqual(ids({language:'el'}),['a','b']);assert.deepEqual(ids({language:'el-CY'}),['b']);
 assert.deepEqual(ids({language:'el',category:'heritage',previewsOnly:true,savedOnly:true,saved:['a','b']}),['a']);
 assert.deepEqual(ids({language:'tr',query:'kibris lefkosa',previewsOnly:true}),['c']);
 assert.deepEqual(ids({language:'und'}),['d']);assert.deepEqual(ids({language:'ar'}),[]);
 assert.deepEqual(ids({previewsOnly:true}),['a','c','d']);assert.equal(ids({}).length,4);
});
test('language metadata and search never expose member-only story bodies',()=>{
 const content='Public introduction. '.repeat(10)+'hidden-members-only-sentence';
 const publicEntry=publicStory({id:'member',title:'A story',language:'ar',content,preview:false},false);
 assert.equal(publicEntry.language,'ar');assert.equal(publicEntry.locked,true);
 assert.deepEqual(filterStories([publicEntry],{query:'hidden-members-only-sentence'}),[]);
 assert.equal(filterStories([publicEntry],{language:'ar'}).length,1);
 assert.equal('content' in publicEntry,false);
});
test('language migration preserves old contributions and accepts new right-to-left text',()=>{
 const database=new DatabaseSync(':memory:');
 try{
  database.exec(fs.readFileSync(new URL('../drizzle/0000_chunky_korvac.sql',import.meta.url),'utf8'));
  const insert=database.prepare('INSERT INTO submissions(id,user_id,title,content,category,latitude,longitude,author,place,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)');
  insert.run('old','local-qa','Earlier story','Original text','heritage',35.17,33.36,'A name','Nicosia','pending',1);
  database.exec(fs.readFileSync(new URL('../drizzle/0001_clear_young_avengers.sql',import.meta.url),'utf8'));
  const old=database.prepare('SELECT language,content,status FROM submissions WHERE id=?').get('old');
  assert.equal(old.language,'und');assert.equal(old.content,'Original text');assert.equal(old.status,'pending');
  insert.run('rtl','local-qa','حكاية القرية','هذه حكاية من القرية','oral_history',35.17,33.36,'راوٍ','قبرص','pending',2);
  database.prepare('UPDATE submissions SET language=? WHERE id=?').run('ar','rtl');
  const rtl=database.prepare('SELECT language,content,status FROM submissions WHERE id=?').get('rtl');
  assert.equal(rtl.language,'ar');assert.equal(rtl.content,'هذه حكاية من القرية');assert.equal(rtl.status,'pending');
  assert.equal(database.prepare("SELECT count(*) AS n FROM submissions WHERE status='approved'").get().n,0);
 }finally{database.close();}
});
test('public map selections are bounded and rounded without collecting a device location',()=>{
 assert.deepEqual(publicMapPoint(35.1738642,33.3647234),{latitude:35.174,longitude:33.365});
 assert.ok(withinCyprusBounds(CYPRUS_BOUNDS.south,CYPRUS_BOUNDS.west));
 assert.ok(withinCyprusBounds(CYPRUS_BOUNDS.north,CYPRUS_BOUNDS.east));
 for(const [lat,lng] of [[34.399,33.3],[35.801,33.3],[35.1,32.099],[35.1,34.701],[NaN,33.3],[35.1,Infinity],[null,33.3],['35.1',33.3]])assert.equal(publicMapPoint(lat,lng),null);
});
test('map-selected and manually-entered coordinates share server validation',()=>{
 const story={title:'A village story',content:'An original memory from a village in Cyprus. '.repeat(4),author:'Anonymous',place:'Lefkara',category:'heritage',consent:true,language:'el'};
 const picked=publicMapPoint(34.866423,33.305412);
 assert.deepEqual([validateStory({...story,...picked}).latitude,validateStory({...story,...picked}).longitude],[34.866,33.305]);
 assert.equal(validateStory({...story,latitude:'34.866',longitude:'33.305'}).latitude,34.866);
 for(const patch of [{latitude:'',longitude:''},{latitude:'34.3',longitude:'33.3'},{latitude:'35.1',longitude:'34.8'}])assert.throws(()=>validateStory({...story,...patch}));
});
