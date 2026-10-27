import { cookies, headers } from 'next/headers';
import { LOCALE_COOKIE, negotiateLocale } from './core.mjs';
// Server components cannot see the query string here; app/i18n.tsx turns ?lang= into the cookie.
export async function getLocale(){const c=await cookies(),h=await headers();return negotiateLocale({cookie:c.get(LOCALE_COOKIE)?.value??null,acceptLanguage:h.get('accept-language')});}
