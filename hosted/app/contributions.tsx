'use client';
import {BookOpen,LoaderCircle,MapPin} from 'lucide-react';
import {CONTRIBUTION_STATES} from '../lib/contributions.mjs';
import {storyLanguage} from '../lib/languages.mjs';

export default function Contributions({rows,loading,error,notice,onRefresh,onShare}:{rows:any[];loading:boolean;error:string;notice:string;onRefresh:()=>void;onShare:()=>void}){
 return <div className="contributions-panel">
  <p className="eyebrow">YOUR VOICE ON THE MAP</p><h2>My contributions</h2>
  <p className="form-intro">Follow the review status of your 50 most recent submissions. Membership is not required.</p>
  {notice&&<p className="contribution-notice" role="status">{notice}</p>}
  <div className="contributions-toolbar"><button className="button light small" onClick={onShare}>Share another story</button><button className="text-button" disabled={loading} onClick={onRefresh}>Refresh status</button></div>
  {loading&&<p className="loading" role="status"><LoaderCircle className="spin" size={18}/>Loading your contributions…</p>}
  {error&&<p className="form-error" role="alert">{error}</p>}
  {!loading&&!error&&!rows.length&&<div className="empty"><BookOpen size={28}/><h3>No contributions yet.</h3><p>Your submissions and their review status will appear here.</p></div>}
  {!loading&&!error&&rows.map(row=>{
   const state=CONTRIBUTION_STATES[row.status as keyof typeof CONTRIBUTION_STATES];
   return <article key={row.id} className="contribution-card"><span className={'contribution-state state-'+(state?row.status:'unknown')}>{state?.label||'Status unavailable'}</span><h3 lang={storyLanguage(row.language).code} dir="auto">{row.title}</h3><div className="contribution-details"><span><MapPin size={12}/><bdi>{row.place}</bdi></span><span>{storyLanguage(row.language).label}</span><time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleDateString('en-GB',{dateStyle:'medium',timeZone:'UTC'})}</time></div><p className="contribution-excerpt" lang={storyLanguage(row.language).code} dir="auto">{row.excerpt}</p><p className="contribution-review-note">{state?.note||'Refresh to check the current review status.'}</p>{row.status==='rejected'&&<a className="text-button" href={'mailto:charalamposnadiotis44@gmail.com?subject='+encodeURIComponent('Narrify contribution review: '+row.title)}>Ask about this review</a>}</article>;
  })}
 </div>;
}
