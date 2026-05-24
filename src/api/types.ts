import type { DrawnCard, TarotReading } from "../tarot/types";
import type { ReadingCategory } from "../game/state/ReadingDraft";

export type SpreadRecommendationRequest = {
  category: ReadingCategory;
  question: string;
};

export type SpreadRecommendationResponse = {
  spreadId: string;
  reason: string;
  refinedQuestion: string;
  detectedThemes: string[];
};

export type ReadingRequest = {
  category: ReadingCategory;
  question: string;
  spreadId: string;
  spreadName: string;
  cards: DrawnCard[];
};

export type ReadingResponse = TarotReading;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatRequest = {
  question: string;
  readingSummary: string;
  cards: DrawnCard[];
  messages: ChatMessage[];
};

export type ChatResponse = {
  message: string;
};
