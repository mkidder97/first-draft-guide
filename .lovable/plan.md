

## Fix Rotation to Work During Annotation

Single file: `src/components/PropertyAnnotator.tsx`

### Problem
The `heading` parameter in the Static Maps API only works where Google has 45-degree imagery. For most locations, the frozen snapshot ignores it — so the rotation the user set during navigation is lost, and buildings appear at an angle, making it impossible to draw aligned rectangles.

### Solution — Rotatable Rectangles
Add a **shape rotation slider** (0–360°) to the annotate-phase toolbar. When drawing a rectangle, it renders rotated around its center by the current angle. This lets the user match the angle of any building regardless of map orientation.

### Changes

**New state**: `shapeRotation` (number, default 0) — the angle applied to new rectangles.

**Pre-fill from map heading**: When transitioning from navigate → annotate, set `shapeRotation` to the map's heading value so it starts at the angle the user already chose.

**Shape data**: Add optional `rotation?: number` to the `Shape` interface. Store `shapeRotation` on each new rect shape.

**Drawing rotated rects** (in `redraw`): For rect shapes with a rotation value, use `ctx.save()` → `ctx.translate(centerX, centerY)` → `ctx.rotate(radians)` → draw rect centered at origin → `ctx.restore()`. Labels also render rotated.

**Freehand shapes**: Unaffected — they trace the building edge naturally.

**Toolbar addition**: Below the tool buttons in annotate phase, add a rotation slider (0–360°) with a `RotateCw` icon and degree readout, only visible when Rectangle tool is active. Include a "Reset" button to snap to 0°.

**Save logic**: Same rotation-aware drawing in the save render pass so the exported PNG matches what's on screen.

### Toolbar layout (annotate phase)
```text
[Back to Map] | [Rectangle] [Freehand] | [colors] | [label] | [undo][clear][save]
[🔄 Box angle: [====slider====] 45°  Reset]   ← only when Rectangle selected
```

