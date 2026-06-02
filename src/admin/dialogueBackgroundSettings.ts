export type DialogueBackgroundImageId = "back1" | "back2" | "custom";

export type DialogueBackgroundSettings = {
  enabled: boolean;
  imageId: DialogueBackgroundImageId;
  imageUrl: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
  dim: number;
};

type DialogueBackgroundSettingsInput = Partial<Omit<DialogueBackgroundSettings, "zoom" | "offsetX" | "offsetY" | "dim">> & {
  zoom?: number | string;
  offsetX?: number | string;
  offsetY?: number | string;
  dim?: number | string;
};

export const DIALOGUE_BACKGROUND_STORAGE_KEY = "arcana.dialogueBackground.v1";

export const DEFAULT_DIALOGUE_BACKGROUND_SETTINGS: DialogueBackgroundSettings = {
  enabled: false,
  imageId: "back1",
  imageUrl: "/img/back1.png",
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  dim: 0.38,
};

export function presetDialogueBackgroundUrl(imageId: DialogueBackgroundImageId): string {
  if (imageId === "back2") return "/img/back2.png";
  if (imageId === "back1") return "/img/back1.png";
  return DEFAULT_DIALOGUE_BACKGROUND_SETTINGS.imageUrl;
}

export function dialogueBackgroundUrlCandidates(imageUrl: string): string[] {
  const trimmed = imageUrl.trim();
  if (!trimmed) return [];
  const hasExtension = /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(trimmed);
  if (hasExtension || trimmed.startsWith("data:")) return [trimmed];
  return [`${trimmed}.png`, trimmed, `${trimmed}.jpg`, `${trimmed}.jpeg`, `${trimmed}.webp`];
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(max, Math.max(min, numberValue));
}

export function normalizeDialogueBackgroundSettings(value: DialogueBackgroundSettingsInput | null | undefined): DialogueBackgroundSettings {
  const imageId: DialogueBackgroundImageId = value?.imageId === "back2" || value?.imageId === "custom" ? value.imageId : "back1";
  const presetUrl = imageId === "custom" ? DEFAULT_DIALOGUE_BACKGROUND_SETTINGS.imageUrl : presetDialogueBackgroundUrl(imageId);
  const imageUrl = typeof value?.imageUrl === "string" && value.imageUrl.trim().length > 0 ? value.imageUrl.trim() : presetUrl;
  return {
    enabled: Boolean(value?.enabled),
    imageId,
    imageUrl,
    zoom: clampNumber(value?.zoom, 0.7, 2.4, DEFAULT_DIALOGUE_BACKGROUND_SETTINGS.zoom),
    offsetX: clampNumber(value?.offsetX, -50, 50, DEFAULT_DIALOGUE_BACKGROUND_SETTINGS.offsetX),
    offsetY: clampNumber(value?.offsetY, -50, 50, DEFAULT_DIALOGUE_BACKGROUND_SETTINGS.offsetY),
    dim: clampNumber(value?.dim, 0, 0.75, DEFAULT_DIALOGUE_BACKGROUND_SETTINGS.dim),
  };
}

export function settingsToDialogueBackgroundParams(settings: DialogueBackgroundSettings): string {
  const value = normalizeDialogueBackgroundSettings(settings);
  const params = new URLSearchParams();
  params.set("dialogueBg", value.enabled ? value.imageId : "off");
  params.set("dialogueBgUrl", value.imageUrl);
  params.set("dialogueBgZoom", String(value.zoom));
  params.set("dialogueBgX", String(value.offsetX));
  params.set("dialogueBgY", String(value.offsetY));
  params.set("dialogueBgDim", String(value.dim));
  return params.toString();
}

export function settingsFromDialogueBackgroundUrlParams(): DialogueBackgroundSettings | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("dialogueBg")) return undefined;
    const rawBg = params.get("dialogueBg");
    if (rawBg === "off") return normalizeDialogueBackgroundSettings({ enabled: false });
    const imageId: DialogueBackgroundImageId = rawBg === "back2" || rawBg === "custom" ? rawBg : "back1";
    const imageUrl = params.get("dialogueBgUrl") || presetDialogueBackgroundUrl(imageId);
    return normalizeDialogueBackgroundSettings({
      enabled: true,
      imageId,
      imageUrl,
      zoom: params.get("dialogueBgZoom") ?? undefined,
      offsetX: params.get("dialogueBgX") ?? undefined,
      offsetY: params.get("dialogueBgY") ?? undefined,
      dim: params.get("dialogueBgDim") ?? undefined,
    });
  } catch {
    return undefined;
  }
}

export function loadDialogueBackgroundSettings(): DialogueBackgroundSettings {
  const fromUrl = settingsFromDialogueBackgroundUrlParams();
  if (fromUrl) return fromUrl;
  if (typeof localStorage === "undefined") return DEFAULT_DIALOGUE_BACKGROUND_SETTINGS;
  try {
    const raw = localStorage.getItem(DIALOGUE_BACKGROUND_STORAGE_KEY);
    if (!raw) return DEFAULT_DIALOGUE_BACKGROUND_SETTINGS;
    return normalizeDialogueBackgroundSettings(JSON.parse(raw) as DialogueBackgroundSettingsInput);
  } catch {
    return DEFAULT_DIALOGUE_BACKGROUND_SETTINGS;
  }
}

export function persistDialogueBackgroundUrlParams(): void {
  const fromUrl = settingsFromDialogueBackgroundUrlParams();
  if (!fromUrl) return;
  try {
    saveDialogueBackgroundSettings(fromUrl);
  } catch {
    // URL settings should never block the game from starting.
  }
}

export function saveDialogueBackgroundSettings(settings: DialogueBackgroundSettings): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(DIALOGUE_BACKGROUND_STORAGE_KEY, JSON.stringify(normalizeDialogueBackgroundSettings(settings)));
  } catch {
    // Storage errors should never break gameplay.
  }
}

export function resetDialogueBackgroundSettings(): DialogueBackgroundSettings {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(DIALOGUE_BACKGROUND_STORAGE_KEY);
  } catch {
    // ignore
  }
  return DEFAULT_DIALOGUE_BACKGROUND_SETTINGS;
}

export function dialogueBackgroundTextureKey(imageUrl: string): string {
  let hash = 0;
  for (let index = 0; index < imageUrl.length; index += 1) hash = (hash * 31 + imageUrl.charCodeAt(index)) | 0;
  return `dialogue_bg_${Math.abs(hash)}`;
}
