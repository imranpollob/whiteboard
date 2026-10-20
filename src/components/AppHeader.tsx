import { useId, useRef, type ReactNode } from "react";
import { RotateCcw, Download, Maximize, Upload, Minimize, Moon, Palette, Sun } from "lucide-react";
import type { WhiteboardTheme } from "./WhiteboardEditor";

const BACKGROUND_SWATCHES = ["#ffffff", "#f8f9fa", "#f5faff", "#fffce8", "#fdf8f6"];

export type SaveStatus = "saved" | "saving" | "error" | "unsaved";

interface AppHeaderProps {
  title: string;
  /** Slot for the BoardSwitcher (kept injectable for testing/layout). */
  switcher: ReactNode;
  saveStatus: SaveStatus;
  theme: WhiteboardTheme;
  isFullscreen: boolean;
  fileDisabled?: boolean;
  backgroundColor: string;
  boardTitle: string;
  onClearBoard: () => void;
  onChangeBackground: (color: string) => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExportJson: () => void;
  onImport: () => void;
  onToggleFullscreen: () => void;
  onToggleTheme: () => void;
}

const SAVE_LABEL: Record<SaveStatus, string> = {
  saved: "Saved",
  saving: "Saving…",
  unsaved: "Unsaved",
  error: "Save failed",
};

export default function AppHeader({
  title,
  switcher,
  saveStatus,
  theme,
  isFullscreen,
  fileDisabled,
  backgroundColor,
  boardTitle,
  onClearBoard,
  onChangeBackground,
  onExportPng,
  onExportSvg,
  onExportJson,
  onImport,
  onToggleFullscreen,
  onToggleTheme,
}: AppHeaderProps) {
  const clearDialogRef = useRef<HTMLDialogElement>(null);
  const clearButtonRef = useRef<HTMLButtonElement>(null);
  const cancelClearRef = useRef<HTMLButtonElement>(null);
  const clearTitleId = useId();
  const clearDescriptionId = useId();
  const closeClearDialog = () => {
    clearDialogRef.current?.close();
    clearButtonRef.current?.focus();
  };
  const logoUrl = `${import.meta.env.BASE_URL}logo.png`;
  return (
    <header className="app-header">
      <div className="app-header-left">
        <span className="app-brand">
          <img className="app-logo" src={logoUrl} alt="" aria-hidden="true" />
          <h1 className="app-title">{title}</h1>
        </span>
        {switcher}
      </div>

      <div className="app-header-right">
        <span
          className={`save-status save-status-${saveStatus}`}
          role="status"
          aria-live="polite"
          title={`Save status: ${saveStatus}`}
        >
          <span
            className="save-dot"
            aria-hidden="true"
            data-state={saveStatus}
          />
          {SAVE_LABEL[saveStatus]}
        </span>

        <button
          ref={clearButtonRef}
          type="button"
          className="header-btn"
          disabled={fileDisabled}
          onClick={() => {
            clearDialogRef.current?.showModal();
            cancelClearRef.current?.focus();
          }}
          title="Reset board"
          aria-label="Reset board"
          aria-haspopup="dialog"
        >
          <RotateCcw size={15} aria-hidden="true" />
          <span>Reset</span>
        </button>

        <div className="export-menu">
          <button
            type="button"
            className="header-btn"
            disabled={fileDisabled}
            aria-haspopup="menu"
            aria-label="Canvas background"
            title="Canvas background"
          >
            <Palette size={15} aria-hidden="true" />
            <span>Background</span>
          </button>
          <div className="export-menu-list bg-menu-list" role="menu" aria-label="Canvas background">
            <div className="bg-swatches">
              {BACKGROUND_SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  role="menuitem"
                  className="bg-swatch"
                  style={{ background: color }}
                  aria-label={`Background ${color}`}
                  aria-pressed={backgroundColor.toLowerCase() === color}
                  onClick={() => onChangeBackground(color)}
                />
              ))}
            </div>
            <label className="bg-custom">
              Custom
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(backgroundColor) ? backgroundColor : "#ffffff"}
                onChange={(e) => onChangeBackground(e.target.value)}
              />
            </label>
          </div>
        </div>

        <button
          type="button"
          className="header-btn"
          disabled={fileDisabled}
          onClick={onImport}
          title="Import a board from a JSON file"
          aria-label="Import"
        >
          <Upload size={15} aria-hidden="true" />
          <span>Import</span>
        </button>

        <div className="export-menu">
          <button
            type="button"
            className="header-btn"
            disabled={fileDisabled}
            aria-haspopup="menu"
            title="Export board"
            aria-label="Export"
          >
            <Download size={15} aria-hidden="true" />
            <span>Export</span>
          </button>
          {/* Hover/focus reveals the menu via CSS; items stay keyboard reachable. */}
          <div className="export-menu-list file-menu-list" role="menu" aria-label="Export">
            <button type="button" role="menuitem" disabled={fileDisabled} onClick={onExportPng}>
              PNG image
            </button>
            <button type="button" role="menuitem" disabled={fileDisabled} onClick={onExportSvg}>
              SVG image
            </button>
            <button type="button" role="menuitem" disabled={fileDisabled} onClick={onExportJson}>
              JSON
            </button>
          </div>
        </div>

        <button
          type="button"
          className="header-btn"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen"}
          aria-pressed={isFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize size={15} aria-hidden="true" />
          ) : (
            <Maximize size={15} aria-hidden="true" />
          )}
          <span>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</span>
        </button>

        <button
          type="button"
          className="header-btn"
          onClick={onToggleTheme}
          aria-pressed={theme === "dark"}
          aria-label={theme === "light" ? "Dark mode" : "Light mode"}
        >
          {theme === "light" ? (
            <Moon size={15} aria-hidden="true" />
          ) : (
            <Sun size={15} aria-hidden="true" />
          )}
        </button>

        {/* Brand tools launcher (hamburger): the launcher script replaces
            this slot with the waffle button after it loads. When offline
            the slot stays empty and the header is unchanged. */}
        <span data-brand-launcher />
      </div>
      <dialog
        ref={clearDialogRef}
        className="board-delete-dialog"
        aria-labelledby={clearTitleId}
        aria-describedby={clearDescriptionId}
        onCancel={(event) => {
          event.preventDefault();
          closeClearDialog();
        }}
      >
        <div className="board-delete-icon"><RotateCcw size={22} aria-hidden="true" /></div>
        <h2 id={clearTitleId}>Reset board?</h2>
        <p id={clearDescriptionId}>
          Remove all drawings from <strong>“{boardTitle}”</strong>?
          {" "}Your board name and background color will stay the same.
        </p>
        <div className="board-delete-actions">
          <button ref={cancelClearRef} type="button" onClick={closeClearDialog}>
            Cancel
          </button>
          <button
            type="button"
            className="board-delete-confirm"
            onClick={() => {
              onClearBoard();
              closeClearDialog();
            }}
          >
            Reset board
          </button>
        </div>
      </dialog>
    </header>
  );
}
