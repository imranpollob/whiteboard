import type { ReactNode } from "react";
import { FileDown, Maximize, Minimize, Moon, Sun } from "lucide-react";
import type { WhiteboardTheme } from "./WhiteboardEditor";

export type SaveStatus = "saved" | "saving" | "error" | "unsaved";

interface AppHeaderProps {
  title: string;
  /** Slot for the BoardSwitcher (kept injectable for testing/layout). */
  switcher: ReactNode;
  saveStatus: SaveStatus;
  theme: WhiteboardTheme;
  isFullscreen: boolean;
  fileDisabled?: boolean;
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
  onExportPng,
  onExportSvg,
  onExportJson,
  onImport,
  onToggleFullscreen,
  onToggleTheme,
}: AppHeaderProps) {
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
              Export JSON
            </button>
            <button type="button" role="menuitem" disabled={fileDisabled} onClick={onImport}>
              Import JSON
            </button>
          </div>
        </div>

        <button
          type="button"
          className="header-btn"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen"}
          aria-pressed={isFullscreen}
        >
          {isFullscreen ? (
            <Minimize size={15} aria-hidden="true" />
          ) : (
            <Maximize size={15} aria-hidden="true" />
          )}
          {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
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

        {/* Brand tools launcher (hamburger): the launcher script replaces
            this slot with the waffle button after it loads. When offline
            the slot stays empty and the header is unchanged. */}
        <span data-brand-launcher />
      </div>
    </header>
  );
}
