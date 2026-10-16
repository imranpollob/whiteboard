/**
 * Scene-file + download helpers for board import/export.
 *
 * Kept dependency-free (no Excalidraw imports) so the serialize/parse
 * logic is unit-testable in Node. Raster/vector rendering uses
 * Excalidraw's `exportToBlob`/`exportToSvg`/`serializeAsJSON` at the
 * call sites in `App.tsx`.
 */

export const SCENE_FILE_VERSION = 2;

export interface ParsedSceneFile {
  elements: Record<string, unknown>[];
  files: Record<string, unknown>;
}

export class SceneFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SceneFileError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Build the text of an `.excalidraw.json` scene file. Mirrors the shape
 * produced by Excalidraw's `serializeAsJSON(..., "local")`.
 */
export function buildSceneFileText(
  elements: unknown[],
  files: Record<string, unknown>,
  appState?: Record<string, unknown>,
): string {
  return JSON.stringify(
    {
      type: "excalidraw",
      version: SCENE_FILE_VERSION,
      source: "whiteboard",
      elements: elements ?? [],
      appState: appState ?? {},
      files: files ?? {},
    },
    null,
    2,
  );
}

/**
 * Parse + validate the text of an `.excalidraw` / `.excalidraw.json` file.
 * Throws `SceneFileError` on invalid input instead of returning null so
 * callers can surface the reason. Unknown extra fields are ignored;
 * malformed entries are dropped, never fatal.
 */
export function parseSceneFileText(text: string): ParsedSceneFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new SceneFileError("That file is not valid JSON.");
  }
  if (!isRecord(parsed)) {
    throw new SceneFileError("That file is not a valid Excalidraw scene.");
  }
  if (parsed["type"] !== undefined && parsed["type"] !== "excalidraw") {
    throw new SceneFileError("That file is not a valid Excalidraw scene.");
  }
  const elements = Array.isArray(parsed["elements"]) ? parsed["elements"] : null;
  if (!elements) {
    throw new SceneFileError("That file has no drawable elements.");
  }
  const files = isRecord(parsed["files"]) ? parsed["files"] : {};
  return {
    // Drop non-object entries rather than failing the whole import.
    elements: elements.filter(isRecord),
    files,
  };
}

/** Turn a board title into a safe download basename (no extension). */
export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "board"
  );
}

/** Trigger a browser download of a Blob. No-op outside browsers. */
export function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
