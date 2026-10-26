import type { Metadata } from 'next';
import './globals.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'leaflet/dist/leaflet.css';
export const metadata:Metadata={title:'Narrify · Cultural Storytelling Map',description:'Discover Cyprus through the stories of its people. Explore cultural heritage, food, music and memories on the map. Introductory membership €1.99/month.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
