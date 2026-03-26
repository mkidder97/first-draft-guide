## Replace Static Map with Interactive Google Map + Canvas Annotation

Two files changed: `src/components/PropertyAnnotator.tsx` (full rewrite) and `src/pages/AgreementDetail.tsx` (minor prop change).

### New dependency

Install `@react-google-maps/api`

### PropertyAnnotator.tsx — Full rewrite with hybrid approach

**Props change**: Replace `satelliteImageUrl: string` with `address: string` so the component handles everything internally.

**Two-phase UI**:

1. **Navigate phase** (default): Renders an interactive `GoogleMap` from `@react-google-maps/api` in satellite view. Uses `useJsApiLoader` with the API key. Geocodes the `address` prop to get initial lat/lng center. User can pan, zoom, tilt freely. A prominent "Start Annotating" button overlays the map.
2. **Annotate phase**: On click, reads `map.getCenter()` and `map.getZoom()`, builds a Static Maps API URL at 640x640 (or larger) for that exact view, hides the Google Map, loads the static image into the existing canvas system. All current drawing logic (rect, freehand, colors, labels, undo, clear) works exactly as before on the frozen image. A "Back to Map" button returns to Navigate phase (preserving drawn shapes).

**Toolbar**: Only shows drawing tools, colors, labels, undo/clear/save during Annotate phase. Navigate phase shows just the "Start Annotating" button. Remove pan/zoom canvas controls (no longer needed — the real map handles navigation).

**Save**: Same as current — renders shapes onto canvas at full resolution, exports base64 PNG, saves `annotation_data`, `annotation_image`, and `satellite_image_url` to agreements table.

**Existing annotations**: If `existingAnnotations` exist, skip straight to Annotate phase using the stored `satellite_image_url`.

### AgreementDetail.tsx — Minor update

- Change the `PropertyAnnotator` call: pass `address={client?.address || ""}` instead of `satelliteImageUrl={satelliteUrl}`
- Also pass `existingSatelliteUrl={(agreement as any).satellite_image_url}` so previously annotated agreements reload their frozen image
- Remove the `satelliteUrl` state and its `useEffect` (the component handles map display internally now)
- Update the conditional render from `{satelliteUrl && (` to `{client?.address && (`

### Technical notes

- `useJsApiLoader` loads the Maps JS API once; geocoding uses `window.google.maps.Geocoder`
- Static Maps URL built as: `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=640x640&maptype=satellite&key=${apiKey}`
- Canvas drawing code (shapes, colors, redraw, save) stays identical — just remove the pan/zoom transform layer since the static image is already at the right view
- PDF export continues to work unchanged since `annotation_image` is still saved as base64  
  
  
  
north feature  
**The north indicator prompt** — I had drafted a north indicator to add to the canvas. That will still work with the new system since it draws in the `redraw` function on the frozen canvas
- &nbsp;