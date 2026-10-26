export const AMOUNT = 199;
export const CURRENCY = 'eur';
export const CATEGORIES = ['heritage','landmarks','oral_history','customs','migration','food','music','religion'];
export function validPrice(p) {
 return !!p && p.active === true && p.currency === CURRENCY && p.unit_amount === AMOUNT && p.type === 'recurring' && p.recurring?.interval === 'month' && p.recurring?.interval_count === 1 && p.billing_scheme === 'per_unit' && !p.recurring?.usage_type?.includes('metered');
}
export function activeSubscription(s, now = Date.now()/1000) {
 return !!s && s.status === 'active' && Number(s.period_end) > now;
}
export function publicStory(s, canRead) {
 const {content, ...metadata} = s;
 return {...metadata, excerpt: content.slice(0,150).trim()+'…', locked: !canRead && !s.preview};
}
export function validateStory(v) {
 const title=String(v.title||'').trim(), content=String(v.content||'').trim(), author=String(v.author||'').trim(), place=String(v.place||'').trim();
 const latitude=Number(v.latitude), longitude=Number(v.longitude), category=String(v.category||'');
 if(title.length<5||title.length>140) throw new Error('Use a title between 5 and 140 characters.');
 if(content.length<100||content.length>12000) throw new Error('Your story must be between 100 and 12,000 characters.');
 if(!author||author.length>80||!place||place.length>100) throw new Error('Add an author name and place, under 80 and 100 characters.');
 if(v.latitude === '' || v.longitude === '' || !Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude < 34.4||latitude > 35.8||longitude < 32.1||longitude > 34.7) throw new Error('Choose a location within Cyprus.');
 if(!CATEGORIES.includes(category)) throw new Error('Choose a story category.');
 if(v.consent!==true) throw new Error('Confirm permission to publish this story.');
 const sourceUrl=String(v.sourceUrl||'').trim();
 if(sourceUrl && (sourceUrl.length>500||!/^https:\/\//i.test(sourceUrl))) throw new Error('Use an https source link.');
 return {title,content,author,place,latitude,longitude,category,sourceUrl};
}
