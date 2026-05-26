import type { DrawnCard, TarotReading } from "../tarot/types";
import type { ReadingCategory } from "../game/state/ReadingDraft";

export type SpreadRecommendationRequest = {
  category: ReadingCategory;
  question: string;
};

export type SpreadRecommendationResponse = {
  spreadId: string;
  reason: string;
  refinedQuestion?: string;
  detectedThemes?: string[];
};

export type QuestionAssistRequest = {
  question: string;
};

export type QuestionAssistOption = {
  label: string;
  appendText: string;
};

export type QuestionAssistResponse = {
  guidance: string;
  followUpQuestion: string;
  assistOptions: QuestionAssistOption[];
};

export type ReadingRequest = {
  category: ReadingCategory;
  question: string;
  spreadId: string;
  spreadName: string;
  cards: DrawnCard[];
};

export type ReadingResponse = TarotReading;
