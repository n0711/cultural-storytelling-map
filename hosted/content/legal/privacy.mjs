// Legal page text: {locale:{title, sections:[{heading, paragraphs}]}}. Links use [text](url).
// el/tr: draft translation — pending native review
export default {
 en:{
  title:'Privacy & your stories',
  sections:[
   {heading:'Information used by Narrify',paragraphs:[
    'If you sign in with ChatGPT, the hosting platform provides a site-specific account identifier, email address and an optional display name. Narrify stores these to connect your contributions, saved stories and membership to your account.',
   ]},
   {heading:'Stories and locations',paragraphs:[
    'Submitted text, chosen display name, story language, category, source link and approximate location are stored for moderation. Approved stories become visible on the map; complete text can be restricted to members. Please use public locations and share another person’s information only with their permission.',
   ]},
   {heading:'Payments',paragraphs:[
    'When paid membership opens, Stripe hosts checkout and the billing portal. Narrify stores Stripe customer and subscription identifiers, membership status and billing-period dates. Narrify does not receive or store your full payment-card number.',
   ]},
   {heading:'Hosting and maps',paragraphs:[
    'ChatGPT Sites hosts this service using Cloudflare infrastructure. The map uses OpenFreeMap tiles based on OpenStreetMap and OpenMapTiles, rendered with MapLibre. Loading the detailed map sends your IP address and map-tile requests to the tile service. If your browser cannot display that map, a local island-view map uses public-domain Natural Earth coastline data through Leaflet. Sign-in and payment providers process information according to their own privacy policies.',
   ]},
   {heading:'Offline previews on this device',paragraphs:[
    'When offline support is enabled, the app stores the three public preview stories and public installation assets in a local browser cache. Account records, submitted stories, member story bodies and payment responses are not added to that offline cache. Offline files remain until cleared, replaced by an app update or removed by the browser. You can remove them through your browser’s site-data controls. Account access and contributions require an internet connection.',
   ]},
   {heading:'Storage and controls',paragraphs:[
    'Account records and saved stories remain until you request deletion or the service closes, unless retention is necessary for billing obligations. Contributions remain until removed after review. Rate-limit records are short-lived. No advertising trackers or third-party analytics have been added to this edition.',
   ]},
   {heading:'Contact and requests',paragraphs:[
    'For access, correction, export, deletion or a concern about a story, contact [charalamposnadiotis44@gmail.com](mailto:charalamposnadiotis44@gmail.com). Public attribution can be changed following a verified request. Ask before submitting sensitive personal information.',
   ]},
  ],
 },
};
