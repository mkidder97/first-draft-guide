

## Add Internal Client Notes

### Change 1 — Database Migration
```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes text;
```

### Change 2 — AgreementDetail.tsx (4 edits)

**Line 1**: Add `useEffect` to the React import:
`import { useState, useEffect } from "react";`

**Line 7**: Add `CardHeader, CardTitle` to card imports:
`import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";`

**After line 20** (toast import): Add Textarea import:
`import { Textarea } from "@/components/ui/textarea";`

**Inside the component** (after existing state declarations): Add three new state variables (`notes`, `isSavingNotes`, `notesLoaded`), the `useEffect` to populate notes from client data, and the `handleSaveNotes` async function.

**After line 572** (closing `</Card>` of the main agreement card): Insert the Internal Notes card with Textarea, Save button (uses existing Loader2), and "not included in PDF" label.

No other files or logic touched.

