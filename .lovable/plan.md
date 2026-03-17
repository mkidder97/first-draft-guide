

## Dashboard & Document Improvements

Three changes across three files.

### 1. Dashboard: Group by Client (`src/pages/Index.tsx`)

Replace the flat table with collapsible client groups using Collapsible from `@radix-ui/react-collapsible` (already available as `src/components/ui/collapsible.tsx`).

- Keep stat cards and search unchanged
- After filtering, group `flatRows` back by `client.id`
- Render each client as a **group header row** spanning full table width with: toggle arrow (ChevronRight rotating on open), client name, address, markets, building count, agreement count badge
- Below each header, render individual agreement rows (service type badge, status badge, created date, status dropdown) — indented slightly
- All groups **expanded by default** using state: `expandedClients` initialized to all client IDs
- Search filters clients by name/address and auto-expands matching groups (reset collapsed state on search change)
- Use `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` wrapping table rows. Since these don't nest well inside `<tbody>`, we'll render each group as its own mini-section using divs or multiple tbody elements per group.

### 2. Combined PDF on Agreement Detail (`src/pages/AgreementDetail.tsx`)

- The existing query fetches `agreements.clients(*)`. Add a second query: fetch all agreements for the same `client_id` when the primary agreement loads
- If the client has 2+ agreements, show a "Generate Combined PDF" button next to "Generate PDF"
- Combined PDF logic: reuse the existing `generatePDF` helper structure but:
  - Header + client info block once at the top
  - Loop through all client agreements: for each, add a "SCOPE OF SERVICES — {Service Type}" heading with the correct `SCOPE_PARAGRAPHS` entry and any `scope_notes`
  - Standard terms (Reporting, Client Responsibilities, Fees, Limitation, Termination, Governing Law) once
  - Signature block once at the end
  - File name: `SRC_Combined_Agreement_{clientName}.pdf`

### 3. Agreements List: Client Filter (`src/pages/Agreements.tsx`)

- Add a `Select` dropdown above the table labeled "Filter by Client"
- Derive unique client names from the agreements data (already fetched with `clients(name)`)
- Default value "All Clients"; selecting a client filters the table to only that client's agreements
- Place it inline next to the card header or above the table

### Technical Notes
- No database changes needed
- Collapsible components already exist in the project
- jsPDF is already a dependency

