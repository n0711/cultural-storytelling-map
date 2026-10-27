'use client';
import {createContext,useContext,useEffect,useMemo} from 'react';
import {LOCALES,LOCALE_COOKIE,LOCALE_COOKIE_MAX_AGE,createTranslator,supportedLocale} from '../lib/i18n/core.mjs';
import common from '../lib/i18n/messages/common.mjs';
type Messages={[locale:string]:{[key:string]:string|{[form:string]:string}}};
const LocaleContext=createContext('en');
function remember(locale:string){document.cookie=LOCALE_COOKIE+'='+locale+'; Max-Age='+LOCALE_COOKIE_MAX_AGE+'; Path=/; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');}
export function LocaleProvider({locale,children}:{locale:string;children:React.ReactNode}){
 // ?lang=el (for example from a shared link) becomes the remembered choice, then the server renders in that language.
 useEffect(()=>{const url=new URL(location.href);const requested=url.searchParams.get('lang');if(requested===null)return;const next=supportedLocale(requested);url.searchParams.delete('lang');if(next&&next!==locale){remember(next);location.replace(url.toString());}else history.replaceState(history.state,'',url.toString());},[locale]);
 return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
export const useLocale=()=>useContext(LocaleContext);
export function useT(messages:Messages){const locale=useLocale();return useMemo(()=>createTranslator(messages,locale),[messages,locale]);}
export function LanguageSwitch({className='language-switch'}:{className?:string}){
 const locale=useLocale(),t=useT(common);
 return <label className={className}><span className="sr-only">{t('language.switch')}</span><select value={locale} aria-label={t('language.switch')} onChange={e=>{remember(e.target.value);location.reload();}}>{LOCALES.map(code=><option key={code} value={code} lang={code}>{t('language.'+code)}</option>)}</select></label>;
}
