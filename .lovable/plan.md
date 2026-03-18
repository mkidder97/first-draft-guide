

## Analytics Dashboard Overhaul + Contract End Date

### Change 1 — Database Migration
Add `contract_end_date` column to `agreements` table:
```sql
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS contract_end_date date;
```

### Change 2 — NewClient.tsx (agreement insert)
- Add `parseContractEndDate(duration, createdAt)` helper function that extracts year count from duration string and computes an end date
- Pass `contract_end_date` in the agreement insert call at line 159

### Change 3 — Full Index.tsx Rewrite
Replace the entire dashboard while preserving mutations, query, SERVICE_LABELS, and statusColor.

**New imports:** `Building2`, `TrendingUp`, `AlertTriangle` from lucide-react; `addDays`, `differenceInDays`, `parseISO` from date-fns

**Remove:** `expandedClients` state, `toggleClient`, `useEffect` for expanding, `ChevronRight`, `ClientGroup` type, `FileText`, `Send` imports, collapsible table logic

**Section 1 — 5 KPI cards** (grid-cols-2 lg:grid-cols-5):
- Total Clients, Buildings Under Management (sum building_count), Active Agreements (signed count), Pipeline (draft+sent), Expiring Soon (signed with contract_end_date within 90 days, amber when >0)

**Section 2 — Market breakdown cards:**
- Group clients by `markets` field, show client count + building count per market with colored dots
- Only render if any clients have markets set; null markets grouped as "Unassigned"

**Section 3 — Expiring contracts alert:**
- Yellow alert banner listing signed agreements expiring within 90 days, with client name, days remaining, and link to agreement detail
- Hidden entirely when nothing is expiring

**Section 4 — Flat client table:**
- One row per client (first agreement), no collapsible groups
- Columns: Client Name (linked), Address, Markets, Buildings, Services, Status, Contract End, Update Status dropdown, Delete button
- Clients with no agreements show "No agreement" in services column and skip action columns

**Preserved unchanged:** `updateStatus` mutation, `deleteAgreement` mutation, Supabase query, skeleton loading, empty state, search input

### Technical Details
- Agreement type updated to include `contract_end_date: string | null`
- `filteredGroups` renamed to `filteredClients`, simplified to flat filter (no grouping logic)
- Market grouping computed via `useMemo` reducing clients into a map of `{ clients: number, buildings: number }`
- Expiring agreements computed via `useMemo` filtering signed agreements where `differenceInDays(parseISO(contract_end_date), new Date()) <= 90`

