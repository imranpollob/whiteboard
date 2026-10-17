import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import WhiteboardEditor, { type WhiteboardScene, type WhiteboardTheme } from "./components/WhiteboardEditor";
import AppHeader, { type SaveStatus } from "./components/AppHeader";
import BoardSwitcher from "./components/BoardSwitcher";
import PresentationControls from "./components/PresentationControls";
import { usePresentationMode } from "./hooks/usePresentationMode";
import { useBoards } from "./hooks/useBoards";
import { useAutosave, type SaveStatus as StoreSaveStatus } from "./hooks/useAutosave";
import { downloadBlob, parseSceneFileText, slugify } from "./lib/export";
import type { Board, BoardElement } from "./types/board";

const THEME_KEY = "whiteboard.theme";

/** Brand tools launcher (hamburger). Hotlinked so the tool list stays fresh. */
const LAUNCHER_SRC = "https://imranpollob.github.io/personal-brand-theme/launcher.js";

/** Load the launcher script once, after React has committed the header slot. */
function useBrandLauncher() {
  useEffect(() => {
    // NOTE: the marker attribute must not be `data-brand-launcher` — the
    // launcher claims the first element with that exact attribute as its
    // mount slot, which would swallow this script tag in <head>.
    if (document.querySelector('script[data-brand-launcher-script]')) return;
    const s = document.createElement("script");
    s.src = LAUNCHER_SRC;
    s.defer = true;
    s.dataset.brandLauncherScript = "true";
    s.onerror = () => s.remove();
    document.head.appendChild(s);
  }, []);
}

function loadTheme(): WhiteboardTheme {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

const STORE_STATUS_TO_HEADER: Record<StoreSaveStatus, SaveStatus> = {
  idle: "saved",
  dirty: "unsaved",
  saving: "saving",
  saved: "saved",
  error: "error",
};

/**
 * App root: header (title, switcher slot, save status, file menu,
 * present + theme buttons) + editor + presentation overlay.
 *
 * State ownership: board collection + persistence live in
 * `useBoards`/`useAutosave`. This file owns the live Excalidraw draft:
 * scene edits update a local draft, autosave persists it debounced and
 * flushes on board switch. Excalidraw scene elements ({id, type, ...})
 * satisfy the generic `BoardElement` shape ({id, type, ...}) and `files`
 * (BinaryFiles) is stored opaquely — only `viewBackgroundColor` is kept
 * from app state; scroll/zoom/selection are session view state.
 */
export default function App() {
  const {
    boards,
    activeBoard,
    loading,
    createBoard,
    renameBoard,
    deleteBoard,
    switchBoard,
    updateLocalBoard,
  } = useBoards();
  const [draft, setDraft] = useState<Board | null>(null);
  const [theme, setTheme] = useState<WhiteboardTheme>(loadTheme);
  const [importError, setImportError] = useState<string | null>(null);
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { isPresenting, isFullscreen, enter, exit } = usePresentationMode();
  useBrandLauncher();

  const activeId = activeBoard?.id ?? null;

  const { status: storeStatus } = useAutosave(draft, {
    onSaved: updateLocalBoard,
  });
  const saveStatus = STORE_STATUS_TO_HEADER[storeStatus];

  // Track the draft of the active board; switching boards swaps the
  // draft (autosave flushes the previous board's pending edits first).
  useEffect(() => {
    setDraft(activeBoard);
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* private mode — theme just won't persist */
    }
  }, [theme]);

  const handleSceneChange = useCallback(
    (scene: WhiteboardScene) => {
      setDraft((prev) => {
        if (!prev || prev.id !== activeId) return prev;
        return {
          ...prev,
          updatedAt: Date.now(),
          elements: [...scene.elements] as unknown as BoardElement[],
          files: { ...scene.files },
          viewBackgroundColor: scene.appState.viewBackgroundColor ?? null,
        };
      });
    },
    [activeId],
  );

  const handleCreate = useCallback(() => {
    void createBoard(`Board ${boards.length + 1}`).then((b) => setDraft(b));
  }, [boards.length, createBoard]);

  const handleRename = useCallback(
    (id: string, title: string) => {
      // Keep the live draft in sync so the next autosave cannot
      // overwrite the new title with the stale one.
      setDraft((prev) => (prev && prev.id === id ? { ...prev, title } : prev));
      void renameBoard(id, title);
    },
    [renameBoard],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (draft?.id === id) setDraft(null);
      void deleteBoard(id);
    },
    [deleteBoard, draft?.id],
  );

  const slug = useMemo(() => slugify(activeBoard?.title ?? "board"), [activeBoard?.title]);

  const handleExportPng = useCallback(async () => {
    const api = apiRef.current;
    if (!api || !activeBoard) return;
    const { exportToBlob } = await import("@excalidraw/excalidraw");
    const blob = await exportToBlob({
      elements: api.getSceneElements(),
      appState: api.getAppState(),
      files: api.getFiles(),
      mimeType: "image/png",
    });
    downloadBlob(`${slug}.png`, blob);
  }, [activeBoard, slug]);

  const handleExportSvg = useCallback(async () => {
    const api = apiRef.current;
    if (!api || !activeBoard) return;
    const { exportToSvg } = await import("@excalidraw/excalidraw");
    const svg = await exportToSvg({
      elements: api.getSceneElements(),
      appState: api.getAppState(),
      files: api.getFiles(),
    });
    downloadBlob(`${slug}.svg`, new Blob([svg.outerHTML], { type: "image/svg+xml" }));
  }, [activeBoard, slug]);

  const handleExportJson = useCallback(async () => {
    const api = apiRef.current;
    if (!api || !activeBoard) return;
    const { serializeAsJSON } = await import("@excalidraw/excalidraw");
    const json = serializeAsJSON(
      api.getSceneElements(),
      api.getAppState(),
      api.getFiles() ?? {},
      "local",
    );
    downloadBlob(`${slug}.excalidraw.json`, new Blob([json], { type: "application/json" }));
  }, [activeBoard, slug]);

  const handleImportFile = useCallback(
    async (file: File) => {
      const api = apiRef.current;
      if (!api || !activeBoard) return;
      setImportError(null);
      try {
        const text = await file.text();
        const parsed = parseSceneFileText(text);
        const { restore } = await import("@excalidraw/excalidraw");
        const restored = restore(
          {
            elements: parsed.elements,
            appState: null,
            files: parsed.files,
          } as never,
          null,
          null,
        );
        api.addFiles(Object.values(restored.files ?? {}));
        api.updateScene({
          elements: restored.elements,
          appState: restored.appState,
        });
        setDraft((prev) => {
          if (!prev || prev.id !== activeBoard.id) return prev;
          return {
            ...prev,
            updatedAt: Date.now(),
            elements: [...restored.elements] as unknown as BoardElement[],
            files: { ...(restored.files ?? {}) },
          };
        });
      } catch (err) {
        setImportError(err instanceof Error ? err.message : "Could not import that file.");
      }
    },
    [activeBoard],
  );

  const onImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* CSS fallback already active — nothing more to do */
    }
  }, []);

  const switcherBoards = useMemo(
    () => boards.map((b) => ({ id: b.id, title: b.title, updatedAt: b.updatedAt })),
    [boards],
  );

  // Scene handed to the editor on board switch (applied imperatively via
  // updateScene, never by remounting, so typing focus survives). The draft
  // is preferred only when it belongs to the active board: on the render
  // that switches boards the draft still holds the previous board, so the
  // board list entry — identical once the draft sync effect runs — is used.
  // The editor ignores rebuilt values while boardId is unchanged.
  const initialScene = useMemo(
    () => {
      const source = draft && draft.id === activeId ? draft : activeBoard;
      const elements = source?.elements ?? [];
      const files = source?.files ?? {};
      const background = source?.viewBackgroundColor ?? null;
      if (elements.length === 0 && Object.keys(files).length === 0 && !background) {
        return null;
      }
      return {
        elements,
        files,
        ...(background ? { appState: { viewBackgroundColor: background } } : {}),
      };
    },
    [activeId, draft, activeBoard],
  );

  return (
    <div className={`app${isPresenting ? " is-presenting" : ""}`}>
      {!isPresenting && (
        <AppHeader
          title="Whiteboard"
          switcher={
            <BoardSwitcher
              boards={switcherBoards}
              activeId={activeId}
              onSelect={switchBoard}
              onCreate={handleCreate}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          }
          saveStatus={saveStatus}
          theme={theme}
          isPresenting={isPresenting}
          fileDisabled={!activeBoard}
          onExportPng={() => void handleExportPng()}
          onExportSvg={() => void handleExportSvg()}
          onExportJson={() => void handleExportJson()}
          onImport={onImportClick}
          onPresent={() => void enter()}
          onToggleTheme={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
        />
      )}
      <main className="app-main">
        {loading ? (
          <p className="app-empty">Loading boards…</p>
        ) : activeBoard ? (
          <WhiteboardEditor
            boardId={activeBoard.id}
            initialScene={initialScene as never}
            theme={theme}
            onSceneChange={handleSceneChange}
            onReady={(api) => {
              apiRef.current = api;
            }}
          />
        ) : (
          <p className="app-empty">Create a board to get started.</p>
        )}
        {importError && (
          <p className="app-import-error" role="alert">
            {importError}
          </p>
        )}
      </main>
      <input
        ref={fileInputRef}
        type="file"
        accept=".excalidraw,.excalidraw.json,.json,application/json"
        hidden
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleImportFile(file);
        }}
      />
      <PresentationControls
        visible={isPresenting}
        isFullscreen={isFullscreen}
        onExit={() => void exit()}
        onToggleFullscreen={() => void toggleFullscreen()}
      />
    </div>
  );
}
