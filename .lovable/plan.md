

## Phase 5: Mark as Signed Flow with n8n Webhook

### Single file change: `src/pages/AgreementDetail.tsx`

**New imports**: `useState` from React, `AlertDialog` components from shadcn, `useQueryClient` from react-query, `useToast`/`toast`, `CheckCircle` icon from lucide-react.

**Add env comment** at top of file: `// Env required: VITE_N8N_WEBHOOK_URL = https://mkidder97.app.n8n.cloud/webhook/src-client-portal`

**State additions**:
- `webhookError: boolean` — tracks if webhook failed after successful DB update
- `isMarking: boolean` — loading state during the sign flow
- `showConfirm: boolean` — controls AlertDialog visibility

**"Mark as Signed" button** (in the header button group, next to PDF buttons):
- Only rendered when `agreement.status === "draft" || agreement.status === "sent"`
- Opens an `AlertDialog` confirmation dialog

**On confirm flow**:
1. Update agreement in Supabase: set `status: "signed"`, `signed_at: new Date().toISOString()`. On failure → show toast error, stop.
2. Invalidate query cache so the page re-fetches with new status.
3. POST to `import.meta.env.VITE_N8N_WEBHOOK_URL` with `{ clientName, address, serviceType, agreementId }`. On failure → set `webhookError = true`, show inline error with "Retry Webhook" button.
4. On success → show toast: "Agreement marked as signed. OneDrive folder is being created."

**After signed**: The existing status badge in the header already shows green "Signed". Add `signed_at` formatted date next to it when status is "signed".

**Retry Webhook button**: Shown inline (below header area) when `webhookError` is true. Re-sends the POST without touching Supabase. On success, clears error and shows success toast.

**No .env changes needed** — the env var `VITE_N8N_WEBHOOK_URL` will be referenced via `import.meta.env` only. The user is expected to have it set.

