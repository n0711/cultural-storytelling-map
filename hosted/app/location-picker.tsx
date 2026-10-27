'use client';
import {useState} from 'react';
import StoryMap from './map';
import {CYPRUS_BOUNDS,publicMapPoint,withinCyprusBounds} from '../lib/location.mjs';

export default function LocationPicker(){
 const [latitude,setLatitude]=useState(''),[longitude,setLongitude]=useState(''),[notice,setNotice]=useState('');
 const picked=latitude!==''&&longitude!==''&&withinCyprusBounds(Number(latitude),Number(longitude))?{latitude:Number(latitude),longitude:Number(longitude)}:null;
 function choose(lat:number,lng:number){
  const point=publicMapPoint(lat,lng);
  if(!point){setNotice('Choose a location within Cyprus.');return;}
  setLatitude(point.latitude.toFixed(3));setLongitude(point.longitude.toFixed(3));setNotice('Map pin selected. You can adjust the coordinates below.');
 }
 return <fieldset className="location-field"><legend>Story location</legend>
  <p id="location-help">Tap or click a public place on the map, or enter coordinates below. Avoid private home addresses.</p>
  <div className="location-picker"><StoryMap stories={[]} onSelect={()=>{}} focus={null} picked={picked} onPick={choose}/></div>
  <div className="location-summary"><output aria-live="polite" aria-atomic="true">{notice|| (picked?'A location is selected.':'No location selected yet.')}</output><button className="text-button" type="button" disabled={!latitude&&!longitude} onClick={()=>{setLatitude('');setLongitude('');setNotice('Location cleared. Choose another public place.')}}>Clear location</button></div>
  <div className="form-row"><label>Latitude<input name="latitude" required type="number" step="any" min={CYPRUS_BOUNDS.south} max={CYPRUS_BOUNDS.north} placeholder="35.17" aria-describedby="location-help" value={latitude} onChange={e=>{setLatitude(e.target.value);setNotice('')}}/></label><label>Longitude<input name="longitude" required type="number" step="any" min={CYPRUS_BOUNDS.west} max={CYPRUS_BOUNDS.east} placeholder="33.36" aria-describedby="location-help" value={longitude} onChange={e=>{setLongitude(e.target.value);setNotice('')}}/></label></div>
 </fieldset>;
}
