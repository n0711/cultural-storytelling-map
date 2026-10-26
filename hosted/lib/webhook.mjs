import Stripe from 'stripe';
// This instance performs local signature checks only; it never calls Stripe.
const verifier=new Stripe('sk_test_signature_verifier_only',{httpClient:Stripe.createFetchHttpClient()});
export async function verifyWebhook(raw,signature,secret){
 return verifier.webhooks.constructEventAsync(raw,signature,secret,300,Stripe.createSubtleCryptoProvider());
}
