// Legal page text: {locale:{title, sections:[{heading, paragraphs}], vars}}. Links use [text](url).
// {checkoutState} and {operator} are filled from vars by app/legal/[page]/page.tsx.
// el/tr: draft translation — pending native review
export default {
 en:{
  title:'Membership terms',
  vars:{
   checkoutOpen:'open',
   checkoutClosed:'closed while payment setup is completed',
   operatorSeller:'{seller}. Contact: {contact}.',
   operatorPending:'The project contact is Charalampos Nadiotis. Verified merchant details will be published before checkout opens.',
  },
  sections:[
   {heading:'Public previews',paragraphs:[
    'Reading the three preview stories is free and does not start a subscription. Contributions require sign-in but do not require paid membership.',
   ]},
   {heading:'Introductory membership',paragraphs:[
    'The launch price is €1.99 charged monthly in euros. Checkout is currently {checkoutState}. Membership access begins only after Stripe confirms an active paid subscription. A checkout return page does not itself grant access.',
   ]},
   {heading:'Renewal and cancellation',paragraphs:[
    'Membership renews monthly until cancelled. When available, use My account → Manage billing & cancellation to cancel through Stripe’s billing portal. If cancellation is scheduled at period end, access continues until the end of the paid period. Failed or overdue payments can suspend access.',
   ]},
   {heading:'Changes to the launch offer',paragraphs:[
    'Institutional offers are separate. A future institutional pitch does not automatically cancel or reprice existing memberships. Any proposed change to an existing subscription will be communicated before it takes effect; you can cancel before the next renewal.',
   ]},
   {heading:'Your contributions',paragraphs:[
    'You keep ownership of your original contributions. By submitting, you permit Narrify to store, moderate and publish that contribution and your chosen attribution on this map, including within member access. Submit only content you can share. Moderators can reject or remove content that infringes rights, exposes private information or falls outside the collection.',
   ]},
   {heading:'Support and refunds',paragraphs:[
    'Contact [charalamposnadiotis44@gmail.com](mailto:charalamposnadiotis44@gmail.com) about billing errors, service problems or refund requests. These terms do not remove any mandatory consumer rights.',
   ]},
   {heading:'Operator',paragraphs:[
    '{operator}',
   ]},
  ],
 },
};
