import { useEffect } from "react";
import { Minimize } from "lucide-react";

interface FullscreenControlsProps {
  visible: boolean;
  onExit: () => void;
}

/**
 * Single floating exit shown only while fullscreen.
 * The header stays visible in fullscreen mode, so this bar is just the
 * obvious pointer path out (keyboard users press Esc natively).
 */
export default function FullscreenControls({ visible, onExit }: FullscreenControlsProps) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      document.body.classList.add("fullscreen-controls-idle");
    }, 3000);
    const wake = () => {
      document.body.classList.remove("fullscreen-controls-idle");
      clearTimeout(t);
    };
    window.addEventListener("pointermove", wake);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointermove", wake);
      document.body.classList.remove("fullscreen-controls-idle");
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fullscreen-controls" role="toolbar" aria-label="Fullscreen controls">
      <button
        type="button"
        className="fullscreen-controls-btn"
        onClick={onExit}
        title="Exit fullscreen (Esc)"
      >
        <Minimize size={14} aria-hidden="true" />
        Exit fullscreen (Esc)
      </button>
    </div>
  );
}
