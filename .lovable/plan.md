

## Add Drag-to-Move for Drawn Shapes

Single file: `src/components/PropertyAnnotator.tsx`

### Problem
After drawing a shape, the user cannot reposition it. They can select it and rotate it, but there's no way to drag it to a different location.

### Solution
When a shape is selected and the user clicks-and-drags on it, move the shape by updating all its points by the drag delta.

### Changes

1. **New state**: `dragStart: Point | null` — tracks the mouse position at the start of a drag on a selected shape

2. **Update `handleMouseDown`**: When clicking on an already-selected shape, start a drag instead of re-selecting. Record the click point as `dragStart`.

3. **Update `handleMouseMove`**: When `dragStart` is set (dragging a selected shape), calculate the delta from `dragStart` to current mouse position. Update all points of the selected shape by that delta. Update `dragStart` to current point (continuous dragging).

4. **Update `handleMouseUp`**: Clear `dragStart`.

5. **Cursor feedback**: When hovering over a shape, show `cursor-move` instead of `cursor-crosshair`. This requires tracking hover state or applying it when a shape is selected.

### Interaction flow
- Click empty area → start drawing new shape
- Click existing shape (nothing selected) → select it (highlight + sync rotation slider)
- Click-and-drag on selected shape → move it
- Click empty area while shape selected → deselect, start new drawing
- Escape → deselect

### Technical detail
For rectangles, moving means adding delta to both corner points. For freehand, adding delta to every point in the array. The drag uses continuous delta (updating dragStart each mouse move) for smooth movement.

