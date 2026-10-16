/**
 * Board state model + serialization.
 *
 * `Board.elements` entries are opaque Excalidraw scene elements
 * ({id, type, ...}); `Board.files` is the opaque Excalidraw `BinaryFiles`
 * record (image/fileId -> file data). Only `viewBackgroundColor` is kept
 * from Excalidraw app state — scroll/zoom/selection are session view state
 * and intentionally not persisted.
 */

/** Schema version stamped into every persisted envelope. */
export const BOARD_SCHEMA_VERSION = 2;

/**
 * A single drawable/content item on a board.
 * Kept intentionally generic so the UI treats Excalidraw elements opaquely.
 */
export interface BoardElement {
  id: string;
  type: string;
  [key: string]: unknown;
}

/** Opaque embedded-asset record (Excalidraw `BinaryFiles` shape). */
export type BoardFiles = Record<string, unknown>;

/** In-memory board representation used by React state and the canvas. */
export interface Board {
  id: string;
  title: string;
  elements: BoardElement[];
  files: BoardFiles;
  /** Canvas background color, or null for the editor default. */
  viewBackgroundColor: string | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * Persisted envelope. `data` and `files` are JSON serializations kept as
 * strings so a single corrupt board cannot break parsing of the rest.
 */
export interface StoredBoard {
  version: number;
  id: string;
  title: string;
  data: string;
  files: string;
  viewBackgroundColor: string | null;
  createdAt: number;
  updatedAt: number;
}

export function generateBoardId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `board-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function createDefaultBoard(title = "Untitled board"): Board {
  const now = Date.now();
  return {
    id: generateBoardId(),
    title,
    elements: [],
    files: {},
    viewBackgroundColor: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Serialize a board's elements for storage. Never throws on plain data. */
export function serializeElements(elements: BoardElement[]): string {
  return JSON.stringify(elements);
}

/** Serialize a board's embedded files for storage. Never throws on plain data. */
export function serializeFiles(files: BoardFiles): string {
  return JSON.stringify(files ?? {});
}

export function toStoredBoard(board: Board): StoredBoard {
  return {
    version: BOARD_SCHEMA_VERSION,
    id: board.id,
    title: board.title,
    data: serializeElements(board.elements),
    files: serializeFiles(board.files),
    viewBackgroundColor: board.viewBackgroundColor,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  };
}

export interface ParsedBoardResult {
  board: Board | null;
  /** True when the record was structurally invalid or `data` was unparseable. */
  corrupted: boolean;
}

/** Structural guard for unknown values read back from storage. */
export function isBoard(value: unknown): value is Board {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["id"] === "string" &&
    typeof v["title"] === "string" &&
    Array.isArray(v["elements"]) &&
    (typeof v["files"] === "object" || v["files"] === undefined) &&
    (typeof v["viewBackgroundColor"] === "string" ||
      v["viewBackgroundColor"] === null ||
      v["viewBackgroundColor"] === undefined) &&
    typeof v["createdAt"] === "number" &&
    typeof v["updatedAt"] === "number"
  );
}

function parseFiles(raw: unknown): BoardFiles {
  try {
    const parsed: unknown = typeof raw === "string" ? JSON.parse(raw) : (raw ?? {});
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as BoardFiles;
    }
  } catch {
    // Fall through to the empty record below.
  }
  return {};
}

/**
 * Parse one stored envelope. Returns `{ board: null, corrupted: true }`
 * instead of throwing so the repository can quarantine single bad records.
 * Tolerates v1 envelopes (`name` instead of `title`, no `files`).
 */
export function fromStoredBoard(stored: unknown): ParsedBoardResult {
  if (typeof stored !== "object" || stored === null) {
    return { board: null, corrupted: true };
  }
  const s = stored as Record<string, unknown>;
  try {
    const elements: unknown =
      typeof s["data"] === "string" ? JSON.parse(s["data"]) : s["data"];
    // v1 back-compat: title was stored as `name`.
    const title = typeof s["title"] === "string" ? s["title"] : s["name"];
    const background =
      typeof s["viewBackgroundColor"] === "string" ? s["viewBackgroundColor"] : null;
    const candidate: unknown = {
      id: s["id"],
      title,
      elements: Array.isArray(elements) ? elements : null,
      files: parseFiles(s["files"]),
      viewBackgroundColor: background,
      createdAt: s["createdAt"],
      updatedAt: s["updatedAt"],
    };
    if (!isBoard(candidate)) return { board: null, corrupted: true };
    // Drop non-object / id-less elements rather than failing the whole board.
    const clean = candidate.elements.filter(
      (el): el is BoardElement =>
        typeof el === "object" && el !== null && typeof (el as { id?: unknown }).id === "string",
    );
    return {
      board: { ...candidate, elements: clean },
      corrupted: clean.length !== candidate.elements.length,
    };
  } catch {
    return { board: null, corrupted: true };
  }
}

/** Most-recent-first ordering used by the boards list. */
export function sortBoardsMostRecentFirst(boards: Board[]): Board[] {
  return [...boards].sort((a, b) => b.updatedAt - a.updatedAt);
}
