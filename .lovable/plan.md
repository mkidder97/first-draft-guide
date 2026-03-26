

## Surface Contacts Everywhere They Matter

The contacts data exists in the database and is linked to clients, but the app never displays it outside the standalone Contacts page. Here is a holistic plan to make contacts useful throughout the entire workflow.

### Current Gap
- **Dashboard table** — no contact column
- **Clients table** (`/agreements`) — no contact column  
- **Agreement Detail page** — no contact info shown anywhere
- **Agreement PDF** (local + OneDrive) — no contact name/email
- **New Client form** — contact is selected but never confirmed visually after submission

### Changes (4 files)

**1. Agreement Detail page (`src/pages/AgreementDetail.tsx`)**
- Fetch the contact alongside the client: update the query to join `clients(*, contacts(*))` via `contact_id`
- Add a **Contact card** below the client info block showing name, email, phone, title, and company
- Include contact name and email in the PDF client info block (both `generatePDF` and `buildWebhookPayload`) as two new rows: `CONTACT:` and `CONTACT EMAIL:`
- This makes the contact visible on-screen AND in the generated/exported PDF

**2. Dashboard (`src/pages/Index.tsx`)**
- Update the query from `clients(*, agreements(*))` to `clients(*, agreements(*), contacts(*))` using the `contact_id` foreign key
- Add a **Contact** column to the table between Client Name and Address, showing the contact name (or "—" if none)
- Keep it minimal — just the name, not the full card

**3. Clients page (`src/pages/Agreements.tsx`)**  
- Same query update: join contacts
- Add a **Contact** column showing the contact name and email in a compact format: `Name (email)`

**4. Agreement PDF — contact details in header block**
- In `createPDFContext` → `addClientInfo`, the existing rows are CLIENT, PROPERTY ADDRESS, AGREEMENT DATE, DURATION, SERVICES
- Add `CONTACT:` and `CONTACT EMAIL:` rows after CLIENT, sourced from the joined contact data
- Applied in both `generatePDF` (local download) and `buildWebhookPayload` (OneDrive PDF)

### Query approach
The `clients` table has a `contact_id` column referencing `contacts.id`. The Supabase query `clients(*, contacts(*))` will automatically resolve this FK relationship without needing an explicit join. The contact object will appear as `client.contacts` (or null if no contact is linked).

### No database changes needed
All data and relationships already exist. This is purely a display/integration task.

