import { useCallback, useEffect, useState } from "react";

/**
 * Standard browser fullscreen.
 *
 * Entering/leaving goes through the Fullscreen API; the `fullscreenchange`
 * event is the single source of truth, so native exits (Esc, browser UI)
 * stay in sync with no custom key handling.
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const enter = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen unavailable or denied — stay in normal mode.
    }
  }, []);

  const exit = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // Already exited — state syncs via fullscreenchange.
    }
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) void exit();
    else void enter();
  }, [enter, exit]);

  // Safety net for environments where Esc doesn't trigger the native exit
  // (real browsers always do). If native exit already happened, exit() is
  // a no-op and state still syncs via fullscreenchange.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && document.fullscreenElement) void exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exit]);

  return { isFullscreen, enter, exit, toggle };
}
