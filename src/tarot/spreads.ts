import type { ReadingCategory } from "../game/state/ReadingDraft";
import type { TarotSpread } from "./types";

export const DEFAULT_SPREAD_ID = "past-present-future";
export const DAILY_ONE_CARD_SPREAD_ID = "daily-one-card";
export const SITUATION_ADVICE_SPREAD_ID = "situation-obstacle-advice";
export const RELATIONSHIP_THREE_SPREAD_ID = "relationship-three";
export const CHOICE_THREE_SPREAD_ID = "choice-three";

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

export const tarotSpreads: TarotSpread[] = [
  {
    id: DAILY_ONE_CARD_SPREAD_ID,
    name: "오늘의 한 장",
    subtitle: "하나의 카드 · 하나의 메시지",
    description: "지금 가장 먼저 바라봐야 할 마음의 흐름과 오늘의 태도를 한 장의 카드로 읽는 빠른 배열입니다.",
    recommendedFor: [] satisfies ReadingCategory[],
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
    id: SITUATION_ADVICE_SPREAD_ID,
    name: "상황과 조언의 세 문",
    subtitle: "상황 · 장애물 · 조언",
    description: "현재 상황을 읽고, 막고 있는 것을 확인한 뒤, 지금 취할 수 있는 태도를 찾는 3장 배열입니다.",
    recommendedFor: ["work", "money"] satisfies ReadingCategory[],
    cardsToDraw: 3,
    positions: [
      {
        id: "situation",
        label: "현재 상황",
        chapterTitle: "제1장. 지금 놓인 자리",
        shortMeaning: "질문이 놓인 현재 상황과 가장 강하게 드러난 흐름입니다.",
        promptMeaning: "사용자가 질문한 문제에서 현재 실제로 벌어지고 있는 상태, 감정, 조건, 흐름을 나타낸다. 과장하지 말고 현재 상황의 중심을 읽는다.",
        aura: "present-aura",
        layoutHint: { x: 0.28, y: 0.47 },
      },
      {
        id: "obstacle",
        label: "막고 있는 것",
        chapterTitle: "제2장. 문턱의 그림자",
        shortMeaning: "지금 흐름을 막거나 헷갈리게 만드는 요소입니다.",
        promptMeaning: "질문이 풀리지 않게 만드는 장애물, 오해, 두려움, 현실적 제약, 반복되는 패턴을 나타낸다. 사용자를 탓하지 않고 확인할 지점으로 해석한다.",
        aura: "past-aura",
        layoutHint: { x: 0.5, y: 0.47 },
      },
      {
        id: "advice",
        label: "조언",
        chapterTitle: "제3장. 손에 남은 별",
        shortMeaning: "지금 할 수 있는 작은 선택과 현실적인 태도입니다.",
        promptMeaning: "사용자가 지금 취할 수 있는 현실적인 행동, 태도, 확인할 점을 나타낸다. 거창한 결론보다 작은 다음 걸음을 중심으로 해석한다.",
        aura: "future-aura",
        layoutHint: { x: 0.72, y: 0.47 },
      },
    ],
  },
  {
    id: RELATIONSHIP_THREE_SPREAD_ID,
    name: "관계의 거울",
    subtitle: "나 · 상대 · 관계",
    description: "나의 마음, 상대의 흐름, 관계의 현재 균형을 읽는 3장 관계 배열입니다.",
    recommendedFor: ["love", "relationship"] satisfies ReadingCategory[],
    cardsToDraw: 3,
    positions: [
      {
        id: "me",
        label: "나의 마음",
        chapterTitle: "제1장. 내 안의 물결",
        shortMeaning: "이 관계를 바라보는 나의 감정과 욕구입니다.",
        promptMeaning: "사용자가 이 관계 안에서 느끼는 감정, 기대, 두려움, 진짜 원하는 것을 나타낸다. 사용자의 내면을 부드럽게 비춘다.",
        aura: "present-aura",
        layoutHint: { x: 0.28, y: 0.47 },
      },
      {
        id: "other",
        label: "상대의 흐름",
        chapterTitle: "제2장. 건너편의 달빛",
        shortMeaning: "상대에게서 느껴지는 태도와 흐름입니다.",
        promptMeaning: "상대의 마음을 사실처럼 단정하지 말고, 사용자가 관찰할 수 있는 상대의 태도, 거리감, 표현 방식, 관계 안에서의 흐름으로 해석한다.",
        aura: "past-aura",
        layoutHint: { x: 0.5, y: 0.47 },
      },
      {
        id: "relationship",
        label: "관계의 흐름",
        chapterTitle: "제3장. 둘 사이의 별길",
        shortMeaning: "두 사람 사이에 지금 만들어지는 관계의 방향입니다.",
        promptMeaning: "나와 상대의 에너지가 만나 현재 관계에 어떤 흐름을 만들고 있는지, 앞으로 어떤 태도가 필요한지 가능성 중심으로 해석한다.",
        aura: "future-aura",
        layoutHint: { x: 0.72, y: 0.47 },
      },
    ],
  },
  {
    id: CHOICE_THREE_SPREAD_ID,
    name: "선택의 두 문",
    subtitle: "선택 A · 선택 B · 조언",
    description: "두 선택지의 흐름을 비교하고, 지금 붙잡아야 할 기준을 찾는 3장 배열입니다.",
    recommendedFor: [] satisfies ReadingCategory[],
    cardsToDraw: 3,
    positions: [
      {
        id: "choice-a",
        label: "선택 A",
        chapterTitle: "제1장. 첫 번째 문",
        shortMeaning: "첫 번째 선택이 열어줄 수 있는 흐름입니다.",
        promptMeaning: "사용자가 암시한 첫 번째 선택지 또는 계속해보는 방향이 가져올 수 있는 흐름, 장점, 주의점을 나타낸다. 선택을 강요하지 않는다.",
        aura: "past-aura",
        layoutHint: { x: 0.28, y: 0.47 },
      },
      {
        id: "choice-b",
        label: "선택 B",
        chapterTitle: "제2장. 두 번째 문",
        shortMeaning: "두 번째 선택이 열어줄 수 있는 흐름입니다.",
        promptMeaning: "사용자가 암시한 두 번째 선택지 또는 멈추거나 바꾸는 방향이 가져올 수 있는 흐름, 장점, 주의점을 나타낸다. 선택을 단정하지 않는다.",
        aura: "present-aura",
        layoutHint: { x: 0.5, y: 0.47 },
      },
      {
        id: "choice-advice",
        label: "선택의 기준",
        chapterTitle: "제3장. 손에 쥘 열쇠",
        shortMeaning: "두 문 앞에서 지금 기준으로 삼아야 할 조언입니다.",
        promptMeaning: "두 선택지를 비교할 때 사용자가 기준으로 삼아야 할 가치, 확인할 점, 현실적인 다음 행동을 나타낸다.",
        aura: "future-aura",
        layoutHint: { x: 0.72, y: 0.47 },
      },
    ],
  },
  {
    id: DEFAULT_SPREAD_ID,
    name: "시간의 세 문",
    subtitle: "과거 · 현재 · 미래",
    description: "현재 질문에 영향을 준 과거의 흐름, 지금 작동하는 에너지, 앞으로 열릴 가능성을 차례로 읽는 기본 3장 배열입니다.",
    recommendedFor: [] satisfies ReadingCategory[],
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

export function getRecommendedSpreadId(category: ReadingCategory, question = ""): string {
  const normalized = question.trim().toLowerCase();

  if (category === "love" || category === "relationship") return RELATIONSHIP_THREE_SPREAD_ID;
  if (category === "work" || category === "money") return SITUATION_ADVICE_SPREAD_ID;

  if (!normalized) return DEFAULT_SPREAD_ID;

  if (hasAny(normalized, ["오늘", "하루", "지금 필요한", "한마디", "가볍게", "짧게", "조언만", "메시지"])) {
    return DAILY_ONE_CARD_SPREAD_ID;
  }

  if (hasAny(normalized, ["선택", "둘 중", "둘중", "a", "b", "갈까", "말까", "할까", "하지 말까", "해야", "그만", "이직", "퇴사", "고백", "연락할까", "헤어질까", "계속할까"])) {
    return CHOICE_THREE_SPREAD_ID;
  }

  if (hasAny(normalized, ["연애", "사랑", "관계", "상대", "그 사람", "마음", "연락", "재회", "썸", "남자", "여자", "친구", "동료", "가족"])) {
    return RELATIONSHIP_THREE_SPREAD_ID;
  }

  if (hasAny(normalized, ["문제", "막", "막힘", "어려", "힘들", "불안", "걱정", "고민", "어떻게", "해결", "방법", "조언", "해야 할 일"])) {
    return SITUATION_ADVICE_SPREAD_ID;
  }

  if (hasAny(normalized, ["미래", "앞으로", "흐름", "어떻게 될", "될까", "결과", "전망"])) {
    return DEFAULT_SPREAD_ID;
  }

  return SITUATION_ADVICE_SPREAD_ID;
}
