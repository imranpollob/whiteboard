import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Presentation mode: hides app chrome (header/sidebar) and optionally
 * takes over the screen via Fullscreen API with a CSS-class fallback.
 *
 * - `isPresenting` toggles a `presenting` class on <body>.
 * - Escape always exits (Fullscreen API emits its own change; the
 *   keydown handler covers the CSS fallback path and Esc-out-of-sync).
 * - Fullscreen failures (denied/unavailable/iframe) fall back to the
 *   CSS-only mode instead of throwing.
 */
export function usePresentationMode() {
  const [isPresenting, setIsPresenting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wantRef = useRef(false);

  const syncFullscreenFlag = useCallback(() => {
    setIsFullscreen(Boolean(document.fullscreenElement));
  }, []);

  useEffect(() => {
    document.addEventListener("fullscreenchange", syncFullscreenFlag);
    return () =>
      document.removeEventListener("fullscreenchange", syncFullscreenFlag);
  }, [syncFullscreenFlag]);

  useEffect(() => {
    document.body.classList.toggle("presenting", isPresenting);
    return () => document.body.classList.remove("presenting");
  }, [isPresenting]);

  const enter = useCallback(async () => {
    wantRef.current = true;
    setIsPresenting(true);
    try {
      const el = document.documentElement as HTMLElement & {
        requestFullscreen?: () => Promise<void>;
      };
      if (typeof el.requestFullscreen === "function") {
        await el.requestFullscreen();
      }
    } catch {
      // Fullscreen denied or unavailable — CSS fallback stays active.
    }
  }, []);

  const exit = useCallback(async () => {
    wantRef.current = false;
    setIsPresenting(false);
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Already exited or not allowed — CSS class removal is enough.
    }
  }, []);

  // Escape exits even in the CSS-fallback path (no fullscreenchange fires).
  useEffect(() => {
    if (!isPresenting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        void exit();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [isPresenting, exit]);

  // If the user exits native fullscreen via browser UI, leave
  // presentation mode too (only when we entered it).
  useEffect(() => {
    if (wantRef.current && isPresenting && !document.fullscreenElement) {
      // Don't force-exit immediately: fullscreen request may still be
      // pending. Only sync when fullscreen was actually held before.
      if (isFullscreen) {
        wantRef.current = false;
        setIsPresenting(false);
      }
    }
  }, [isFullscreen, isPresenting]);

  return { isPresenting, isFullscreen, enter, exit };
}
