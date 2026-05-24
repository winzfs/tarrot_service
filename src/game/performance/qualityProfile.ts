export type QualityLevel = "low" | "medium" | "high";

export type QualityProfile = {
  level: QualityLevel;
  typewriterCharsPerTick: number;
  maxConcurrentTweens: number;
  maxParticleCount: number;
  enableBlur: boolean;
  maxBlurStrength: number;
};

const QUALITY_PRESETS: Record<QualityLevel, QualityProfile> = {
  low: { level: "low", typewriterCharsPerTick: 4, maxConcurrentTweens: 24, maxParticleCount: 20, enableBlur: false, maxBlurStrength: 0 },
  medium: { level: "medium", typewriterCharsPerTick: 3, maxConcurrentTweens: 42, maxParticleCount: 36, enableBlur: true, maxBlurStrength: 1 },
  high: { level: "high", typewriterCharsPerTick: 2, maxConcurrentTweens: 72, maxParticleCount: 58, enableBlur: true, maxBlurStrength: 2 },
};

function detectQualityLevel(): QualityLevel {
  if (typeof navigator === "undefined") return "high";
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (cores <= 4 || memory <= 4) return "low";
  if (cores <= 8 || memory <= 8) return "medium";
  return "high";
}

let cachedProfile: QualityProfile | undefined;

export function getQualityProfile(): QualityProfile {
  if (!cachedProfile) cachedProfile = QUALITY_PRESETS[detectQualityLevel()];
  return cachedProfile;
}

export function withQualityProfile<T>(variants: Record<QualityLevel, T>): T {
  return variants[getQualityProfile().level];
}
