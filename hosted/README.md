# Narrify — hosted launch edition

Live map: https://narrify-cultural-map.fitslug32.chatgpt.site

Maintained source: https://github.com/n0711/cultural-storytelling-map

A hosted edition of [Cultural Storytelling Map](https://github.com/hussainJamil24/cultural-storytelling-map), by Charalampos Nadiotis, Hussain Jamil and Nikitas Savva. The original React/FastAPI Windows demo is preserved in that repository. This launch edition uses Vinext/React, Cloudflare Workers and D1 through ChatGPT Sites, with the platform's ChatGPT sign-in. The basemap uses MapLibre and OpenFreeMap, which permits commercial use without an API key (https://openfreemap.org/). Required OpenMapTiles/OpenStreetMap attribution remains visible.

## Launch state

- Eleven curated stories, unchanged from approved source records at commit `d8306ba6554320513a2b4bea93b8c97c2df3542b`. Three free previews. Original tests, demos, rejected records, account emails, password hashes and uploaded media are excluded.
- Searchable map and categories; public story excerpts; full member stories fetched only from the authorized server route.
- Text contributions are free for signed-in users and default to pending. Moderators review them before publication. Saved stories are stored per account.
- Introductory public membership: **€1.99 EUR per month**. Governmental/institutional pilots have separate, uncommitted scope and pricing. A pitch itself does not cancel or reprice consumer subscriptions.
- **Billing remains closed until live merchant configuration and an end-to-end payment/cancellation test are complete.** The launch does not claim an activated payment account, processed payment or institutional partnership.
- This edition intentionally does not expose the local demo's upload, AI or translation endpoints. It does not deploy the development FastAPI server to Workers.

## Inclusive reading and contributions

Story language is now recorded separately from the community or topic of a story. The existing eleven English texts keep their exact content and source digests. They are labelled English; they are not presented as translations or as an original recording in a community's language.

- The catalogue filters by published story language, category, saved status and free previews. The language selector lists only languages with published stories. Greek also includes records labelled Cypriot Greek.
- Search ignores case and combining accents, handles Greek final sigma and Turkish dotted/dotless I, and matches words across title, place, author and public excerpt. It searches the text's own script; it does not translate or transliterate searches and never searches hidden member text.
- The contribution form includes a clickable map to choose an approximate public location. Map clicks are rounded to three decimal places, and coordinates remain editable and required. Clearing a location clears both fields and the pin. Keyboard users and visitors without a working map can use the coordinate fields. This uses the existing Cyprus bounding rectangle, not address or land-boundary verification; it never requests device geolocation.
- Contributors can label English, Greek, Cypriot Greek, Turkish, Arabic, Armenian, Hebrew, Russian or Ukrainian text, or use Other / not specified for any unlisted language. Language labels are validated on the server. Earlier submissions without a label retain `und` (not specified).
- Story cards, the reader, contribution fields and moderation text use automatic text direction and language tags. Each reader paragraph chooses its own direction. Names and places are isolated from surrounding text. These are text-reading features; the interface remains English.
- Keyboard users can skip navigation, search focus is visible, result changes are announced, and contribution errors appear inside the form. Human moderation and permission checks continue to apply.

`drizzle/0001_clear_young_avengers.sql` adds a language column with a constant `und` default. Apply only this pending migration to an existing local database; Sites applies it to hosted storage during publication. Do not replay the initial migration on an existing database.

## Run and verify

Use Node 22.13+ and the version of pnpm recorded in `package.json`.

```sh
pnpm install --frozen-lockfile
node node_modules/typescript/bin/tsc --noEmit
node --test tests/launch.test.mjs
pnpm run build
```

D1 schema migrations live in `drizzle/`; local state is separate from production. Apply the migrations in order once to a fresh local preview database before starting a new checkout. On an existing database, apply only pending migrations. Do not seed public user accounts or demo credentials.

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_chunky_korvac.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_clear_young_avengers.sql
pnpm run dev
```

The full story collection is server data. It must never be imported by a client component. `data/collection-provenance.json` records source IDs and text digests; `data/stories.server.json` is the approved curated server collection, not a browser download.

## Activate €1.99 monthly billing

Configure runtime values using secure hosting controls, not commits, a browser bundle or a public issue. `.env.example` lists names only.

1. Complete Stripe merchant onboarding. Publish the verified merchant name/contact in `SELLER_NAME` and `SELLER_CONTACT`.
2. Create a live, fixed recurring Stripe Price: currency `eur`, integer amount `199`, interval `month`, interval count `1`, licensed usage, per-unit billing. Configure inclusive tax handling if tax is required; Checkout does not add an automatic tax or extra line item. Set `STRIPE_PRICE_ID`. The server validates the live Price before creating a Checkout Session.
3. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as secrets. Set `SITE_ORIGIN` to the literal deployed HTTPS origin. Only live mode can open this deployment's checkout.
4. Register `POST /api/billing/webhook` as a public Stripe snapshot webhook for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`.
5. Enable subscription cancellation in Stripe's Customer Portal, scheduling cancellation at period end. Do not enable plan switching to unvalidated prices. Enable email receipts and complete the merchant's support/terms/privacy settings.
6. Verify the separate Stripe sandbox workflow and webhook deliveries. In a controlled live verification, check the amount/currency, identity binding, activation, saved stories, renewal/failure status, portal cancellation and paid-period expiry. Do not use customers for the first test. Record the results without secrets or card data. This setup step has not been performed by code-only tests.
7. Set `BILLING_ENABLED=true` only after the above. Redeploy if required by the host's environment controls. The page otherwise clearly displays that membership checkout is not open and takes no payment.

Existing subscriptions must be handled separately before disabling billing for an institutional rollout. A frontend price edit does not change a Stripe price. Keep cancellation access available for current members.

## Payment and access boundaries

- The browser cannot select an amount, price, customer or user identity. Stripe customer IDs are bound to the platform's stable site-specific user ID in D1.
- Checkout Sessions use server price validation and idempotency keys, reuse unfinished sessions and block another subscription when an unresolved one exists.
- A success URL never grants membership. The webhook verifies the raw body, signature and five-minute timestamp window. It retrieves current Stripe subscription state rather than trusting event ordering or browser assertions. Event IDs are retained to skip duplicates; retries upsert safely.
- Only active, unexpired, live subscriptions on the configured €1.99 price unlock member content. Canceled, overdue, unpaid, incomplete, paused and trialing states cannot grant access.
- `/api/billing/refresh` reconciles directly against Stripe for a signed-in customer after checkout and when requested. The billing portal always uses the authenticated account's stored customer ID.
- Account data and full story responses use `private, no-store`. Mutating visitor routes require a matching origin. Webhooks use signature verification instead.
- Submissions have bounded lengths, an explicit publishing-permission checkbox, a Cyprus location check, server-side daily rate limits and human moderation. Text is rendered as text, never injected as HTML.
- Admin access comes only from `NARRIFY_ADMIN_EMAILS`, configured as a runtime secret. No source account or demo role is imported.

## Evidence and limits

Thirteen automated tests cover map-selection bounds and rounding, shared location validation, original-language validation and preservation, Unicode search, combined discovery filters, migration preservation and paid-text redaction, as well as the fixed-price boundary, failed/expired membership states, public catalogue text redaction, source-content preservation, contribution validation and the actual webhook signature verifier. Local browser checks cover public preview reading, member-story denial, search filtering, island-map fallback, and the desktop and 390-pixel mobile layout. The inclusion update was checked in the browser on desktop and in a 390-pixel mobile iframe, including combined preview/language filters, map pin updates and free-story reading. Map selection, manual coordinate editing, clearing and required-field behavior were checked in a local contribution fixture on desktop and at 390 pixels. The fixture was removed before packaging. An explicitly local UI fixture verified Arabic input direction (`ar`, `dir=auto`, computed RTL); it was removed before packaging. Migration tests use a temporary SQLite database. Live sign-in, contribution writes, moderator writes and live billing still require end-to-end verification. They do not establish successful merchant onboarding, real recurring payments, legal review, map-provider production capacity or institutional acceptance.

Community accounts have not been independently fact-checked. Contributor permissions and editorial corrections can be resolved through the published project contact. New original content is accepted for human review. The launch preserves team attribution and makes no government endorsement claim.

The map falls back to a locally bundled Natural Earth physical coastline with Leaflet when WebGL2 or remote basemap requests are unavailable. This keeps the island and story markers usable on limited browsers without requesting OpenStreetMap's standard public raster tile server. It is an island view, not a street-level basemap. Natural Earth data is public domain: https://www.naturalearthdata.com/about/terms-of-use/.
