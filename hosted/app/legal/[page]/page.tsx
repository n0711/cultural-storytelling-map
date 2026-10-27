import { notFound } from 'next/navigation';
import { config } from '../../../lib/server';
import { getLocale } from '../../../lib/i18n/server';
import { createTranslator, interpolate } from '../../../lib/i18n/core.mjs';
import common from '../../../lib/i18n/messages/common.mjs';
import legal from '../../../lib/i18n/messages/legal.mjs';
import about from '../../../content/legal/about.mjs';
import privacy from '../../../content/legal/privacy.mjs';
import terms from '../../../content/legal/terms.mjs';
export const dynamic='force-dynamic';
const PAGES:{[page:string]:any}={about,privacy,terms};
// Paragraphs are plain text with [text](url) links; nothing else is interpreted as markup.
function Paragraph({text}:{text:string}){const parts=text.split(/(\[[^\]]+\]\([^)\s]+\))/g);return <p>{parts.map((part,i)=>{const m=/^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);return m?<a key={i} href={m[2]}>{m[1]}</a>:part;})}</p>}
export default async function Legal({params}:{params:Promise<{page:string}>}){
 const {page}=await params,c=config(),locale=await getLocale();
 if(!Object.hasOwn(PAGES,page))notFound();
 const lang=PAGES[page][locale]?locale:'en',doc=PAGES[page][lang],t=createTranslator(legal,locale),note=createTranslator(common,lang);
 const v=doc.vars||{},vars={checkoutState:c.billingEnabled?v.checkoutOpen:v.checkoutClosed,operator:c.seller?interpolate(v.operatorSeller,{seller:c.seller,contact:c.contact}):v.operatorPending};
 return <main className="legal-page" lang={lang}><a href="/app" className="brand">Narrify</a><a href="/app" className="text-button" lang={locale}>{t('legal.back')}</a><p className="eyebrow" lang={locale}>{t('legal.updated')}</p><h1>{doc.title}</h1>{lang!=='en'&&<p className="translation-note" role="note">{note('review.pending')}</p>}{doc.sections.map((s:any)=><section key={s.heading}><h2>{s.heading}</h2>{s.paragraphs.map((p:string,i:number)=><Paragraph key={i} text={interpolate(p,vars)}/>)}</section>)}<p lang={locale}><a href="mailto:charalamposnadiotis44@gmail.com">{t('legal.contact')}</a></p></main>;
}
