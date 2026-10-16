/**
 * BoardRepository: CRUD over the `KeyValueStore` with corrupted-data handling.
 *
 * Corruption policy: a record that fails `fromStoredBoard` is quarantined
 * (removed from the store) and skipped; per-element defects are repaired by
 * the parser. Every method that encounters corruption reports the affected id
 * through `onCorruptedRecord` instead of throwing, so one bad board can never
 * break listing or loading of the rest.
 */
import {
  BOARD_SCHEMA_VERSION,
  type Board,
  createDefaultBoard,
  fromStoredBoard,
  sortBoardsMostRecentFirst,
  toStoredBoard,
} from "../types/board";
import { getBoardStore, type KeyValueStore } from "./db";

export interface CorruptedRecordInfo {
  id: string;
  reason: "unparseable-envelope" | "unparseable-elements";
}

export interface BoardRepositoryOptions {
  store?: KeyValueStore;
  /** Called once per quarantined record; defaults to a console warning. */
  onCorruptedRecord?: (info: CorruptedRecordInfo) => void;
  now?: () => number;
}

export interface IBoardRepository {
  listBoards(): Promise<Board[]>;
  getBoard(id: string): Promise<Board | null>;
  createBoard(name?: string): Promise<Board>;
  saveBoard(board: Board): Promise<Board>;
  renameBoard(id: string, name: string): Promise<Board | null>;
  deleteBoard(id: string): Promise<void>;
  ensureDefaultBoard(): Promise<Board>;
}

function recordId(raw: unknown, fallback: string): string {
  if (typeof raw === "object" && raw !== null && typeof (raw as { id?: unknown }).id === "string") {
    return (raw as { id: string }).id;
  }
  return fallback;
}

export class BoardRepository implements IBoardRepository {
  private store: KeyValueStore;
  private onCorruptedRecord: (info: CorruptedRecordInfo) => void;
  private now: () => number;

  constructor(options: BoardRepositoryOptions = {}) {
    this.store = options.store ?? getBoardStore();
    this.onCorruptedRecord =
      options.onCorruptedRecord ??
      ((info) => console.warn(`[boards] quarantined corrupted record: ${info.id}`));
    this.now = options.now ?? (() => Date.now());
  }

  /** Read + repair all records; corrupt ones are quarantined. Never throws on bad data. */
  async listBoards(): Promise<Board[]> {
    const [keys, raw] = await Promise.all([this.store.keys(), this.store.getAll()]);
    const boards: Board[] = [];
    for (let i = 0; i < raw.length; i++) {
      const item = raw[i];
      const { board } = fromStoredBoard(item);
      if (board) {
        boards.push(board);
        continue;
      }
      const key = keys[i] ?? recordId(item, "<unknown>");
      this.onCorruptedRecord({ id: recordId(item, key), reason: "unparseable-envelope" });
      await this.quarantine(key);
    }
    return sortBoardsMostRecentFirst(boards);
  }

  async getBoard(id: string): Promise<Board | null> {
    const raw = await this.store.get(id);
    if (raw === undefined) return null;
    const { board } = fromStoredBoard(raw);
    if (board) return board;
    this.onCorruptedRecord({ id, reason: "unparseable-elements" });
    await this.quarantine(id);
    return null;
  }

  async createBoard(title = "Untitled board"): Promise<Board> {
    const at = this.now();
    const board = { ...createDefaultBoard(title), updatedAt: at, createdAt: at };
    await this.store.put(board.id, toStoredBoard(board));
    return board;
  }

  /** Upsert; bumps `updatedAt` to now. */
  async saveBoard(board: Board): Promise<Board> {
    const next: Board = { ...board, updatedAt: this.now() };
    await this.store.put(next.id, { ...toStoredBoard(next), version: BOARD_SCHEMA_VERSION });
    return next;
  }

  async renameBoard(id: string, title: string): Promise<Board | null> {
    const board = await this.getBoard(id);
    if (!board) return null;
    const next: Board = {
      ...board,
      title: title.trim() === "" ? board.title : title,
      updatedAt: this.now(),
    };
    await this.store.put(id, toStoredBoard(next));
    return next;
  }

  async deleteBoard(id: string): Promise<void> {
    await this.store.remove(id);
  }

  private ensureDefaultInFlight: Promise<Board> | null = null;

  /**
   * Returns the most recent board, creating one when the store is empty.
   * Concurrent calls share one execution so two overlapping first-run
   * checks cannot seed two default boards.
   */
  async ensureDefaultBoard(): Promise<Board> {
    if (!this.ensureDefaultInFlight) {
      const tracked: Promise<Board> = this.doEnsureDefaultBoard().finally(() => {
        if (this.ensureDefaultInFlight === tracked) {
          this.ensureDefaultInFlight = null;
        }
      });
      this.ensureDefaultInFlight = tracked;
    }
    return this.ensureDefaultInFlight;
  }

  private async doEnsureDefaultBoard(): Promise<Board> {
    const boards = await this.listBoards();
    if (boards.length > 0) return boards[0];
    return this.createBoard();
  }

  private async quarantine(key: string): Promise<void> {
    if (!key) return;
    try {
      await this.store.remove(key);
    } catch {
      // Quarantine is best-effort; listing must still succeed.
    }
  }
}

let defaultRepo: BoardRepository | null = null;

/** Shared repository instance for hooks. */
export function getBoardRepository(): BoardRepository {
  if (!defaultRepo) defaultRepo = new BoardRepository();
  return defaultRepo;
}
