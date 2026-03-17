

## Update Dashboard: One Row Per Agreement

### Change
Flatten the client+agreements data so the table shows **one row per agreement** instead of one row per client. This fixes the problem where only the most recent agreement's status was controllable.

### Implementation (`src/pages/Index.tsx`)

1. **Keep unchanged**: stat cards, search filter, empty state, data query (`select("*, agreements(*)")`)

2. **Flatten data for table**: After fetching, map clients+agreements into a flat array:
   ```
   clients.flatMap(c => c.agreements.map(a => ({ ...a, client: c })))
   ```

3. **Updated table columns**:
   - Client Name → links to `/agreements/{agreement.id}`
   - Property Address → from parent client
   - Markets → from parent client
   - Building Count → from parent client
   - Service Type → single badge for that agreement's `service_type`
   - Status → badge for that agreement
   - Created Date → agreement's `created_at`
   - Update Status → dropdown targeting that specific `agreement.id`

4. **Search filter**: Apply against the flattened rows using the client's name/address

5. **Status mutation**: Already targets a specific `agreementId` — no change needed

