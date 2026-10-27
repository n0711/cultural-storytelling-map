'use client';
import {useEffect,useState} from 'react';
import {Download} from 'lucide-react';

export function ServiceWorkerSetup(){
 useEffect(()=>{if('serviceWorker' in navigator&&window.isSecureContext){navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(()=>navigator.serviceWorker.ready).then(()=>{document.documentElement.dataset.narrifyOffline='ready'}).catch(()=>{document.documentElement.dataset.narrifyOffline='unavailable'})}},[]);
 return null;
}
export function InstallApp(){
 const [prompt,setPrompt]=useState<any>(null);
 useEffect(()=>{function available(event:Event){event.preventDefault();setPrompt(event)}function installed(){setPrompt(null)}window.addEventListener('beforeinstallprompt',available);window.addEventListener('appinstalled',installed);return()=>{window.removeEventListener('beforeinstallprompt',available);window.removeEventListener('appinstalled',installed)}},[]);
 if(!prompt)return null;
 return <button className="button small app-install" onClick={async()=>{const pending=prompt;setPrompt(null);await pending.prompt()}}><Download size={15}/>Install</button>;
}
