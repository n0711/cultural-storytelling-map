'use client';
import { useEffect, useRef, useState } from 'react';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import coastline from '../data/cyprus-coastline.json';
export default function StoryMap({stories,onSelect,focus}:{stories:any[];onSelect:(id:string)=>void;focus:any}){
 const node=useRef<HTMLDivElement>(null),map=useRef<any>(null),markers=useRef<any[]>([]),lib=useRef<any>(null),engine=useRef(''),select=useRef(onSelect);
 const [ready,setReady]=useState(false),[fallback,setFallback]=useState(false),[failed,setFailed]=useState(false);
 select.current=onSelect;
 useEffect(()=>{let mounted=true,switched=false;let timer:ReturnType<typeof setTimeout>;
  async function localMap(){
   if(!mounted||switched||!node.current)return;switched=true;
   try{map.current?.remove();node.current.replaceChildren();const L=await import('leaflet');if(!mounted||!node.current)return;
    lib.current=L;engine.current='leaflet';const m=L.map(node.current,{scrollWheelZoom:false,zoomControl:false,minZoom:7,maxZoom:13}).setView([35.09,33.25],9);map.current=m;
    L.control.zoom({position:'bottomright'}).addTo(m);
    const land=L.geoJSON(coastline as any,{interactive:false,style:{color:'#9da99a',weight:1.5,fillColor:'#f1f0df',fillOpacity:1}}).addTo(m);m.fitBounds(land.getBounds(),{padding:[35,45],maxZoom:9});
    m.attributionControl.addAttribution('Coastline: <a href="https://www.naturalearthdata.com/">Natural Earth</a>');
    setReady(true);setFallback(true);setFailed(false);
   }catch{if(mounted)setFailed(true)}
  }
  import('maplibre-gl').then(M=>{if(!mounted||!node.current)return;lib.current=M;engine.current='maplibre';M.setWorkerUrl(workerUrl);const m=new M.Map({container:node.current,style:'https://tiles.openfreemap.org/styles/positron',center:[33.15,35.03],zoom:8.2,scrollZoom:false,attributionControl:{compact:false},renderWorldCopies:false});map.current=m;m.addControl(new M.NavigationControl({showCompass:false}),'bottom-right');m.on('load',()=>{if(mounted&&!switched){clearTimeout(timer);setReady(true);setFailed(false)}});m.on('error',()=>{if(mounted&&!switched)localMap()});timer=setTimeout(()=>{if(!m.loaded())localMap()},15000);}).catch(()=>localMap());
  return()=>{mounted=false;clearTimeout(timer);markers.current.forEach(m=>m.remove());map.current?.remove();map.current=null;};
 },[]);
 useEffect(()=>{if(!ready)return;markers.current.forEach(m=>m.remove());const M=lib.current;
  markers.current=stories.map(s=>{
   if(engine.current==='leaflet'){
    const icon=M.divIcon({className:'story-pin-wrap',html:'<span class="story-pin '+(s.preview?'preview-pin':'')+'">'+(s.preview?'✦':'•')+'</span>',iconSize:[36,42],iconAnchor:[18,39]});
    const marker=M.marker([s.latitude,s.longitude],{icon,keyboard:true,title:s.title,alt:s.title}).addTo(map.current);
    const label=document.createElement('span');label.textContent=s.title;marker.bindTooltip(label,{direction:'top',offset:[0,-35]});marker.on('click',()=>select.current(s.id));return marker;
   }
   const button=document.createElement('button');button.className='story-map-marker';button.setAttribute('aria-label',s.title);button.setAttribute('title',s.title);const pin=document.createElement('span');pin.className='story-pin '+(s.preview?'preview-pin':'');pin.textContent=s.preview?'✦':'•';button.appendChild(pin);button.addEventListener('click',()=>select.current(s.id));return new M.Marker({element:button,anchor:'bottom'}).setLngLat([s.longitude,s.latitude]).addTo(map.current);
  });
 },[ready,fallback,stories]);
 useEffect(()=>{if(ready&&focus){if(engine.current==='leaflet')map.current.flyTo([focus.latitude,focus.longitude],11,{duration:.8});else map.current.flyTo({center:[focus.longitude,focus.latitude],zoom:11,essential:false});}},[ready,focus]);
 return <div className="map-shell"><div className="map-canvas" ref={node} role="region" aria-label="Interactive map of community stories in Cyprus"/>{!ready&&<p className="map-loading">{failed?'The map is unavailable. You can still explore with the story list.':'Opening the map…'}</p>}{fallback&&<span className="fallback-label">Island view · zoom to explore stories</span>}</div>;
}
