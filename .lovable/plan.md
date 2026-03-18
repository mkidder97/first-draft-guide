

## Remove Frequency Field + Insert Mock Client

### Change 1 — NewClient.tsx (6 edits)
- **Line 29**: Remove `frequency: string;` from `ClientFields` interface
- **Line 40**: Remove `frequency: "",` from `emptyFields`
- **Line 86**: Remove `frequency: data.frequency || "",` from `handleParse`
- **Line 127**: Remove `frequency: fields.frequency || null,` from `handleSubmit`
- **Line 165**: Update placeholder text to remove "quarterly visits" reference
- **Lines 289-296**: Delete the entire Frequency field `<div>` in `FieldsForm`

### Change 2 — AgreementDetail.tsx (3 edits)
- **Line 221**: Remove `["FREQUENCY:", agreement!.frequency || "—"],` from `buildWebhookPayload`
- **Line 295**: Remove `["FREQUENCY:", agreement.frequency || "—"],` from `generatePDF`
- **Line 429**: Remove `<InfoRow label="FREQUENCY" value={agreement.frequency || "—"} />` from the client info grid

### Change 3 — Insert mock client data
Use the database insert tool to add:
- **clients**: Northgate Industrial Partners, 8100 Diplomat Drive Suite 200 Dallas TX 75247, markets "Dallas, Fort Worth", building_count 8
- **agreements**: linked to that client, service_types `{'annual_pm','survey'}`, duration "2 years", status "draft"

