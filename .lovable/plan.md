

## Update Post-Save Redirect in NewClient.tsx

### Changes (all in `handleSubmit`)

1. **Agreements insert** (~line 109-111): Add `.select("id")` and capture returned data as `insertedAgreements`
2. **Navigation** (~line 128): Replace `navigate("/agreements")` with conditional redirect:
   - Single agreement → `/agreements/${id}`
   - Multiple agreements → `/` (dashboard)

Both changes are mechanical — no new logic, imports, or state needed.

