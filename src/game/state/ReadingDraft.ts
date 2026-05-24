export type ReadingCategory = "love" | "work" | "money" | "relationship" | "free";

export type ReadingDraft = {
  category: ReadingCategory;
  question: string;
  spreadId: string;
};

export const categoryLabels: Record<ReadingCategory, string> = {
  love: "연애",
  work: "일과 커리어",
  money: "돈과 기회",
  relationship: "인간관계",
  free: "자유 질문",
};
