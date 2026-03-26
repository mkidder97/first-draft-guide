

## Wire Contacts into New Client Form

Single file: `src/pages/NewClient.tsx`

### Change 1 — Interface & defaults
- Add `contactId: string | null`, `contactName: string`, `contactEmail: string` to `ClientFields` interface (lines 22-28)
- Add matching defaults to `emptyFields` (lines 30-36)

### Change 2 — New imports
- Add `useQuery` from `@tanstack/react-query` (line 1-2 area)
- Add `{ Search as SearchIcon }` or reuse existing icons as needed

### Change 3 — Contact state in NewClient component
- Add `contactMode` state: `useState<"select" | "create">("select")`
- Add `contactSearch` state for the combobox query

### Change 4 — Parse handlers clear contact fields
- In `handleParse` setFields (line 87-93): add `contactId: null, contactName: "", contactEmail: ""`
- In `handleParseScreenshot` setFields (line 124-130): same three fields

### Change 5 — handleSubmit contact resolution
- Before the clients insert (line 147-156): resolve contact ID — if `contactMode === "create"` and name+email provided, insert to `contacts` table first
- Add `contact_id: resolvedContactId` to the clients insert

### Change 6 — FieldsForm contact selector UI
- Pass `contactMode`, `setContactMode`, `contactSearch`, `setContactSearch`, `contactResults` as additional props to `FieldsForm`
- Add "Contact Person" section above Markets field (before line 333) with:
  - **Select mode**: searchable input querying contacts by name/company (`.or(name.ilike, company.ilike)`), results as dropdown showing "Name — Company", clicking sets contactId/contactName/contactEmail
  - **Create mode**: two inputs for Contact Name and Contact Email
  - Toggle link between modes
- The contact search query uses `useQuery` with `contactSearch` as key, enabled when length > 1, limit 8

### Technical Notes
- `useQuery` and `supabase` are already available; just need the react-query import added
- Contact combobox is a simple Input + dropdown list (no need for cmdk/Command), keeping it lightweight
- `FieldsForm` props type updated to include the new contact-related props

