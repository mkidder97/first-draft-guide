

## Property Annotator: Schema + Component + Agreement Detail Integration

### Change 1 — Database Migration
```sql
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS satellite_image_url text;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS annotation_data jsonb;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS annotation_image text;
```

### Change 2 — Create `src/components/PropertyAnnotator.tsx`
New self-contained canvas annotation component with:
- Rectangle and freehand drawing tools
- 4 color presets (In Scope, Out of Scope, Note, Complete) with legend
- Optional text labels on shapes
- Undo / Clear / Save toolbar
- Saves `annotation_data` (JSON shapes), `annotation_image` (base64 PNG), and `satellite_image_url` to the agreements table
- Hidden `<img>` loads the satellite URL, canvas mirrors its dimensions
- Uses `as any` casts for the new columns not yet in generated types

### Change 3 — Wire into `src/pages/AgreementDetail.tsx`
- **Import**: Add `PropertyAnnotator` import
- **State**: Add `satelliteUrl` state variable
- **useEffect**: When agreement loads, check for existing `satellite_image_url` on the agreement; if missing, build one from client address + Google Maps API key constant
- **Render**: Insert a new "Property Map" Card between the main agreement Card (line 598) and the Internal Notes Card (line 600), containing `<PropertyAnnotator>` with `agreementId`, `satelliteImageUrl`, and `existingAnnotations` props

### Technical Notes
- New columns use `as any` casts since `types.ts` is auto-generated and won't have them immediately
- The Google Maps API key is already hardcoded in `NewClient.tsx`; same approach used here via `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` with fallback
- No changes to PDF generation, webhook, or any other existing logic

