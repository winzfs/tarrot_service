const CLICK_SOUND_URL = "/sound/click1.mp3?v=20260526-1";
const CLICK_SOUND_VOLUME = 0.72;
const MIN_CLICK_INTERVAL_MS = 65;
const CLICK_SOUND_WINDOW_KEY = "__arcanaClickSound";

type ClickSoundState = {
  baseAudio: HTMLAudioElement;
  lastPlayedAt: number;
};

type ClickSoundWindow = Window & { [CLICK_SOUND_WINDOW_KEY]?: ClickSoundState };

function getClickSoundState(): ClickSoundState | undefined {
  if (typeof window === "undefined" || typeof document === "undefined") return undefined;
  const soundWindow = window as ClickSoundWindow;
  const existing = soundWindow[CLICK_SOUND_WINDOW_KEY];
  if (existing) return existing;

  const baseAudio = document.createElement("audio");
  baseAudio.src = CLICK_SOUND_URL;
  baseAudio.preload = "auto";
  baseAudio.volume = CLICK_SOUND_VOLUME;
  baseAudio.setAttribute("playsinline", "true");
  baseAudio.setAttribute("webkit-playsinline", "true");
  baseAudio.style.display = "none";
  document.body.appendChild(baseAudio);
  baseAudio.load();

  const state: ClickSoundState = { baseAudio, lastPlayedAt: 0 };
  soundWindow[CLICK_SOUND_WINDOW_KEY] = state;
  return state;
}

export function playButtonClickSound(): void {
  const state = getClickSoundState();
  if (!state) return;

  const now = Date.now();
  if (now - state.lastPlayedAt < MIN_CLICK_INTERVAL_MS) return;
  state.lastPlayedAt = now;

  const audio = state.baseAudio.cloneNode(true) as HTMLAudioElement;
  audio.volume = CLICK_SOUND_VOLUME;
  audio.currentTime = 0;
  const playPromise = audio.play();
  if (playPromise) playPromise.catch(() => undefined);
}

function isDomButtonTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("button, a, [role='button'], input[type='button'], input[type='submit'], .button, .btn"));
}

function isGameCanvasTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.tagName.toLowerCase() === "canvas") return true;
  return Boolean(target.closest("canvas"));
}

export function installGlobalButtonClickSound(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  getClickSoundState();

  window.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target;
      if (isGameCanvasTarget(target) || isDomButtonTarget(target)) {
        playButtonClickSound();
      }
    },
    { passive: true, capture: true },
  );

  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter" || event.key === " ") playButtonClickSound();
    },
    { passive: true },
  );
}
