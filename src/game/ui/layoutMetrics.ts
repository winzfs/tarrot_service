export type TextLayoutEstimate = {
  lines: number;
  height: number;
};

export function estimateWrappedLines(text: string, charsPerLine: number, minLines = 1): number {
  const normalized = text.trim();
  if (!normalized) return minLines;

  const explicitLines = normalized.split(/\n+/).length;
  const wrappedLines = normalized
    .split(/\n+/)
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / Math.max(1, charsPerLine))), 0);

  return Math.max(minLines, explicitLines, wrappedLines);
}

export function estimateTextHeight(text: string, charsPerLine: number, lineHeight: number, minLines = 1): TextLayoutEstimate {
  const lines = estimateWrappedLines(text, charsPerLine, minLines);
  return {
    lines,
    height: lines * lineHeight,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getPanelHeightByText(text: string, options: {
  charsPerLine: number;
  lineHeight: number;
  padding: number;
  minHeight: number;
  maxHeight: number;
  minLines?: number;
}): number {
  const estimate = estimateTextHeight(text, options.charsPerLine, options.lineHeight, options.minLines ?? 1);
  return clamp(estimate.height + options.padding, options.minHeight, options.maxHeight);
}

export function getDialogueSizeClass(text: string): "dialogue-normal" | "dialogue-long" | "dialogue-extra-long" {
  const lines = estimateWrappedLines(text, 31, 2);
  if (text.length > 220 || lines >= 8) return "dialogue-extra-long";
  if (text.length > 145 || lines >= 5) return "dialogue-long";
  return "dialogue-normal";
}

export function isLongFinaleAdvice(text: string): boolean {
  const lines = estimateWrappedLines(text, 24, 1);
  const sentenceCount = text
    .split(/(?<=[.!?。！？]|다\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean).length;

  return text.length > 115 || lines >= 5 || sentenceCount >= 3;
}

export function safeBottomY(totalHeight: number, bottomInset: number, elementHeight = 0): number {
  return totalHeight - bottomInset - elementHeight / 2;
}
