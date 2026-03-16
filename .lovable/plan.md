

# Phase 2: New Client Input + AI Parsing via Claude

## Prerequisite
Request `ANTHROPIC_API_KEY` secret from user before building.

## Files to Create/Edit

### 1. Create `supabase/functions/parse-client-input/index.ts`
- POST endpoint accepting `{ message: string }`
- CORS headers + OPTIONS handler
- Auth validation via `getClaims()`
- Calls `https://api.anthropic.com/v1/messages` with `claude-sonnet-4-20250514`
- System prompt instructs Claude to return JSON only with: `clientName`, `address`, `serviceType` (one of: annual_pm, due_diligence, survey, storm, construction_management), `duration`, `frequency`, `scopeNotes`
- Uses `ANTHROPIC_API_KEY` from `Deno.env`
- Returns parsed JSON or error response

### 2. Edit `supabase/config.toml`
- Add `[functions.parse-client-input]` with `verify_jwt = false`

### 3. Rewrite `src/pages/NewClient.tsx`
- Tabs toggle: AI Chat / Manual Form
- **AI Chat mode**: textarea + "Parse with AI" button → calls edge function via `supabase.functions.invoke('parse-client-input')` → populates editable review fields. Loading spinner, inline error on failure.
- **Manual Form mode**: Client Name, Property Address, Service Type (select), Duration, Frequency, Scope Notes (textarea)
- Both modes share the same field state and "Save Client" submit button
- Submit: insert into `clients` → insert into `agreements` (status=draft) → redirect `/agreements` + success toast

## Implementation Order
1. Request ANTHROPIC_API_KEY secret
2. Create edge function + update config.toml
3. Deploy edge function
4. Rewrite NewClient.tsx

