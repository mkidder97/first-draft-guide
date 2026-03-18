

## Plan: Two Targeted Fixes in AgreementDetail.tsx

### Fix 1 — Robust base64 prefix stripping
**Line ~207:** Replace the overly specific regex with a general one that handles all jsPDF `datauristring` output variants.

```
// Before
const pdfBase64 = dataUri.replace(/^data:application\/pdf;filename=generated\.pdf;base64,/, "");

// After
const pdfBase64 = dataUri.replace(/^data:application\/pdf;[^,]*base64,/, "");
```

### Fix 2 — Duration/Frequency before scope in combined PDF
**Lines ~253-256 (inside `siblingAgreements.forEach`):** Move Duration and Frequency above the scope paragraph, combining them on one line when both exist.

```
// Before
ctx.addBody(SCOPE_PARAGRAPHS[a.service_type] || "Scope to be determined.");
if (a.duration) ctx.addBody("Duration: " + a.duration);
if (a.frequency) ctx.addBody("Frequency: " + a.frequency);

// After
if (a.duration) ctx.addBody("Duration: " + a.duration + (a.frequency ? "   |   Frequency: " + a.frequency : ""));
else if (a.frequency) ctx.addBody("Frequency: " + a.frequency);
ctx.addBody(SCOPE_PARAGRAPHS[a.service_type] || "Scope to be determined.");
```

Both changes are scoped entirely to `buildWebhookPayload` and `generateCombinedPDF` respectively. No other functions touched.

