

## Fix Satellite View + Add Rotation Control

Single file: `src/components/PropertyAnnotator.tsx`

### Fix 1 — Force satellite view on interactive map
The `mapTypeId="satellite"` prop may not be applying correctly. Move it into the `options` object as `mapTypeId: "satellite"` to ensure it takes effect on load. This guarantees the navigate phase shows satellite imagery, not roadmap.

### Fix 2 — Add heading (rotation) control during navigate phase
Google Maps JavaScript API supports a `heading` parameter on satellite/tilt views. Add a rotation slider (0-360 degrees) to the navigate phase toolbar so the user can rotate the satellite view before freezing it. When "Start Annotating" is clicked, pass the current heading to the Static Maps API URL as `&heading={degrees}`.

**Implementation:**
- Add `rotation` state (number, default 0)
- Add a rotation slider (HTML range input, 0-360) and a "Reset" button below the map during navigate phase
- On rotation change, call `map.setHeading(rotation)` to rotate the satellite view live
- In `handleStartAnnotating`, read `map.getHeading()` and append `&heading=${heading}` to the Static Maps API URL
- Add `RotateCw` icon from lucide-react for the rotation label

**Note:** Google Maps `setHeading()` only works when the map is in satellite/hybrid mode with sufficient zoom and 45-degree imagery available. For areas without 45-degree imagery, rotation won't have a visible effect — this is a Google Maps data limitation, not a bug.

### Toolbar layout (navigate phase)
```text
[Interactive satellite map with rotation applied]
[🔄 Rotate: [====slider====] 127°  |  Reset  |  📍 Start Annotating]
Pan, zoom, and rotate the map...
```

