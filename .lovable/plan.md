

## Secure Webhook Proxy via Edge Function

### 1. Add secret: `N8N_WEBHOOK_URL`
Use the secrets tool to ask the user to provide `https://mkidder97.app.n8n.cloud/webhook/src-client-portal`.

### 2. Create edge function: `supabase/functions/fire-webhook/index.ts`
- CORS headers included
- Accepts POST with `{ clientName, address, serviceType, agreementId }`
- Reads `N8N_WEBHOOK_URL` from `Deno.env.get()`
- Forwards payload to n8n, returns success/error
- No JWT verification needed (public internal tool), but set `verify_jwt = false` in config.toml

### 3. Update `supabase/config.toml`
Add `[functions.fire-webhook]` with `verify_jwt = false`.

### 4. Update `src/pages/AgreementDetail.tsx`
- Replace direct `fetch(import.meta.env.VITE_N8N_WEBHOOK_URL, ...)` in `fireWebhook` with `supabase.functions.invoke("fire-webhook", { body: payload })`
- Remove the `VITE_N8N_WEBHOOK_URL` env comment at top of file
- Remove the `url` check for the env var

