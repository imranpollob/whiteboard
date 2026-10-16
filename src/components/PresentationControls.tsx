import { useEffect } from "react";
import { Maximize, Minimize, X } from "lucide-react";

interface PresentationControlsProps {
  visible: boolean;
  isFullscreen: boolean;
  onExit: () => void;
  onToggleFullscreen: () => void;
}

/**
 * Minimal floating chrome shown only while presenting.
 * Rendered at App root so it survives the `body.presenting` CSS that
 * hides the header and other chrome. Escape handling lives in
 * usePresentationMode; this bar is the pointer path out.
 */
export default function PresentationControls({
  visible,
  isFullscreen,
  onExit,
  onToggleFullscreen,
}: PresentationControlsProps) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      document.body.classList.add("present-controls-idle");
    }, 3000);
    const wake = () => {
      document.body.classList.remove("present-controls-idle");
      clearTimeout(t);
    };
    window.addEventListener("pointermove", wake);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointermove", wake);
      document.body.classList.remove("present-controls-idle");
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="present-controls" role="toolbar" aria-label="Presentation controls">
      <button
        type="button"
        className="present-controls-btn"
        onClick={onToggleFullscreen}
        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? (
          <Minimize size={14} aria-hidden="true" />
        ) : (
          <Maximize size={14} aria-hidden="true" />
        )}
        {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      </button>
      <button
        type="button"
        className="present-controls-btn present-controls-exit"
        onClick={onExit}
        title="Exit presentation (Esc)"
      >
        <X size={14} aria-hidden="true" />
        Exit (Esc)
      </button>
    </div>
  );
}
