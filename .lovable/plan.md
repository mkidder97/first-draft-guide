

## Fix: Annotation Image Missing from OneDrive PDF

### Root Cause
The agreement data is fetched once when the page loads. When the user saves annotations in the PropertyAnnotator, the `annotation_image` is written to the database but the **react-query cache is never invalidated**. So when "Mark as Signed" fires `buildWebhookPayload()`, it uses the stale `agreement` object which has `annotation_image: null`.

### Solution
Two changes in `src/pages/AgreementDetail.tsx`:

1. **Re-fetch agreement before building webhook PDF**: In `handleMarkSigned`, after the status update and cache invalidation, **await the refetch** so the `agreement` object has the latest `annotation_image` before calling `buildWebhookPayload()`. Alternatively, fetch the annotation_image directly from the DB inside `buildWebhookPayload`.

2. **Also invalidate after PropertyAnnotator saves**: Pass an `onSave` callback to `PropertyAnnotator` that invalidates the `["agreement", id]` query, so the cached agreement stays current even before signing.

### Preferred approach — fresh fetch in buildWebhookPayload
Change `buildWebhookPayload` from a sync function to async. Before building the PDF, do a fresh single-row fetch of the agreement to get the latest `annotation_image`:

```typescript
async function buildWebhookPayload() {
  // Fresh fetch to get latest annotation_image
  const { data: fresh } = await supabase
    .from("agreements")
    .select("*")
    .eq("id", agreement!.id)
    .single();
  
  const annotImg = fresh?.annotation_image || (agreement as any).annotation_image;
  // ... rest of PDF building, use annotImg instead of (agreement as any).annotation_image
}
```

Update callers (`handleMarkSigned`, retry handler) to `await buildWebhookPayload()`.

### Also: onSave callback for PropertyAnnotator
Pass `onSave={() => queryClient.invalidateQueries({ queryKey: ["agreement", id] })}` to the `<PropertyAnnotator>` component so the local cache refreshes after annotation save. This ensures "Generate PDF" (local download) also picks up the latest annotation.

### Files changed
- `src/pages/AgreementDetail.tsx` only

