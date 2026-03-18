

## Rename Agreements to Clients List

### Change 1 — AppSidebar.tsx
- Replace `FileText` with `Users` in the lucide-react import
- Change navItems entry: title "Agreements" → "Clients", icon `FileText` → `Users`, URL stays `/agreements`

### Change 2 — Agreements.tsx (full rewrite)
Replace entire file with the user-provided Clients page that:
- Queries `clients` table with `agreements(*)` join instead of querying agreements with clients join
- Replaces client dropdown filter with a text search input
- Shows columns: Client, Address, Markets, Buildings, Services, Status, Created, Action
- Each row links to the agreement detail or offers "Add Agreement" if none exists
- Includes "New Client" button in header and empty state
- Exports as `Clients` (note: App.tsx import uses default export, so function name change is fine)

### Change 3 — No routing changes
Route `/agreements` stays mapped to this file. No App.tsx changes.

