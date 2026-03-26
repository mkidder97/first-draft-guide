

## Form Cleanup + Auto-Detect Market

Single file: `src/pages/NewClient.tsx`

### Change 1 — Remove Building Count and Duration fields

**Interface & defaults (lines 22-40):**
- Remove `buildingCount: string;` and `duration: string;` from `ClientFields`
- Remove `buildingCount: ""` and `duration: ""` from `emptyFields`

**handleParse (lines 79-87):** Remove `buildingCount` and `duration` lines from setFields

**handleParseScreenshot (lines 118-126):** Remove same two lines from setFields

**handleSubmit (lines 143-180):**
- Line 149: Remove `building_count: fields.buildingCount ? parseInt(...)` from clients insert
- Lines 157-168: Delete entire `parseContractEndDate` helper function
- Lines 175, 178: Remove `duration` and `contract_end_date` from agreements insert

**FieldsForm (lines 345-384):** Remove Building Count div (lines 345-354) and Duration div (lines 377-384)

### Change 2 — Auto-detect market from address

- **Line 1:** Change `import { useState }` to `import { useState, useEffect }`
- **After line 51** (state declarations): Add useEffect that watches `fields.address`, extracts city via regex, and auto-fills `fields.markets` if empty
- **Line 227:** Update Textarea placeholder to `"e.g. New client Acme Corp at 123 Main St Houston TX 77001. Annual PM services for their Dallas and Houston properties."`

