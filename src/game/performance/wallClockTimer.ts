export type TimerTask = { cancel: () => void };

/**
 * setTimeout 기반 wall-clock 스케줄러.
 * 탭 비활성화/백그라운드에서 타이머가 지연되어도 실제 경과 시간을 기준으로 보정한다.
 */
export function scheduleWallClock(callback: () => void, delayMs: number): TimerTask {
  const safeDelay = Math.max(0, delayMs);
  const startedAt = Date.now();
  let timerId: number | undefined;
  let cancelled = false;

  const tick = (): void => {
    if (cancelled) return;

    const elapsed = Date.now() - startedAt;
    const remaining = safeDelay - elapsed;

    if (remaining <= 0) {
      callback();
      return;
    }

    timerId = window.setTimeout(tick, Math.min(remaining, 120));
  };

  timerId = window.setTimeout(tick, Math.min(safeDelay, 120));

  return {
    cancel: () => {
      cancelled = true;
      if (timerId !== undefined) window.clearTimeout(timerId);
    },
  };
}
