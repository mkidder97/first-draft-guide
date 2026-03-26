

## Dashboard Enhancements: Service Filter, View Button, CSV Export

Three additive changes to `src/pages/Index.tsx` only. No other files touched.

### Change 1 — Service Type Filter
- **Line 22-25**: Add `Eye, Download` to lucide-react imports
- **Line 75**: Add `const [serviceFilter, setServiceFilter] = useState("all");`
- **Lines 163-170**: Replace `filteredClients` useMemo to include `serviceFilter` dependency and filter by `a?.service_types?.includes(serviceFilter)`
- **Lines 248-257**: Replace standalone search `<div>` with flex row containing search input + Select dropdown for service types

### Change 2 — View Button Column
- **Line 309**: Add `<TableHead className="text-right">View</TableHead>` after the Delete column header
- **Line 315**: Update `colSpan` from 9 to 10
- **After line 412** (after Delete TableCell): Add View TableCell with Link + Button using Eye icon

### Change 3 — CSV Export
- **Line 187**: Replace bare `<h1>` with flex row containing h1 + Export CSV button (Download icon)
- **Before the return statement** (~line 184): Insert `exportToCSV` function that builds CSV from all clients and triggers download

