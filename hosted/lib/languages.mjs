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
// el/tr: draft translation — pending native review
const LANGUAGE_NAMES = {
 en:{en:'English',el:'Greek','el-CY':'Cypriot Greek',tr:'Turkish',ar:'Arabic',hy:'Armenian',he:'Hebrew',ru:'Russian',uk:'Ukrainian',und:'Other / not specified'},
 el:{en:'Αγγλικά',el:'Ελληνικά','el-CY':'Κυπριακά Ελληνικά',tr:'Τουρκικά',ar:'Αραβικά',hy:'Αρμενικά',he:'Εβραϊκά',ru:'Ρωσικά',uk:'Ουκρανικά',und:'Άλλη / δεν δηλώθηκε'},
 tr:{en:'İngilizce',el:'Yunanca','el-CY':'Kıbrıs Rumcası',tr:'Türkçe',ar:'Arapça',hy:'Ermenice',he:'İbranice',ru:'Rusça',uk:'Ukraynaca',und:'Diğer / belirtilmemiş'},
};
// Story language label for an interface locale: the endonym, plus its name in the interface language when that differs.
export function languageLabel(code,uiLocale='en') {
 const language=storyLanguage(code);
 if(!uiLocale||uiLocale==='en')return language.label;
 const names=LANGUAGE_NAMES[uiLocale]||LANGUAGE_NAMES.en;
 if(language.code==='und')return names.und;
 const endonym=language.label.split(' · ')[0];
 const local=names[language.code];
 return local&&local!==endonym?endonym+' · '+local:endonym;
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
