# ETS Report Builder v2.6.0

Vite + React MVP for the ETS Survey / Final Survey report builder.

## v2.6 changes
- Explicit dark application theme with green accent.
- Live preview is always 2 pages per row.
- Clicking a page opens a fullscreen viewer.
- Viewer supports mouse wheel zoom, buttons, drag/pan, and two-finger pinch zoom.
- Floating bottom navigation: Preview left; Previous/Next right.
- PDF export renders a clean off-screen report clone. UI-only page numbers and TEMPLATE badges are removed.
- PDF render uses `html2canvas` scale 5.
- Runtime report backgrounds are only `bg-01.png` and `bg-02.png`; reference snapshots are not used as page backgrounds.
- Client logo is a dynamic cover asset.

## Run

```bash
pnpm install
pnpm run dev
```

## Build

```bash
pnpm run build
```

Cloudflare Pages: build command `pnpm run build`, output directory `dist`.


## v2.6 export model

- PDF and PPTX use the same rendered page bitmap so both outputs match the live preview.
- Export scale is 2.5× instead of 5× to reduce memory usage and file size.
- JPEG quality is 0.90. Pages are rendered sequentially so only one high-resolution canvas is active at a time.
- PDF UI overlays are removed from the export clone.
- PPTX uses one bitmap per 16:9 slide via PptxGenJS; it is intentionally image-based for MVP fidelity, not element-editable.
