import { ss } from "../../GameConfig";

export const conversationTheme = {
  font: {
    title: "Georgia, 'Times New Roman', serif",
    body: "system-ui, sans-serif",
  },
  color: {
    primaryText: "#f8f0ff",
    secondaryText: "#cdbdff",
    stroke: "#2c174f",
    accent: "#b58cff",
  },
  spacing: {
    titleY: 48,
    subtitleY: 82,
  },
  animation: {
    sceneFadeInMs: 720,
    pulseDurationMs: 1100,
    adviceLineFadeMs: 1300,
  },
  size: {
    titleFontPx: () => ss(30),
    subtitleFontPx: () => ss(13),
    titleStroke: () => ss(5),
  },
} as const;
