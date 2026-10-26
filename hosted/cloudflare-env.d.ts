declare namespace Cloudflare {
 interface Env {
  DB?: D1Database; BUCKET?: R2Bucket;
  SITE_ORIGIN?: string; NARRIFY_ADMIN_EMAILS?: string; BILLING_ENABLED?: string;
  STRIPE_SECRET_KEY?: string; STRIPE_WEBHOOK_SECRET?: string; STRIPE_PRICE_ID?: string;
  SELLER_NAME?: string; SELLER_CONTACT?: string;
 }
}
