

## Add Nearest Airport Detection to NewClient Form

Single file: `src/pages/NewClient.tsx`

### Change 1 — Import Badge
- **Line 13**: Add `import { Badge } from "@/components/ui/badge";`

### Change 2 — Add nearestAirport state + AIRPORTS list + useEffect
- **After line 58** (existing state declarations): Add `const [nearestAirport, setNearestAirport] = useState<string | null>(null);`
- **Before line 74** (before the market auto-detect useEffect): Add the full `AIRPORTS` array constant (70+ airport entries with city lists) and the useEffect that matches `fields.address` against airport cities, setting `nearestAirport` to `"CODE — Name"` or null

### Change 3 — Pass nearestAirport to FieldsForm
- **Lines 344-356**: Add `nearestAirport={nearestAirport}` prop to the `<FieldsForm>` call

### Change 4 — Update FieldsForm props + render airport badge
- **Lines 399-411**: Add `nearestAirport: string | null;` to the props type and destructuring
- **After line 445** (after the satellite image block, before Contact Person): Insert the nearest airport display block with Badge component showing `✈ {nearestAirport}`

