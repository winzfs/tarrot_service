import type { DrawnCard, TarotReading } from "../tarot/types";
import type { ReadingCategory } from "../game/state/ReadingDraft";

export type ReadingRequest = {
  category: ReadingCategory;
  question: string;
  spreadId: "past-present-future";
  cards: DrawnCard[];
};

export type ReadingResponse = TarotReading;
