

## Fix Duplicate Form in NewClient.tsx

### What changes
- **Remove** the entire `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` wrapper (lines 154-212)
- **Keep** the AI Chat card as a standalone card with `mb-6`
- **Keep** the Review & Save card exactly as is
- **Remove** the `Tabs` import on line 4 (no longer used)

### Result
Two stacked cards: AI Chat card on top → Review & Save card below. No tabs, no duplicate `FieldsForm`. AI parses text into the form fields below; user can also type directly.

### Affected lines
- **Line 4**: Remove `Tabs, TabsContent, TabsList, TabsTrigger` import
- **Lines 154-212**: Replace Tabs wrapper with just the AI Chat card (the content from `TabsContent value="ai"` extracted as a standalone card with `className="mb-6"`)
- No changes to state, handlers, submit flow, or `FieldsForm` component

