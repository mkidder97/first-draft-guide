

## Phase 2: AgreementDetail.tsx Cleanup

Four targeted changes to `src/pages/AgreementDetail.tsx` only.

### Change 1 — Remove dead code
- **Lines 193-206**: Delete the `siblingAgreements` useQuery block
- **Line 209**: Delete `const hasCombined = ...`
- **Lines 307-330**: Delete `generateCombinedPDF` function
- **Lines 378-383**: Delete the "Generate Combined PDF" button
- **Line 18**: Remove `FileStack` from the lucide-react import

### Change 2 — Fix scope paragraph rendering
- **Lines 450-455**: Replace the single `<p>` joining all scopes with a loop rendering each service type as its own labeled subsection using `formatServiceType(st)` as a subheading

### Change 3 — Add Reopen button
- Add `handleReopen` async function (updates status to "draft", sets signed_at to null, invalidates query, shows toast)
- **After line 364** (after the signed_at date span): Add a Reopen button visible only when `agreement.status === "signed"`, using the already-imported `RefreshCw` icon

### Change 4 — Update label
- **Line 446**: Change `"SERVICE TYPE"` to `"SERVICES"`

