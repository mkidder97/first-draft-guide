

# Multi-Service + New Fields Update

## Database Migration
Add two columns to `clients`:
- `building_count` integer, nullable
- `markets` text, nullable

No changes to `agreements` — one row per service type using existing schema.

## Edge Function (`parse-client-input/index.ts`)
Update Claude system prompt:
- `serviceTypes` → array of strings (was singular `serviceType`)
- Add `buildingCount` (number or null)
- Add `markets` (string or null)

## Frontend (`NewClient.tsx`)
1. **State**: `serviceType: string` → `serviceTypes: string[]`, add `buildingCount: string`, `markets: string`
2. **Service Types**: Replace `<Select>` with checkbox group (one `<Checkbox>` per service type)
3. **New fields**: "Building Count" (number input), "Markets" (text input)
4. **AI parse handler**: Map `data.serviceTypes` array + new fields into state
5. **Submit**: Insert client with `building_count` and `markets`. Loop `serviceTypes` array → insert one agreement row per service type (all status `draft`). Validate at least one service selected.

## Files Changed
- DB migration (add columns)
- `supabase/functions/parse-client-input/index.ts`
- `src/pages/NewClient.tsx`

