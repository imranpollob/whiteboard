import { useCallback, useEffect, useRef, useState } from "react";
import type { Board } from "../types/board";
import { getBoardRepository, type IBoardRepository } from "../lib/boardRepository";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export interface UseAutosaveOptions {
  repository?: IBoardRepository;
  /** Debounce delay in ms. Defaults to 500. */
  delay?: number;
  /** Called after a successful persist so list state can re-sort. */
  onSaved?: (board: Board) => void;
}

export interface UseAutosaveResult {
  status: SaveStatus;
  lastSavedAt: number | null;
  error: Error | null;
  /** Persist immediately, bypassing the debounce (also used on board switch). */
  flush: () => Promise<void>;
}

/**
 * Debounced autosave for the board being edited.
 *
 * Pass the live draft board; edits restart the `delay` timer, and switching
 * to a different board id flushes the previous draft first so no edits are
 * lost. `flush` is also safe to call on unmount.
 */
export function useAutosave(
  board: Board | null,
  options: UseAutosaveOptions = {},
): UseAutosaveResult {
  const { repository = getBoardRepository(), delay = 500, onSaved } = options;
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<Board | null>(board);
  latest.current = board;
  /** Last draft with unsaved changes; flushed on board switch / unmount. */
  const pending = useRef<Board | null>(null);
  const saving = useRef(false);
  const repoRef = useRef(repository);
  repoRef.current = repository;
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const clearTimer = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const persist = useCallback(async (draft: Board) => {
    if (saving.current) return;
    saving.current = true;
    setStatus("saving");
    setError(null);
    try {
      const saved = await repoRef.current.saveBoard(draft);
      if (pending.current?.id === draft.id) pending.current = null;
      setLastSavedAt(saved.updatedAt);
      setStatus("saved");
      onSavedRef.current?.(saved);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus("error");
    } finally {
      saving.current = false;
    }
  }, []);

  const flush = useCallback(async () => {
    clearTimer();
    const draft = pending.current ?? latest.current;
    pending.current = null;
    if (!draft) return;
    await persist(draft);
  }, [persist]);

  // Restart the debounce on every draft change; flush the previous draft
  // when the board id changes (switch) and on unmount.
  const boardId = board?.id ?? null;
  const prevId = useRef<string | null>(boardId);
  useEffect(() => {
    if (boardId !== prevId.current) {
      // Board switch: the previous draft (if any) is in `pending`.
      prevId.current = boardId;
      clearTimer();
      const outstanding = pending.current;
      pending.current = null;
      if (outstanding) void persist(outstanding);
      return;
    }
    if (board) {
      pending.current = board;
      setStatus((s) => (s === "saving" ? s : "dirty"));
      clearTimer();
      timer.current = setTimeout(() => {
        const draft = pending.current;
        pending.current = null;
        if (draft) void persist(draft);
      }, delay);
    }
    return clearTimer;
  }, [board, boardId, delay, persist]);

  useEffect(() => {
    return () => {
      clearTimer();
      // Best-effort final persist; React may ignore the promise on unmount.
      const outstanding = pending.current;
      pending.current = null;
      if (outstanding) {
        void repoRef.current.saveBoard(outstanding).catch(() => undefined);
      }
    };
  }, []);

  return { status, lastSavedAt, error, flush };
}
