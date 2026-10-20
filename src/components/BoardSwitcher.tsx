import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";

export interface BoardSummary {
  id: string;
  title: string;
  updatedAt: number;
}

interface BoardSwitcherProps {
  boards: BoardSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => Promise<void>;
}

/**
 * Compact board switcher dropdown with inline create / rename /
 * delete (delete requires an explicit confirm step).
 */
export default function BoardSwitcher({
  boards,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: BoardSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const deleteTarget = boards.find((b) => b.id === confirmDeleteId);

  useEffect(() => {
    if (confirmDeleteId) {
      dialogRef.current?.showModal();
      cancelRef.current?.focus();
    } else if (dialogRef.current?.open) {
      dialogRef.current.close();
      toggleRef.current?.focus();
    }
  }, [confirmDeleteId]);

  const closeDelete = () => {
    if (deleting) return;
    setConfirmDeleteId(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(deleteTarget.id);
      setConfirmDeleteId(null);
    } catch {
      setDeleteError("Couldn’t delete this board. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setRenamingId(null);
        setConfirmDeleteId(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setRenamingId(null);
        setConfirmDeleteId(null);
      }
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = boards.find((b) => b.id === activeId) ?? null;
  const activeIndex = active ? boards.findIndex((b) => b.id === active.id) : -1;

  const commitRename = (id: string) => {
    const title = draft.trim();
    if (title) onRename(id, title);
    setRenamingId(null);
  };

  return (
    <div className="board-switcher" ref={rootRef}>
      <button
        type="button"
        className="board-switcher-toggle"
        ref={toggleRef}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="Switch board"
      >
        <span className="board-switcher-name">{active?.title ?? "No board"}</span>
        <span className="board-switcher-count">
          {activeIndex >= 0 ? `${activeIndex + 1}/${boards.length}` : ""}
        </span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open && (
        <div className="board-switcher-menu" role="group" aria-label="Boards">
          {boards.map((b) => (
            <div
              key={b.id}
              className={`board-switcher-item${b.id === activeId ? " is-active" : ""}`}
            >
              {renamingId === b.id ? (
                <input
                  className="board-switcher-rename"
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commitRename(b.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(b.id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  aria-label={`Rename ${b.title}`}
                />
              ) : (
                <button
                  type="button"
                  className="board-switcher-select"
                  aria-current={b.id === activeId ? "true" : undefined}
                  onClick={() => {
                    onSelect(b.id);
                    setOpen(false);
                  }}
                >
                  {b.title}
                </button>
              )}
              <span className="board-switcher-actions">
                <button
                  type="button"
                  title={`Rename ${b.title}`}
                  aria-label={`Rename ${b.title}`}
                  onClick={() => {
                    setDraft(b.title);
                    setRenamingId(b.id);
                    setConfirmDeleteId(null);
                  }}
                >
                  <Pencil size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="board-switcher-delete"
                  title={`Delete ${b.title}`}
                  aria-label={`Delete ${b.title}`}
                  onClick={() => {
                    setRenamingId(null);
                    setDeleteError(null);
                    setOpen(false);
                    setConfirmDeleteId(b.id);
                  }}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </span>
            </div>
          ))}
          <button type="button" className="board-switcher-new" onClick={onCreate}>
            <Plus size={14} aria-hidden="true" />
            New board
          </button>
        </div>
      )}
      <dialog
        ref={dialogRef}
        className="board-delete-dialog"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescriptionId}
        aria-busy={deleting}
        onCancel={(e) => {
          e.preventDefault();
          closeDelete();
        }}
      >
        <div className="board-delete-icon"><Trash2 size={22} aria-hidden="true" /></div>
        <h2 id={dialogTitleId}>Delete board?</h2>
        <p id={dialogDescriptionId}>
          <strong>“{deleteTarget?.title}”</strong> and all its drawings will be
          permanently deleted. This action cannot be undone.
        </p>
        {deleteError && <p className="board-delete-error" role="alert">{deleteError}</p>}
        <div className="board-delete-actions">
          <button ref={cancelRef} type="button" disabled={deleting} onClick={closeDelete}>
            Cancel
          </button>
          <button type="button" className="board-delete-confirm" disabled={deleting} onClick={() => void confirmDelete()}>
            {deleting ? "Deleting…" : "Delete board"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
