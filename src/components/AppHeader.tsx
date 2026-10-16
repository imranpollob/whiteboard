import type { ReactNode } from "react";
import { FileDown, MonitorUp, Moon, Sun } from "lucide-react";
import type { WhiteboardTheme } from "./WhiteboardEditor";

export type SaveStatus = "saved" | "saving" | "error" | "unsaved";

interface AppHeaderProps {
  title: string;
  /** Slot for the BoardSwitcher (kept injectable for testing/layout). */
  switcher: ReactNode;
  saveStatus: SaveStatus;
  theme: WhiteboardTheme;
  isPresenting: boolean;
  fileDisabled?: boolean;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExportJson: () => void;
  onImport: () => void;
  onPresent: () => void;
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
  isPresenting,
  fileDisabled,
  onExportPng,
  onExportSvg,
  onExportJson,
  onImport,
  onPresent,
  onToggleTheme,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-left">
        <h1 className="app-title">{title}</h1>
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

        <div className="export-menu">
          <button
            type="button"
            className="header-btn"
            disabled={fileDisabled}
            aria-haspopup="menu"
            title="File: export or import board"
          >
            <FileDown size={15} aria-hidden="true" />
            File
          </button>
          {/* Progressive enhancement: hover/focus reveals menu via CSS;
              buttons remain directly reachable for keyboard users. */}
          <div className="export-menu-list file-menu-list" role="menu" aria-label="File">
            <button type="button" role="menuitem" disabled={fileDisabled} onClick={onExportPng}>
              Export PNG image
            </button>
            <button type="button" role="menuitem" disabled={fileDisabled} onClick={onExportSvg}>
              Export SVG image
            </button>
            <button type="button" role="menuitem" disabled={fileDisabled} onClick={onExportJson}>
              Export Excalidraw file
            </button>
            <button type="button" role="menuitem" disabled={fileDisabled} onClick={onImport}>
              Import Excalidraw file…
            </button>
          </div>
        </div>

        <button
          type="button"
          className="header-btn"
          onClick={onPresent}
          title="Enter presentation mode (hides chrome)"
        >
          <MonitorUp size={15} aria-hidden="true" />
          {isPresenting ? "Presenting…" : "Present"}
        </button>

        <button
          type="button"
          className="header-btn"
          onClick={onToggleTheme}
          title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          aria-pressed={theme === "dark"}
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <Moon size={15} aria-hidden="true" />
          ) : (
            <Sun size={15} aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
}
