<div align="center">

<img src="public/logo.png" alt="Whiteboard logo" width="96" />

# Whiteboard

**A free, no-signup online whiteboard for sketching ideas and drawing diagrams.**

[Open the app](https://imranpollob.github.io/whiteboard/)

</div>

---

Whiteboard is a fast, distraction-free canvas for thinking out loud. Open it, start drawing, and come back later to find your work exactly where you left it. There are no accounts and no servers: everything stays in your browser.

## Features

- **Full drawing toolkit.** Built on [Excalidraw](https://excalidraw.com/), with freehand drawing, shapes, arrows, lines, text, images, colors, undo/redo, zoom and pan, and keyboard shortcuts.
- **Multiple boards.** Create, rename, switch between, and delete boards from a compact switcher. The app reopens your most recent board and sets up a fresh one on first launch.
- **Automatic saving.** Changes are saved locally to IndexedDB as you work, including embedded images and the canvas background, so they survive refreshes and browser restarts.
- **Import and export.** Export to PNG, SVG, or an editable `.excalidraw.json` file, and import `.excalidraw` files back onto the current board.
- **Fullscreen mode.** Present or focus with one click. A single floating control brings you back, and `Esc` works as expected.
- **Light and dark themes** with a responsive layout that works on desktops, tablets, and phones.

## Tech stack

React, TypeScript, Vite, Excalidraw, Tailwind CSS, Lucide icons, and Vitest. Persistence uses a small IndexedDB wrapper with no external database or backend. The app ships as a static site on GitHub Pages.

## Getting started

You'll need Node.js 20 or newer.

```bash
git clone https://github.com/imranpollob/whiteboard.git
cd whiteboard
npm install
npm run dev
```

| Command           | What it does                                      |
| ----------------- | ------------------------------------------------- |
| `npm run dev`     | Start the development server                      |
| `npm test`        | Run the test suite                                |
| `npm run lint`    | Lint the codebase (zero warnings allowed)         |
| `npm run build`   | Type-check and create a production build in `dist/` |
| `npm run preview` | Preview the production build locally              |

## Project structure

```text
src/
  components/  WhiteboardEditor, AppHeader, BoardSwitcher, FullscreenControls
  hooks/       useBoards, useAutosave, useFullscreen
  lib/         IndexedDB wrapper, board repository, export helpers
  types/       Board types and serialization
```

Storage sits behind a small `BoardRepository` interface, so the editor doesn't depend on how boards are persisted.

## Design

The interface follows the [personal brand theme](https://imranpollob.github.io/personal-brand-theme/): a teal accent, Outfit headings, Plus Jakarta Sans body text, and a custom whiteboard and pencil logo. Theme tokens are bundled into `src/index.css`, so the app works fully offline. Web fonts and the shared tools launcher in the header load from the network as optional enhancements and fail silently when unavailable.

## Deployment

The site deploys to GitHub Pages through GitHub Actions.

1. In your repository, open **Settings → Pages** and set the source to **GitHub Actions**.
2. Push to `main`, or run the workflow manually. The [deploy workflow](.github/workflows/deploy.yml) installs dependencies, runs the tests, builds, and publishes `dist/`.

The app is served from the `/whiteboard/` subpath, configured as `base` in `vite.config.ts`. If you fork it under a different repository name or username, update that value along with the URLs in `index.html`, `public/robots.txt`, and `public/sitemap.xml`.

## Good to know

- Boards are stored in your browser only. There is no sync across devices, and clearing site data removes them. Export important boards as `.excalidraw.json` files for backup.
- Only the canvas background is persisted from the editor's app state. Zoom, scroll position, and selection reset between sessions.
- Boards with many large images use more storage and produce larger exports, and browsers may reclaim site data when storage runs low.

## Acknowledgements

Whiteboard is powered by the excellent [Excalidraw](https://github.com/excalidraw/excalidraw) editor component.
