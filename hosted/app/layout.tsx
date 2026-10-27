import type { Metadata,Viewport } from 'next';
import {ServiceWorkerSetup} from './mobile-setup';
import './globals.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'leaflet/dist/leaflet.css';
export const metadata:Metadata={title:'Narrify · Cultural Storytelling Map',description:'Discover Cyprus through the stories of its people. Explore cultural heritage, food, music and memories on the map. Introductory membership €1.99/month.',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,title:'Narrify',statusBarStyle:'default'},icons:{icon:'/favicon.svg',apple:'/icons/icon-192.png'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#fafbf9'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><ServiceWorkerSetup/>{children}</body></html>}
