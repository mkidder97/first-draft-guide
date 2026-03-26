

## Combined Plan: Rotatable Rectangles + PDF Annotation Image Placement

Two files: `src/components/PropertyAnnotator.tsx` and `src/pages/AgreementDetail.tsx`

---

### Part 1 — Per-Shape Rotation Editing (PropertyAnnotator.tsx)

**Problem**: The box angle slider only affects new rectangles. Users need to adjust rotation of already-drawn shapes.

**Changes**:

1. **New state**: `selectedShapeIndex: number | null` — tracks which drawn shape is selected
2. **Hit testing on mouse down**: Before starting a new draw, check if the click lands inside an existing rect shape (using inverse-rotation point test). If yes, select it instead of drawing.
3. **Slider syncs with selected shape**: When a shape is selected, the box angle slider shows its rotation. Moving the slider updates that shape's rotation in real time via `setShapes`.
4. **Visual feedback**: Selected shape renders with a dashed highlight border in `redraw`
5. **Deselect**: Clicking empty canvas or pressing Escape clears selection and resumes normal drawing mode
6. **Freehand shapes**: Not selectable for rotation (they have no rotation property)

---

### Part 2 — Move Annotation Image Before Scope in PDF (AgreementDetail.tsx)

**Problem**: The annotation image currently renders after "SCOPE OF SERVICES". User wants it between client info and scope.

**Changes in both `generatePDF` and `buildWebhookPayload`**:

Move these lines:
```typescript
const annotImg = (agreement as any).annotation_image;
if (annotImg) ctx.addAnnotationImage(annotImg);
```

From **after** the scope/notes block to **before** `ctx.addHeading("SCOPE OF SERVICES")` — so the property map appears right after the client info block.

No changes to `createPDFContext` or `addAnnotationImage` function itself needed — it already handles heading, image sizing, and page breaks correctly.

