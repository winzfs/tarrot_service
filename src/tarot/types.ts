import type { ReadingCategory } from "../game/state/ReadingDraft";

export type TarotCardOrientation = "upright" | "reversed";
export type TarotCardOrientationLabel = "정방향" | "역방향";

export type TarotCard = {
  id: string;
  arcana: "major" | "minor";
  number: number;
  roman: string;
  name: string;
  koreanName: string;
  displayName: string;
  keywords: string[];
  description: string;
  imageFile: string;
  imageUrl: string;
  imageKey: string;
  suit?: "cups" | "swords" | "wands" | "pentacles";
  visual: {
    symbol: string;
    palette: "neutral" | "bright" | "dark" | "danger" | "hope";
  };
};

export type DrawnTarotCard = TarotCard & {
  orientation: TarotCardOrientation;
  orientationLabel: TarotCardOrientationLabel;
  isReversed: boolean;
};

export type TarotSpreadPosition = {
  id: string;
  label: string;
  chapterTitle: string;
  shortMeaning: string;
  promptMeaning: string;
  aura?: "past-aura" | "present-aura" | "future-aura";
  layoutHint?: {
    x: number;
    y: number;
  };
};

export type TarotSpread = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  recommendedFor: ReadingCategory[];
  cardsToDraw: number;
  positions: TarotSpreadPosition[];
};

export type DrawnCard = DrawnTarotCard & {
  position: string;
  positionId: string;
  positionMeaning: string;
  spreadId: string;
  spreadName: string;
};

export type TarotReading = {
  title: string;
  summary: string;
  cards: {
    position: string;
    name: string;
    koreanName: string;
    reading: string;
  }[];
  advice: string;
  npcLine: string;
};
