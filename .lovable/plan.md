

## Contacts Schema, Page, Sidebar + Route

### Change 1 — Database Migration
Create `contacts` table and add `contact_id` FK to `clients`:
```sql
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  title text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage contacts" ON contacts
  FOR ALL USING (auth.role() = 'authenticated');
```

### Change 2 — Create `src/pages/Contacts.tsx`
New page querying `contacts` with a client count subquery. Features:
- Table columns: Name, Email, Phone, Company, Title, Linked Properties, Created
- Search input filtering by name/email/company
- "New Contact" button toggles inline form at top (Name*, Email*, Phone, Company, Title)
- Insert to `contacts` table on save, invalidate query
- Empty state with "Add First Contact" CTA
- Uses same UI patterns as existing pages (Card, Table, Input, Button, Badge, toast)

### Change 3 — AppSidebar.tsx
- Add `Contact` to lucide-react import (line 1)
- Insert nav item `{ title: "Contacts", url: "/contacts", icon: Contact }` between "New Client" and "Clients" in navItems array

### Change 4 — App.tsx
- Add `import Contacts from "./pages/Contacts";` (line 14)
- Add `<Route path="/contacts" element={<Contacts />} />` after the `/new-client` route (line 36)

