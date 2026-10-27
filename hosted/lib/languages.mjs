// Language describes the contributed text, never the community it describes.
export const STORY_LANGUAGES = [
 {code:'en', label:'English'},
 {code:'el', label:'Ελληνικά · Greek'},
 {code:'el-CY', label:'Κυπριακά Ελληνικά · Cypriot Greek'},
 {code:'tr', label:'Türkçe · Turkish'},
 {code:'ar', label:'العربية · Arabic'},
 {code:'hy', label:'Հայերեն · Armenian'},
 {code:'he', label:'עברית · Hebrew'},
 {code:'ru', label:'Русский · Russian'},
 {code:'uk', label:'Українська · Ukrainian'},
 {code:'und', label:'Other / not specified'},
];
export function storyLanguage(code) {
 return STORY_LANGUAGES.find(language=>language.code===code)||STORY_LANGUAGES[STORY_LANGUAGES.length-1];
}
export function normalizeSearch(value) {
 return String(value??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ').replace(/ı/g,'i');
}
export function filterStories(stories,{query='',category='all',language='all',savedOnly=false,previewsOnly=false,saved=[]}={}) {
 const terms=normalizeSearch(query).trim().split(/\s+/u).filter(Boolean);
 const savedIds=new Set(saved);
 return stories.filter(story=>{
  const code=storyLanguage(story.language).code;
  if(category!=='all'&&story.category!==category)return false;
  if(language!=='all'&&code!==language&&!(language==='el'&&code.startsWith('el-')))return false;
  if(savedOnly&&!savedIds.has(story.id))return false;
  if(previewsOnly&&!story.preview)return false;
  const text=normalizeSearch([story.title,story.place,story.excerpt,story.author].join(' '));
  return terms.every(term=>text.includes(term));
 });
}
