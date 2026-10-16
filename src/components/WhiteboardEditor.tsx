import { useCallback, useEffect, useRef } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import type {
  BinaryFileData,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
  AppState,
} from "@excalidraw/excalidraw/types";

export type WhiteboardTheme = "light" | "dark";

type SceneElements = ReturnType<ExcalidrawImperativeAPI["getSceneElements"]>;
type SceneElement = SceneElements[number];

export interface WhiteboardScene {
  elements: readonly SceneElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
}

interface WhiteboardEditorProps {
  /** Stable board id. Scene updates are applied imperatively; the
   *  Excalidraw component itself is never remounted on typing or on
   *  every keystroke — only applied via updateScene when boardId changes. */
  boardId: string;
  initialScene: ExcalidrawInitialDataState | null | undefined;
  theme: WhiteboardTheme;
  /** Debounced change callback (elements + app state + files). */
  onSceneChange: (scene: WhiteboardScene) => void;
  onReady?: (api: ExcalidrawImperativeAPI) => void;
}

const DEBOUNCE_MS = 400;

/**
 * Theme-aware Excalidraw wrapper.
 *
 * Remount safety: the <Excalidraw> element below has NO `key` prop and
 * `initialScene` is consumed only for the first mount (kept in a ref).
 * Board switches call `api.updateScene()` imperatively instead of
 * remounting, so text editing focus is never lost while typing.
 */
export default function WhiteboardEditor({
  boardId,
  initialScene,
  theme,
  onSceneChange,
  onReady,
}: WhiteboardEditorProps) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const boardIdRef = useRef(boardId);
  const onSceneChangeRef = useRef(onSceneChange);
  onSceneChangeRef.current = onSceneChange;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // Capture the very first scene for mount-only initialData.
  const mountSceneRef = useRef(initialScene);
  // Skip the onChange fired by our own imperative updateScene call.
  const applyingRemoteRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleApi = useCallback((api: ExcalidrawImperativeAPI) => {
    apiRef.current = api;
    onReadyRef.current?.(api);
  }, []);

  // Apply a new board's scene imperatively when boardId changes.
  useEffect(() => {
    if (boardIdRef.current === boardId) return;
    boardIdRef.current = boardId;
    const api = apiRef.current;
    if (!api) return;
    applyingRemoteRef.current = true;
    try {
      api.updateScene({
        elements: (initialScene?.elements ?? []) as SceneElement[],
        // updateScene merges; the stored scene only keeps a partial AppState.
        appState: initialScene?.appState as AppState | undefined,
      });
      const files = initialScene?.files as BinaryFiles | undefined;
      if (files) {
        api.addFiles(Object.values(files) as BinaryFileData[]);
      }
    } finally {
      // Clear on next tick so the echo onChange is still suppressed.
      setTimeout(() => {
        applyingRemoteRef.current = false;
      }, 0);
    }
  }, [boardId, initialScene]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = useCallback(
    (
      elements: readonly SceneElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      if (applyingRemoteRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onSceneChangeRef.current({ elements, appState, files });
      }, DEBOUNCE_MS);
    },
    [],
  );

  return (
    <div className="wb-editor" data-theme={theme}>
      <Excalidraw
        excalidrawAPI={handleApi}
        initialData={mountSceneRef.current ?? undefined}
        theme={theme}
        onChange={handleChange}
      />
    </div>
  );
}
