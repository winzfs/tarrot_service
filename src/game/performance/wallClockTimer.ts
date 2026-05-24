export type TimerTask = { cancel: () => void };

export function scheduleWallClock(callback: () => void, delayMs: number): TimerTask {
  const startedAt = Date.now();
  let timerId: number | undefined;
  let rafId: number | undefined;
  let cancelled = false;

  const tick = (): void => {
    if (cancelled) return;
    const elapsed = Date.now() - startedAt;
    const remaining = delayMs - elapsed;
    if (remaining <= 0) {
      callback();
      return;
    }
    if (document.visibilityState === "visible") {
      timerId = window.setTimeout(tick, Math.min(remaining, 120));
      return;
    }
    rafId = window.requestAnimationFrame(tick);
  };

  timerId = window.setTimeout(tick, Math.min(delayMs, 120));

  return {
    cancel: () => {
      cancelled = true;
      if (timerId !== undefined) window.clearTimeout(timerId);
      if (rafId !== undefined) window.cancelAnimationFrame(rafId);
    },
  };
}
