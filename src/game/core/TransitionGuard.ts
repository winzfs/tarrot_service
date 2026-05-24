import Phaser from "phaser";

type CleanupFn = () => void;

export type TransitionCancelToken = {
  readonly cancelled: boolean;
  cancel: () => void;
};

export class TransitionGuard {
  private readonly runOnceKeys = new Set<string>();
  private readonly cleanups = new Set<CleanupFn>();
  private cancelled = false;
  private readonly token: TransitionCancelToken;

  constructor() {
    this.token = {
      get cancelled() {
        return false;
      },
      cancel: () => this.cancel(),
    };
    Object.defineProperty(this.token, "cancelled", {
      get: () => this.cancelled,
    });
  }

  runOnce(key: string, fn: () => void): boolean {
    if (this.cancelled || this.runOnceKeys.has(key)) return false;
    this.runOnceKeys.add(key);
    fn();
    return true;
  }

  createCancelToken(): TransitionCancelToken {
    return this.token;
  }

  registerTimer(timer: Phaser.Time.TimerEvent | undefined): void {
    if (!timer) return;
    this.addCleanup(() => timer.remove(false));
  }

  registerTween(tween: Phaser.Tweens.Tween | undefined): void {
    if (!tween) return;
    this.addCleanup(() => tween.remove());
  }

  registerTimeout(timeoutId: number | undefined): void {
    if (timeoutId === undefined) return;
    this.addCleanup(() => window.clearTimeout(timeoutId));
  }

  addCleanup(cleanup: CleanupFn): void {
    if (this.cancelled) {
      cleanup();
      return;
    }
    this.cleanups.add(cleanup);
  }

  scheduleSoftTimeout(scene: Phaser.Scene, key: string, delayMs: number, fn: () => void): Phaser.Time.TimerEvent {
    const timer = scene.time.delayedCall(delayMs, () => this.runOnce(key, fn));
    this.registerTimer(timer);
    return timer;
  }

  scheduleHardTimeout(key: string, delayMs: number, fn: () => void): number {
    const timeoutId = window.setTimeout(() => this.runOnce(key, fn), delayMs);
    this.registerTimeout(timeoutId);
    return timeoutId;
  }

  cancel(): void {
    if (this.cancelled) return;
    this.cancelled = true;
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups.clear();
    this.runOnceKeys.clear();
  }
}
