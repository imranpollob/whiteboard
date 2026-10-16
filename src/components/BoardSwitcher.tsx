import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";

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
  onDelete: (id: string) => void;
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
  const rootRef = useRef<HTMLDivElement>(null);

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
  }, [open ]);

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
        aria-haspopup="listbox"
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
        <div className="board-switcher-menu" role="listbox" aria-label="Boards">
          {boards.map((b) => (
            <div
              key={b.id}
              className={`board-switcher-item${b.id === activeId ? " is-active" : ""}`}
              role="option"
              aria-selected={b.id === activeId}
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
                {confirmDeleteId === b.id ? (
                  <>
                    <button
                      type="button"
                      className="danger"
                      title="Confirm delete"
                      aria-label="Confirm delete"
                      onClick={() => {
                        onDelete(b.id);
                        setConfirmDeleteId(null);
                        if (boards.length <= 1) setOpen(false);
                      }}
                    >
                      <Check size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      title="Cancel delete"
                      aria-label="Cancel delete"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    title={`Delete ${b.title}`}
                    aria-label={`Delete ${b.title}`}
                    onClick={() => setConfirmDeleteId(b.id)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                )}
              </span>
            </div>
          ))}
          {confirmDeleteId && (
            <p className="board-switcher-confirm">
              Delete this board? Confirm to proceed.
            </p>
          )}
          <button type="button" className="board-switcher-new" onClick={onCreate}>
            <Plus size={14} aria-hidden="true" />
            New board
          </button>
        </div>
      )}
    </div>
  );
}
