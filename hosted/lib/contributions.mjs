import {storyLanguage} from './languages.mjs';

export const CONTRIBUTION_STATES = {
 pending:{label:'Waiting for review',note:'Only you and the review team can see this submission.'},
 approved:{label:'Approved',note:'Approved for the published collection.'},
 rejected:{label:'Not published',note:'A reviewer has decided not to publish this submission.'},
};

export async function ownContributions(database,userId){
 if(typeof userId!=='string'||!userId.trim())throw new Error('A signed-in user is required.');
 const rows=await database.prepare("SELECT id,title,category,language,place,status,created_at,CASE WHEN length(content)>150 THEN substr(content,1,150)||'…' ELSE content END AS excerpt FROM submissions WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 50").bind(userId).all();
 return rows.results.map(row=>({id:row.id,title:row.title,category:row.category,language:storyLanguage(row.language).code,place:row.place,status:row.status,excerpt:row.excerpt,createdAt:new Date(row.created_at*1000).toISOString()}));
}
