

## Phase 4: Client Dashboard with Agreement Status Management

### What we're building
Transform the placeholder Dashboard into a data-rich landing page with stat cards, a client table with inline status management, and real-time search.

### Implementation (single file: `src/pages/Index.tsx`)

**1. Data fetching**
- Query `clients` table with `select("*, agreements(*)")` to get clients joined with all their agreements in one query
- Derive all stats and table data from this single query result

**2. Summary stat cards (4-card grid)**
- Total Clients — count of clients
- Draft / Sent / Signed Agreements — count agreements by status across all clients
- Use a responsive grid: `grid-cols-2 lg:grid-cols-4`

**3. Search input**
- Controlled input above the table, filters clients by name or address (case-insensitive, client-side)

**4. Client table columns**
| Column | Source |
|---|---|
| Client Name | `clients.name`, links to `/agreements/{firstAgreementId}` |
| Property Address | `clients.address` |
| Markets | `clients.markets` or "—" |
| Building Count | `clients.building_count` or "—" |
| Service Types | Badges from all client agreements' `service_type` |
| Overall Status | Badge from most recent agreement status (gray/blue/green) |
| Created Date | `clients.created_at` |
| Status Dropdown | `<Select>` per most-recent agreement, updates status inline |

**5. Inline status update**
- Each row gets a `<Select>` with Draft/Sent/Signed options based on the client's most recent agreement
- On change: update `agreements` table; if "signed", also set `signed_at = new Date().toISOString()`
- After mutation, invalidate the query to refresh all data
- Use `useMutation` from react-query with `queryClient.invalidateQueries`

**6. Empty state**
- If no clients, show a centered message with an "Add First Client" button linking to `/new-client`

**7. Reuse existing patterns**
- `SERVICE_LABELS` and `statusColor` from `Agreements.tsx` will be duplicated into Index.tsx (or could be extracted, but keeping it simple for now)
- Uses existing shadcn components: Card, Table, Badge, Select, Input, Button

No database changes needed — all data is already available in the existing tables.

