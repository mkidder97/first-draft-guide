

## Phase 1: Schema Migration and Insert Logic Update

### Change 1 — Database Migration
Run migration to rename `service_type` to `service_types` (text array):
```sql
DELETE FROM agreements;
DELETE FROM clients;
ALTER TABLE agreements DROP COLUMN service_type;
ALTER TABLE agreements ADD COLUMN service_types text[] NOT NULL DEFAULT '{}';
```

Also update the `validate_service_type` trigger function to validate array elements instead of a single value (or drop it, since it references the old column).

### Change 2 — Update `NewClient.tsx` (lines 120-133)
Replace the multi-row insert with a single-row insert:
```typescript
const { data: insertedAgreements, error: agreementError } = await supabase
  .from("agreements")
  .insert({
    client_id: client.id,
    service_types: fields.serviceTypes,
    duration: fields.duration || null,
    frequency: fields.frequency || null,
    scope_notes: fields.scopeNotes || null,
    status: "draft",
  })
  .select("id");
```
Update the toast description (line 139) to say "1 draft agreement" instead of referencing serviceTypes.length agreements. The redirect logic stays the same — single agreement always goes to `/agreements/${id}`.

### Change 3 — Update `Index.tsx` type (line 47)
Change `service_type: string` to `service_types: string[]` in the Agreement interface.

### Change 4 — Update `src/integrations/supabase/types.ts`
**Note**: Per project rules, this file is auto-generated and should NOT be edited manually. It will update automatically after the migration runs. No manual edit needed.

### Not changed (as specified)
- `AgreementDetail.tsx` — Phase 2
- `Agreements.tsx` — Phase 2
- `Index.tsx` display logic — Phase 2
- App.tsx routing
- PDF generation logic

The app will have broken pages referencing `service_type` after this phase. That is expected.

