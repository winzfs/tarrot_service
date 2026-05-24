import type { ReadingCategory } from "../game/state/ReadingDraft";
import type { TarotSpread } from "./types";

export const DEFAULT_SPREAD_ID = "past-present-future";
export const DAILY_ONE_CARD_SPREAD_ID = "daily-one-card";

export const tarotSpreads: TarotSpread[] = [
  {
    id: DAILY_ONE_CARD_SPREAD_ID,
    name: "오늘의 한 장",
    subtitle: "하나의 카드 · 하나의 메시지",
    description: "지금 가장 먼저 바라봐야 할 마음의 흐름과 오늘의 태도를 한 장의 카드로 읽는 빠른 배열입니다.",
    recommendedFor: ["free"] satisfies ReadingCategory[],
    cardsToDraw: 1,
    positions: [
      {
        id: "daily-message",
        label: "오늘의 메시지",
        chapterTitle: "제1장. 오늘의 별빛",
        shortMeaning: "지금 가장 먼저 바라봐야 할 마음의 흐름과 오늘의 태도입니다.",
        promptMeaning: "사용자의 질문 또는 현재 마음에 대해 지금 가장 먼저 확인해야 할 핵심 메시지, 태도, 작은 행동을 나타낸다. 거창한 예언이 아니라 오늘 붙잡을 수 있는 현실적인 힌트로 해석한다.",
        aura: "present-aura",
        layoutHint: { x: 0.5, y: 0.47 },
      },
    ],
  },
  {
    id: DEFAULT_SPREAD_ID,
    name: "시간의 세 문",
    subtitle: "과거 · 현재 · 미래",
    description: "현재 질문에 영향을 준 과거의 흐름, 지금 작동하는 에너지, 앞으로 열릴 가능성을 차례로 읽는 기본 3장 배열입니다.",
    recommendedFor: ["love", "work", "money", "relationship"] satisfies ReadingCategory[],
    cardsToDraw: 3,
    positions: [
      {
        id: "past",
        label: "과거",
        chapterTitle: "제1장. 지나간 문",
        shortMeaning: "현재 질문에 영향을 준 이전 흐름과 감정의 흔적입니다.",
        promptMeaning: "현재 상황에 영향을 주는 과거의 사건, 감정, 습관, 관계의 배경을 나타낸다. 단순한 과거 사건 나열이 아니라 지금 질문에 남아 있는 영향으로 해석한다.",
        aura: "past-aura",
        layoutHint: { x: 0.28, y: 0.47 },
      },
      {
        id: "present",
        label: "현재",
        chapterTitle: "제2장. 지금의 불꽃",
        shortMeaning: "지금 가장 강하게 작동하는 마음과 상황의 중심입니다.",
        promptMeaning: "사용자가 지금 마주한 핵심 상태, 감정, 선택의 압력, 현실적 조건을 나타낸다. 질문의 현재 중심축으로 해석한다.",
        aura: "present-aura",
        layoutHint: { x: 0.5, y: 0.47 },
      },
      {
        id: "future",
        label: "미래",
        chapterTitle: "제3장. 아직 오지 않은 별",
        shortMeaning: "현재 흐름이 이어질 때 열릴 가능성의 방향입니다.",
        promptMeaning: "확정된 예언이 아니라 현재 태도와 선택이 이어질 때 나타날 가능성, 주의점, 열릴 수 있는 방향을 나타낸다.",
        aura: "future-aura",
        layoutHint: { x: 0.72, y: 0.47 },
      },
    ],
  },
];

export function getTarotSpread(spreadId = DEFAULT_SPREAD_ID): TarotSpread {
  return tarotSpreads.find((spread) => spread.id === spreadId) ?? tarotSpreads.find((spread) => spread.id === DEFAULT_SPREAD_ID) ?? tarotSpreads[0];
}

export function getRecommendedSpreadId(category: ReadingCategory): string {
  return tarotSpreads.find((spread) => spread.recommendedFor.includes(category))?.id ?? DEFAULT_SPREAD_ID;
}
