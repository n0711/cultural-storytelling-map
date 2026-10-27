// Interface language only. Story text always stays in its contributed language.
export const LOCALES = ['en','el','tr'];
export const DEFAULT_LOCALE = 'en';
export const LOCALE_COOKIE = 'narrify_lang';
export const LOCALE_COOKIE_MAX_AGE = 60*60*24*365;
export function supportedLocale(value) {
 const base=String(value??'').trim().toLowerCase().split(/[-_]/)[0];
 return LOCALES.includes(base)?base:null;
}
export function cookieValue(header,name=LOCALE_COOKIE) {
 for(const part of String(header??'').split(';')){const i=part.indexOf('=');if(i>0&&part.slice(0,i).trim()===name)return part.slice(i+1).trim();}
 return null;
}
// Highest-quality supported language wins; ties keep header order.
export function acceptedLocale(header) {
 const ranked=String(header??'').split(',').map((part,index)=>{const [tag,...params]=part.trim().split(';');const q=params.map(p=>p.trim()).find(p=>p.startsWith('q='));return {tag,index,q:q?Number(q.slice(2)):1};}).filter(item=>item.tag&&item.q>0).sort((a,b)=>b.q-a.q||a.index-b.index);
 for(const item of ranked){const locale=supportedLocale(item.tag);if(locale)return locale;}
 return null;
}
/** @param {{cookie?:string|null,query?:string|null,acceptLanguage?:string|null}} [sources] */
export function negotiateLocale({cookie=null,query=null,acceptLanguage=null}={}) {
 return supportedLocale(cookie)||supportedLocale(query)||acceptedLocale(acceptLanguage)||DEFAULT_LOCALE;
}
export function localeFromRequest(request) {
 return negotiateLocale({cookie:cookieValue(request.headers.get('cookie')),query:new URL(request.url).searchParams.get('lang'),acceptLanguage:request.headers.get('accept-language')});
}
export function interpolate(text,vars={}) {
 return String(text).replace(/\{(\w+)\}/g,(match,name)=>Object.prototype.hasOwnProperty.call(vars,name)?String(vars[name]):match);
}
// Messages: {en:{key:'Text {name}'|{one:'…',other:'…'}}, el:{…}, tr:{…}}. Missing keys fall back to English, then to the key.
export function createTranslator(messages,locale=DEFAULT_LOCALE) {
 const lang=supportedLocale(locale)||DEFAULT_LOCALE;
 const plural=new Intl.PluralRules(lang);
 return function t(key,vars={}) {
  let value=messages?.[lang]?.[key]??messages?.[DEFAULT_LOCALE]?.[key];
  if(value===undefined)return key;
  if(typeof value==='object')value=value[plural.select(Number(vars.count))]??value.other;
  return interpolate(value,vars);
 };
}
export function formatDate(date,locale=DEFAULT_LOCALE,options={dateStyle:'medium',timeZone:'UTC'}) {
 const lang=supportedLocale(locale)||DEFAULT_LOCALE;
 return new Date(date).toLocaleDateString(lang==='en'?'en-GB':lang,options);
}
