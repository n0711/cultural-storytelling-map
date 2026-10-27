import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LOCALES,negotiateLocale,acceptedLocale,cookieValue,createTranslator,formatDate,localeFromRequest} from '../lib/i18n/core.mjs';
import {STORY_LANGUAGES,languageLabel} from '../lib/languages.mjs';
// Every message and legal file is discovered here, so new namespaces are checked without editing this test.
const load=async dir=>Promise.all(fs.readdirSync(new URL(dir,import.meta.url)).filter(f=>f.endsWith('.mjs')).sort().map(async f=>[f,(await import(new URL(dir+f,import.meta.url))).default]));
const placeholders=text=>[...String(text).matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
const links=text=>[...String(text).matchAll(/\]\(([^)\s]+)\)/g)].map(m=>m[1]);
const forms=value=>typeof value==='string'?[value]:Object.values(value);
test('every message namespace has the same keys, plural forms and placeholders in each interface language',async()=>{
 const files=await load('../lib/i18n/messages/');
 assert.ok(files.length>0);
 for(const [file,messages] of files){
  assert.deepEqual(Object.keys(messages).sort(),[...LOCALES].sort(),file+' must define en, el and tr');
  const keys=Object.keys(messages.en).sort();
  for(const locale of LOCALES){
   assert.deepEqual(Object.keys(messages[locale]).sort(),keys,`${file} ${locale} keys differ from en`);
   for(const key of keys){
    const value=messages[locale][key],english=messages.en[key];
    assert.equal(typeof value,typeof english,`${file} ${locale} ${key} shape`);
    if(typeof value==='object')assert.ok(typeof value.other==='string',`${file} ${locale} ${key} needs an "other" plural form`);
    // Plural forms may drop {count} ("One story"), so each form's placeholders must come from the English ones.
    const allowed=new Set(placeholders(forms(english).join(' ')));
    for(const form of forms(value)){assert.ok(form.trim(),`${file} ${locale} ${key} is empty`);for(const name of placeholders(form))assert.ok(allowed.has(name),`${file} ${locale} ${key} uses unknown placeholder {${name}}`);}
    if(typeof value==='string')assert.deepEqual([...new Set(placeholders(value))],[...allowed].sort(),`${file} ${locale} ${key} placeholders`);
   }
  }
 }
});
test('legal translations keep the English structure, links and placeholders',async()=>{
 const files=await load('../content/legal/');
 assert.deepEqual(files.map(([f])=>f),['about.mjs','privacy.mjs','terms.mjs']);
 for(const [file,doc] of files){
  const en=doc.en;assert.ok(en.title&&en.sections.length,file+' needs English text');
  for(const locale of Object.keys(doc)){
   assert.ok(LOCALES.includes(locale),`${file} has unknown locale ${locale}`);
   const d=doc[locale];assert.ok(d.title.trim(),`${file} ${locale} title`);
   assert.deepEqual(Object.keys(d.vars||{}).sort(),Object.keys(en.vars||{}).sort(),`${file} ${locale} vars`);
   for(const k of Object.keys(en.vars||{}))assert.deepEqual(placeholders(d.vars[k]),placeholders(en.vars[k]),`${file} ${locale} vars.${k}`);
   assert.equal(d.sections.length,en.sections.length,`${file} ${locale} section count`);
   d.sections.forEach((s,i)=>{
    assert.ok(s.heading.trim(),`${file} ${locale} section ${i} heading`);
    assert.equal(s.paragraphs.length,en.sections[i].paragraphs.length,`${file} ${locale} section ${i} paragraph count`);
    s.paragraphs.forEach((p,j)=>{const e=en.sections[i].paragraphs[j];assert.ok(p.trim());assert.deepEqual(placeholders(p),placeholders(e),`${file} ${locale} ${i}.${j} placeholders`);assert.deepEqual(links(p),links(e),`${file} ${locale} ${i}.${j} links`);});
   });
  }
 }
});
test('the interface language follows the saved choice, then a link, then the browser, then English',()=>{
 assert.equal(negotiateLocale(),'en');
 assert.equal(negotiateLocale({cookie:'tr',query:'el',acceptLanguage:'el'}),'tr');
 assert.equal(negotiateLocale({cookie:'xx',query:'el-GR',acceptLanguage:'tr'}),'el');
 assert.equal(negotiateLocale({acceptLanguage:'de-DE,tr;q=0.8,el;q=0.9'}),'el');
 assert.equal(negotiateLocale({acceptLanguage:'fr, de;q=0.5'}),'en');
 assert.equal(acceptedLocale('el;q=0, tr-CY'),'tr');
 assert.equal(acceptedLocale('en-US,en;q=0.9,el;q=0.8'),'en');
 assert.equal(cookieValue('a=1; narrify_lang=el; b=2'),'el');
 assert.equal(cookieValue('narrify_language=el'),null);
 const request=new Request('https://narrify.test/api/status?lang=tr',{headers:{'accept-language':'el'}});
 assert.equal(localeFromRequest(request),'tr');
 assert.equal(localeFromRequest(new Request('https://narrify.test/',{headers:{cookie:'narrify_lang=el','accept-language':'tr'}})),'el');
});
test('translators interpolate, pluralise and fall back to English without exposing undefined',()=>{
 const messages={en:{hello:'Hello, {name}.',count:{one:'{count} story',other:'{count} stories'},only:'English only'},el:{hello:'Γεια σου, {name}.',count:{one:'{count} ιστορία',other:'{count} ιστορίες'}},tr:{hello:'Merhaba {name}.',count:{other:'{count} hikâye'}}};
 const en=createTranslator(messages,'en'),el=createTranslator(messages,'el'),tr=createTranslator(messages,'tr');
 assert.equal(en('hello',{name:'Ada'}),'Hello, Ada.');
 assert.equal(el('count',{count:1}),'1 ιστορία');
 assert.equal(el('count',{count:3}),'3 ιστορίες');
 assert.equal(tr('count',{count:1}),'1 hikâye');
 assert.equal(el('only'),'English only');
 assert.equal(el('missing.key'),'missing.key');
 assert.equal(en('hello'),'Hello, {name}.');
 assert.equal(createTranslator(messages,'de')('hello',{name:'Ada'}),'Hello, Ada.');
 assert.equal(formatDate('2026-10-27T12:00:00Z','en'),'27 Oct 2026');
 assert.match(formatDate('2026-10-27T12:00:00Z','el'),/27 Οκτ/);
 assert.match(formatDate('2026-10-27T12:00:00Z','tr'),/27 Eki 2026/);
});
test('story language labels stay endonym-first and English output is unchanged',()=>{
 for(const item of STORY_LANGUAGES)assert.equal(languageLabel(item.code,'en'),item.label);
 assert.equal(languageLabel('el','el'),'Ελληνικά');
 assert.equal(languageLabel('tr','el'),'Türkçe · Τουρκικά');
 assert.equal(languageLabel('el-CY','tr'),'Κυπριακά Ελληνικά · Kıbrıs Rumcası');
 assert.equal(languageLabel('tr','tr'),'Türkçe');
 assert.equal(languageLabel('und','tr'),'Diğer / belirtilmemiş');
 assert.equal(languageLabel('xx','el'),'Άλλη / δεν δηλώθηκε');
});
