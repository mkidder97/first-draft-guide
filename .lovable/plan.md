

## Plan

### 1. Create `agreements` storage bucket (SQL migration)
- Create a **public** bucket called `agreements`
- Add an RLS policy allowing the service role (and authenticated users) to insert/read objects

### 2. Update `supabase/functions/fire-webhook/index.ts`
- Import `createClient` from `@supabase/supabase-js`
- Create a service-role Supabase client using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars (both already available as secrets)
- Extract `pdfBase64` and `agreementId` from the request body
- Decode the base64 string to a `Uint8Array`, upload to `agreements/{agreementId}.pdf` via `supabase.storage.from('agreements').upload()`
- Get the public URL via `supabase.storage.from('agreements').getPublicUrl()`
- Forward `{ clientName, address, serviceType, agreementId, pdfUrl }` to n8n (no `pdfBase64`)

### 3. No changes to frontend
The frontend already sends `pdfBase64` in the payload — the edge function will consume and replace it.

