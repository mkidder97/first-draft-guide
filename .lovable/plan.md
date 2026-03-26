

## Add Pan & Zoom to PropertyAnnotator

Single file: `src/components/PropertyAnnotator.tsx`

### Approach
Instead of modifying the Google Maps Static API URL (which would require re-fetching the image), implement canvas-level pan and zoom using a 2D transform (offset + scale). Add a "Move" tool mode so the user can switch between drawing and panning.

### Changes

**New imports**: Add `Move, ZoomIn, ZoomOut` from lucide-react.

**New state** (after existing state declarations):
- `scale` (number, default 1) — zoom level
- `offset` ({x, y}, default {x:0, y:0}) — pan offset
- `mode` — expand tool to include `"pan"` alongside `"rect"` and `"freehand"`

**Updated `getCanvasPoint`**: Transform mouse coordinates by subtracting offset and dividing by scale, so shapes are stored in image-space coordinates regardless of pan/zoom.

**Updated `redraw`**: Apply `ctx.translate(offset.x, offset.y)` and `ctx.scale(scale, scale)` before drawing the image and shapes. Reset transform after.

**Mouse handlers**: When `mode === "pan"`, mouse drag updates `offset` instead of creating shapes. Drawing modes work as before but coordinates are transformed.

**Zoom**: 
- Mouse wheel on canvas adjusts `scale` (clamped 0.5–4x), zooming toward cursor position by adjusting offset accordingly.
- Zoom in/out buttons in toolbar for quick +/- 0.25 steps.
- Display current zoom % as text.

**Toolbar additions** (in the tool button group):
- "Move" button with `Move` icon (active when mode is "pan")
- Zoom In / Zoom Out buttons with current zoom level display
- "Reset View" — resets scale to 1 and offset to {0,0}

**Save behavior**: Before saving, temporarily reset transform to identity, redraw at full resolution, export `toDataURL`, then restore the user's view. This ensures the saved image captures the full map regardless of current pan/zoom.

**Help text update**: Change bottom text to mention "Use Move tool to pan, scroll wheel to zoom."

