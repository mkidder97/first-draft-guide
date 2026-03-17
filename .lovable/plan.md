

Good catch. The plan's client info block will use `created_at` from the agreement record, labeled as "AGREEMENT DATE" — not "CONTRACT START DATE." No new columns needed. Everything else in the approved plan stays the same.

### Correction
- **Client info block label**: Change "CONTRACT START DATE" → "AGREEMENT DATE", mapped to `agreement.created_at`
- No schema changes required

This will be applied when building the `AgreementDetail.tsx` page and the PDF generation logic.

