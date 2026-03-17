

# SRC Client Portal — Forest Green Rebrand + Custom Logo

## What We're Doing
1. **Generate a custom SRC logo** using AI image generation — a modern, minimal logomark in forest green
2. **Swap the entire color palette** from navy blue (hue 213) to forest green
3. **Wire up the logo** in the sidebar, PDF header, and as the favicon

## Color Change
Replace all blue HSL values in `src/index.css` with forest green equivalents. Forest green base: ~`150 50% 28%` (#2D6A4F-ish).

**Light mode** — swap hue 213 → ~150 across all CSS variables (primary, secondary, muted, accent, sidebar, ring, border).

**Dark mode** — same hue shift.

This single file change rebrands every button, badge, sidebar, and accent across the entire app.

## Logo
Generate via edge function using `google/gemini-3.1-flash-image-preview`:
- Prompt: "Modern minimal logomark for 'SRC' roofing consultants. Forest green color (#2D6A4F). Clean geometric design, no text, transparent-style background, suitable for sidebar icon and favicon."
- Save to `public/src-logo.png`
- A simpler approach: create an inline SVG logo component directly — guaranteed crisp at any size, no generation needed.

**Recommendation**: Create a clean SVG `SrcLogo` component (stylized "SRC" monogram in forest green) — faster, always sharp, works in sidebar + PDF.

## Files Changed
| File | Change |
|------|--------|
| `src/index.css` | Replace all hue-213 values with forest green (~150) |
| `src/components/SrcLogo.tsx` | New SVG logo component |
| `src/components/AppSidebar.tsx` | Add logo next to "SRC Client Portal" text |
| `src/pages/AgreementDetail.tsx` | Update PDF header to include logo reference |
| `index.html` | Update `<title>` to "SRC Client Portal" |
| `public/favicon.ico` | Replace with green SRC favicon (or inline SVG favicon) |

## Memory Update
Update the color palette memory from navy blue `#1B4F8A` to forest green `#2D6A4F`.

