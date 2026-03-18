

## Three-File Update: Image Parsing, Model Switch, Coming Soon Buttons

### Change 1 — Edge Function (`supabase/functions/parse-client-input/index.ts`)
- **Lines 40-49**: Replace body parsing to accept `{ message?, imageBase64?, mimeType? }` with validation requiring at least one
- **Lines 62-96**: Replace the Anthropic request block:
  - Define `extractionPrompt` without frequency field
  - Build `messages` array conditionally: vision request with image content block when `imageBase64` present, text-only otherwise
  - Switch model from `claude-sonnet-4-20250514` to `claude-haiku-4-5-20251001`
  - Use system prompt only for text mode (undefined for image mode)
- Keep all auth, error handling, CORS, and response parsing unchanged

### Change 2 — NewClient.tsx (`src/pages/NewClient.tsx`)
- Add imports: `Tabs, TabsList, TabsTrigger, TabsContent` from ui/tabs, `ImageIcon` from lucide-react
- Add state: `inputMode`, `selectedImage`
- Add `handleImageSelect` and `handleParseScreenshot` functions
- Replace the AI Chat card content with tabs:
  - **Text tab**: existing textarea + "Parse with AI" button (unchanged)
  - **Screenshot tab**: file input (png/jpeg/webp), image preview, "Parse Screenshot" button
- Card title updates dynamically based on active tab

### Change 3 — AgreementDetail.tsx (`src/pages/AgreementDetail.tsx`)
- **Line 18**: Add `Send, Sparkles` to lucide-react imports
- **Lines 366-367**: Insert two disabled "coming soon" buttons before the Generate PDF button, wrapped in `agreement.status !== "signed"` check:
  - "Send for Signature" with Send icon + "Soon" badge
  - "AI Draft" with Sparkles icon + "Soon" badge

