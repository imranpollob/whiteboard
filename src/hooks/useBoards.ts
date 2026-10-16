import { useCallback, useEffect, useRef, useState } from "react";
import type { Board } from "../types/board";
import { getBoardRepository, type IBoardRepository } from "../lib/boardRepository";

export interface UseBoardsOptions {
  repository?: IBoardRepository;
  /** When true (default), create a board if the store is empty. */
  ensureDefault?: boolean;
}

export interface UseBoardsResult {
  boards: Board[];
  activeBoardId: string | null;
  /** Currently selected board (most recent when nothing selected yet). */
  activeBoard: Board | null;
  loading: boolean;
  error: Error | null;
  createBoard: (name?: string) => Promise<Board>;
  renameBoard: (id: string, name: string) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  switchBoard: (id: string) => void;
  /** Replace one board in local state (used by autosave after persist). */
  updateLocalBoard: (board: Board) => void;
  refresh: () => Promise<void>;
}

/**
 * Boards collection state: most-recent-first list, active selection,
 * create/rename/delete/switch, and a default board on first run.
 */
export function useBoards(options: UseBoardsOptions = {}): UseBoardsResult {
  const { repository = getBoardRepository(), ensureDefault = true } = options;
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Repository list is already most-recent-first; ensureDefault seeds
      // a first board so the UI never starts empty.
      let list = await repository.listBoards();
      if (list.length === 0 && ensureDefault) {
        const first = await repository.createBoard();
        list = [first];
      }
      setBoards(list);
      setActiveBoardId((prev) => prev ?? list[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [repository, ensureDefault]);

  // Shared mount promise: React StrictMode (and concurrent renders) may
  // run this effect twice while the first load is still in flight. Sharing
  // one execution prevents seeding two default boards on first run.
  const initRef = useRef<Promise<void> | null>(null);
  useEffect(() => {
    if (!initRef.current) initRef.current = refresh();
    void initRef.current;
  }, [refresh]);

  const createBoard = useCallback(
    async (name?: string) => {
      const board = await repository.createBoard(name);
      setBoards((prev) => [board, ...prev]);
      setActiveBoardId(board.id);
      return board;
    },
    [repository],
  );

  const renameBoard = useCallback(
    async (id: string, name: string) => {
      const next = await repository.renameBoard(id, name);
      if (next) {
        setBoards((prev) =>
          prev.map((b) => (b.id === id ? next : b)).sort((a, b) => b.updatedAt - a.updatedAt),
        );
      }
    },
    [repository],
  );

  const deleteBoard = useCallback(
    async (id: string) => {
      await repository.deleteBoard(id);
      setBoards((prev) => {
        const next = prev.filter((b) => b.id !== id);
        setActiveBoardId((current) =>
          current === id ? (next[0]?.id ?? null) : current,
        );
        return next;
      });
    },
    [repository],
  );

  const switchBoard = useCallback((id: string) => {
    setActiveBoardId(id);
  }, []);

  const updateLocalBoard = useCallback((board: Board) => {
    setBoards((prev) =>
      prev.map((b) => (b.id === board.id ? board : b)).sort((a, b) => b.updatedAt - a.updatedAt),
    );
  }, []);

  const activeBoard = boards.find((b) => b.id === activeBoardId) ?? boards[0] ?? null;

  return {
    boards,
    activeBoardId: activeBoard?.id ?? null,
    activeBoard,
    loading,
    error,
    createBoard,
    renameBoard,
    deleteBoard,
    switchBoard,
    updateLocalBoard,
    refresh,
  };
}
