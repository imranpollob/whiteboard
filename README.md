# Whiteboard

A simple, free online whiteboard for sketching ideas, drawing diagrams, and explaining concepts. No account required. Drawings are saved locally in the browser.

Live app: https://imranpollob.github.io/whiteboard/

## Features (MVP)

- **Drawing canvas** — Excalidraw-powered editor: freehand, shapes, arrows, lines, text, images, colors, undo/redo, zoom/pan, keyboard shortcuts.
- **Multiple boards** — create, rename, switch, and delete (with confirmation) from the compact board switcher. Opens the most recently used board; creates a default board on first run.
- **Local autosave** — debounced IndexedDB persistence of elements, embedded files, and canvas background. Survives refresh and browser restarts. No account, no backend.
- **Import / export** — export PNG, SVG, or an editable `.excalidraw.json` file (images included); import `.excalidraw` / `.excalidraw.json` files back onto the current board.
- **Fullscreen** — standard browser fullscreen from the header button, with a single floating exit control; `Esc` exits natively.
- **Light / dark mode**, responsive layout (desktop-first, usable on tablets and phones), Lucide icons, minimal neutral styling.

## Tech stack

React + TypeScript, Vite, Excalidraw, Tailwind CSS, Lucide React, IndexedDB (lightweight wrapper, no ORM), Vitest. Deployed as a static SPA to GitHub Pages via GitHub Actions.

## Brand theme

The app chrome follows the [personal brand theme](https://imranpollob.github.io/personal-brand-theme/): teal signature (`#0d9488` light / `#14b8a6` dark), Outfit headings with Plus Jakarta Sans body, and the iP logo mark in the header. Token values are snapshotted into `src/index.css` (see the comment there) so the app works fully offline; only the webfonts and the tools launcher load from the network as progressive enhancement. The waffle button at the top-right opens the shared all-tools launcher (`launcher.js` hotlinked from the brand site so its tool list stays fresh; it fails silently offline and the header is unchanged).

## Run locally

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev      # start dev server
npm test         # run tests (vitest)
npm run lint     # eslint, zero warnings
npm run build    # typecheck (tsc -b) + production build to dist/
```

## Deploy to GitHub Pages

1. Push the repo to GitHub as `whiteboard` under user `imranpollob` (or update `base` in `vite.config.ts` and the URLs in `index.html`, `public/robots.txt`, `public/sitemap.xml` to match).
2. In the repository go to **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. Push to `main` (or run the workflow manually). The [deploy workflow](.github/workflows/deploy.yml) installs, tests, builds, and publishes `dist/`.
4. The app is served at `https://imranpollob.github.io/whiteboard/`. `vite.config.ts` sets `base: "/whiteboard/"` so all assets resolve under the subpath; client-side routing is intentionally absent (single view), so no SPA fallback hacks are needed.

## Project structure

```text
src/
  components/  WhiteboardEditor, AppHeader, BoardSwitcher, PresentationControls
  hooks/       useBoards, useAutosave, usePresentationMode
  lib/         db (IndexedDB wrapper), boardRepository, export (scene-file helpers)
  types/       board (Board / StoredBoard / serialization)
```

Persistence is split behind a small repository seam (`BoardRepository` over a `KeyValueStore` in `src/lib/db.ts`): a Firebase/cloud repository could be added later without touching the editor.

## Limitations

- Data lives in the browser's IndexedDB only — no account, no sync, no cross-device access. Clearing site data deletes boards.
- Only the canvas background color is kept from Excalidraw app state; scroll/zoom/selection are per-session view state.
- Large numbers of embedded images increase IndexedDB usage and export size; browsers may evict site data under storage pressure.
- The save indicator reflects local persistence, not cloud sync.

## Roadmap (not implemented)

### v1.1 — Presentation improvements

- Laser pointer, spotlight tool, keyboard navigation between boards, better presentation controls.

### v1.2 — Firebase integration

- Optional Google auth, cloud backup, cross-device sync, Firestore board metadata, Firebase Storage for assets, secure rules, local/cloud conflict handling.

### v1.3 — Content tools

- Image annotations, PDF import and annotation, reusable diagrams/templates, improved exporting.

### v2.0 — Advanced features

- LaTeX equations, code snippets, flowchart templates, more teaching/presentation tools.

### Optional long-term

- Shareable boards, real-time collaboration, AI-assisted diagram generation.
