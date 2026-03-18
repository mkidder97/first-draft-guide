

## Three Changes to `src/pages/Index.tsx`

### Change 1 — Loading skeleton
**Lines 165-166**: Replace `<p>Loading…</p>` with skeleton stat cards + skeleton table rows.
**Line 1 (imports)**: Add `import { Skeleton } from "@/components/ui/skeleton"`.

The skeleton block renders 4 skeleton cards in the stat grid, then a skeleton card with 4 rows of `Skeleton` bars mimicking the table.

### Change 2 — Show zero-agreement clients
**Line 109**: Remove `.filter((c) => c.agreements.length > 0)`.
**Lines 221-225**: Replace the status `Badge` in the client header row with a conditional: if `group.agreements.length === 0`, show a `<Link to="/new-client"><Badge>No agreements</Badge></Link>`; otherwise show the existing count badge.
**Line 197**: Update `colSpan` from 8 to 9 (new Delete column).
**Line 227**: Add an extra empty `<TableCell />` for the new Delete column in the client header row.

### Change 3 — Delete agreement with confirmation
**Line 18 (imports)**: Add `Trash2` to lucide-react imports.
**New import**: Add AlertDialog components from `@/components/ui/alert-dialog`.
**After line 94**: Add `deleteAgreement` mutation calling `supabase.from("agreements").delete()`.
**Line 192**: Add `<TableHead>Delete</TableHead>` after "Update Status".
**After line 266**: Add a new `<TableCell>` with `AlertDialog` wrapping a ghost `Trash2` button, confirmation dialog, and delete action.

All three changes are in `src/pages/Index.tsx` only. No other files touched.

