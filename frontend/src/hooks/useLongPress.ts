import { useRef, useState, useCallback } from 'react';

interface LongPressHandlers {
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
}

interface UseLongPressResult {
  handlers: LongPressHandlers;
  pressing: boolean;
  progress: number; // 0..1
}

export function useLongPress(
  onLongPress: () => void,
  duration = 5000,
): UseLongPressResult {
  const [pressing, setPressing]   = useState(false);
  const [progress, setProgress]   = useState(0);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef      = useRef<number | null>(null);
  const startRef    = useRef<number>(0);

  const start = useCallback(() => {
    startRef.current = Date.now();
    setPressing(true);
    setProgress(0);

    const tick = () => {
      const p = Math.min((Date.now() - startRef.current) / duration, 1);
      setProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    timerRef.current = setTimeout(() => {
      onLongPress();
      setPressing(false);
      setProgress(0);
    }, duration);
  }, [onLongPress, duration]);

  const cancel = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (rafRef.current)   { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setPressing(false);
    setProgress(0);
  }, []);

  return {
    handlers: {
      onMouseDown:  start,
      onMouseUp:    cancel,
      onMouseLeave: cancel,
      onTouchStart: start,
      onTouchEnd:   cancel,
    },
    pressing,
    progress,
  };
}
