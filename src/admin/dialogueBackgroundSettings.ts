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

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(max, Math.max(min, numberValue));
}

export function normalizeDialogueBackgroundSettings(value: Partial<DialogueBackgroundSettings> | null | undefined): DialogueBackgroundSettings {
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

export function loadDialogueBackgroundSettings(): DialogueBackgroundSettings {
  if (typeof localStorage === "undefined") return DEFAULT_DIALOGUE_BACKGROUND_SETTINGS;
  try {
    const raw = localStorage.getItem(DIALOGUE_BACKGROUND_STORAGE_KEY);
    if (!raw) return DEFAULT_DIALOGUE_BACKGROUND_SETTINGS;
    return normalizeDialogueBackgroundSettings(JSON.parse(raw) as Partial<DialogueBackgroundSettings>);
  } catch {
    return DEFAULT_DIALOGUE_BACKGROUND_SETTINGS;
  }
}

export function saveDialogueBackgroundSettings(settings: DialogueBackgroundSettings): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(DIALOGUE_BACKGROUND_STORAGE_KEY, JSON.stringify(normalizeDialogueBackgroundSettings(settings)));
}

export function resetDialogueBackgroundSettings(): DialogueBackgroundSettings {
  if (typeof localStorage !== "undefined") localStorage.removeItem(DIALOGUE_BACKGROUND_STORAGE_KEY);
  return DEFAULT_DIALOGUE_BACKGROUND_SETTINGS;
}

export function dialogueBackgroundTextureKey(imageUrl: string): string {
  let hash = 0;
  for (let index = 0; index < imageUrl.length; index += 1) hash = (hash * 31 + imageUrl.charCodeAt(index)) | 0;
  return `dialogue_bg_${Math.abs(hash)}`;
}
