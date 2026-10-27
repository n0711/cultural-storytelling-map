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
import {ownContributions} from '../lib/contributions.mjs';
import vm from 'node:vm';
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
function contributionDatabase(){
 const database=new DatabaseSync(':memory:');
 database.exec(fs.readFileSync(new URL('../drizzle/0000_chunky_korvac.sql',import.meta.url),'utf8'));
 database.exec(fs.readFileSync(new URL('../drizzle/0001_clear_young_avengers.sql',import.meta.url),'utf8'));
 const adapter={prepare(query){const statement=database.prepare(query);return {bind(...args){return {async all(){return {results:statement.all(...args)}}}}}}};
 const insert=database.prepare('INSERT INTO submissions(id,user_id,title,content,category,latitude,longitude,author,place,language,status,created_at,reviewed_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)');
 function add(id,userId,status,createdAt){insert.run(id,userId,'A village memory','A public opening. '.repeat(15)+'PRIVATE-BODY-END','oral_history',35.17,33.36,'A storyteller','Nicosia','ar',status,createdAt,'private-moderator-id');}
 return {database,adapter,add};
}
test('contributors see their own review states without another account or private database fields',async()=>{
 const {database,adapter,add}=contributionDatabase();
 try{
  add('alice-pending','alice','pending',1000);add('alice-approved','alice','approved',1001);add('alice-rejected','alice','rejected',1002);add('bob-pending','bob','pending',1003);
  const rows=await ownContributions(adapter,'alice');
  assert.deepEqual(rows.map(row=>row.id),['alice-rejected','alice-approved','alice-pending']);
  assert.deepEqual(rows.map(row=>row.status),['rejected','approved','pending']);
  assert.equal((await ownContributions(adapter,'bob'))[0].id,'bob-pending');
  for(const row of rows){
   assert.equal(row.language,'ar');assert.equal(row.place,'Nicosia');assert.ok(row.excerpt.length<=151);
   for(const key of ['user_id','reviewed_by','latitude','longitude','content','source_url'])assert.ok(!(key in row));
   assert.ok(!JSON.stringify(row).includes('PRIVATE-BODY-END'));assert.ok(!JSON.stringify(row).includes('private-moderator-id'));
  }
 }finally{database.close();}
});
test('contribution history is bounded, parameterized and requires an account identity',async()=>{
 const {database,adapter,add}=contributionDatabase();
 try{
  for(let index=0;index<55;index++)add('a'+index,'alice','pending',1000+index);
  const rows=await ownContributions(adapter,'alice');assert.equal(rows.length,50);assert.equal(rows[0].id,'a54');assert.equal(rows[49].id,'a5');
  assert.deepEqual(await ownContributions(adapter,"alice' OR '1'='1"),[]);
  assert.deepEqual(await ownContributions(adapter,'unrelated-account'),[]);
  for(const id of ['',null,undefined,{},'   '])await assert.rejects(ownContributions(adapter,id));
 }finally{database.close();}
});
test('the install manifest opens the mobile app with valid launcher icons',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
 assert.equal(manifest.id,'/app');assert.equal(manifest.start_url,'/app');assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons){
  const bytes=fs.readFileSync(new URL('../public'+icon.src,import.meta.url));
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(icon.sizes,bytes.readUInt32BE(16)+'x'+bytes.readUInt32BE(20));
 }
});
test('offline reading contains exactly the three approved free previews',()=>{
 const html=fs.readFileSync(new URL('../public/offline.html',import.meta.url),'utf8');
 const all=JSON.parse(fs.readFileSync(new URL('../data/stories.server.json',import.meta.url),'utf8'));
 const escape=value=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 assert.equal((html.match(/<details>/g)||[]).length,3);
 for(const story of all){
  if(story.preview){assert.ok(html.includes(escape(story.title)));for(const paragraph of story.content.split('\n').filter(Boolean))assert.ok(html.includes(escape(paragraph)));}
  else assert.ok(!html.includes(escape(story.title)),story.title);
 }
 assert.ok(!html.includes('signin-with-chatgpt'));assert.ok(!html.includes('stripe'));
});
function serviceWorkerFixture(offline=false){
 const handlers={},cached=[],deleted=[],network=[];
 const environment={URL,Response,self:{location:{origin:'https://narrify.example'},addEventListener(name,fn){handlers[name]=fn},async skipWaiting(){},clients:{async claim(){}}},caches:{async open(){return {async addAll(paths){cached.push(...paths)}}},async keys(){return ['narrify-public-old','another-app-cache','narrify-public-v1']},async delete(key){deleted.push(key)},async match(){return new Response('public offline previews')}},async fetch(request){network.push(request);if(offline)throw new Error('Offline');return new Response('personalized online page')}};
 vm.runInNewContext(fs.readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),environment);
 return {handlers,cached,deleted,network};
}
test('the service worker caches public files and excludes API, identity and payment traffic',async()=>{
 const fixture=serviceWorkerFixture();let complete;
 fixture.handlers.install({waitUntil(promise){complete=promise}});await complete;
 assert.deepEqual(fixture.cached,['/offline.html','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png','/favicon.svg']);
 fixture.handlers.activate({waitUntil(promise){complete=promise}});await complete;
 assert.deepEqual(fixture.deleted,['narrify-public-old']);
 for(const path of ['/api/stories/1','/api/contributions','/api/billing/checkout','/signin-with-chatgpt','/signout-with-chatgpt','/callback']){
  let intercepted=false;fixture.handlers.fetch({request:{url:'https://narrify.example'+path,method:'GET',mode:'navigate'},respondWith(){intercepted=true}});assert.equal(intercepted,false,path);
 }
});
test('online app navigations stay network-only and offline fallback is public preview text',async()=>{
 for(const offline of [false,true]){
  const fixture=serviceWorkerFixture(offline);let response;
  fixture.handlers.fetch({request:{url:'https://narrify.example/app?contributions=1',method:'GET',mode:'navigate'},respondWith(promise){response=promise}});
  assert.equal(await (await response).text(),offline?'public offline previews':'personalized online page');
  assert.equal(fixture.network.length,1);assert.deepEqual(fixture.cached,[]);
 }
});
