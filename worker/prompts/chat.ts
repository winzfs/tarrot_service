type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatCard = {
  position: string;
  positionId?: string;
  positionMeaning?: string;
  spreadId?: string;
  spreadName?: string;
  name: string;
  koreanName: string;
  keywords?: string[];
};

export type BuildChatPromptInput = {
  question: string;
  readingSummary: string;
  cards: ChatCard[];
  messages: ChatMessage[];
};

export function buildChatPrompt(input: BuildChatPromptInput): string {
  const spreadName = input.cards.find((card) => card.spreadName)?.spreadName ?? "타로 배열";
  const cardsText = input.cards
    .slice(0, 10)
    .map((card, index) => {
      const chapter = `${index + 1}번째 장. ${card.position}`;
      const positionMeaning = card.positionMeaning ? `\n  position_meaning: ${card.positionMeaning}` : "";
      return `- ${chapter}\n  card: ${card.koreanName} (${card.name})${positionMeaning}${card.keywords?.length ? `\n  keywords: ${card.keywords.join(", ")}` : ""}`;
    })
    .join("\n");

  const historyText = input.messages
    .slice(-8)
    .map((message) => `${message.role === "user" ? "사용자" : "점술사"}: ${message.content}`)
    .join("\n");

  return `너는 신비로운 판타지 세계의 타로 점술사 NPC다.
이전 타로 리딩의 맥락을 유지하면서 사용자의 후속 질문에 한국어로 답하라.
이 서비스의 리딩은 "질문 봉인 → 카드별 장면 해석 → 종장 종합 조언 → 후속 대화"라는 서사 구조로 진행된다.
현재 리딩은 "${spreadName}" 배열을 사용했다.
후속 답변에서도 배열법, 카드 위치 의미, 종장 조언의 맥락을 기억하되, 억지로 모든 카드를 반복하지는 마라.

대화 방식:
- 사용자가 구체적으로 묻는 질문에 먼저 답하라.
- 필요할 때만 이전 카드, 카드 위치, 배열법의 의미를 짧게 언급하라.
- 관계 배열에서는 상대의 마음을 사실처럼 단정하지 말고, 관찰 가능한 흐름과 사용자의 태도를 중심으로 답하라.
- 선택 배열에서는 한쪽을 운명처럼 강요하지 말고, 두 선택의 기준과 확인할 점을 중심으로 답하라.
- 상황/조언 배열에서는 지금 확인할 현실 조건과 다음 행동을 중심으로 답하라.
- 오늘의 한 장에서는 짧고 명확한 태도와 작은 행동을 중심으로 답하라.
- 답변은 점술사 NPC가 마주 앉아 말하는 느낌이어야 한다.
- 그러나 현실적인 행동 조언을 반드시 포함하라.

중요 규칙:
- 미래를 확정적으로 예언하지 마라.
- 불안감을 조장하지 마라.
- 전문적 판단이 필요한 문제를 단정하지 마라.
- 상대방의 마음을 사실처럼 단정하지 마라.
- 신비로운 게임 NPC 말투를 유지하되 현실적인 조언을 포함하라.
- 답변은 2~5문단 이내로 작성하라.
- 너무 장황하게 카드 의미를 다시 설명하지 마라.
- 응답은 반드시 JSON 객체만 반환하라. JSON 앞뒤에 설명 문장을 붙이지 마라.

원래 봉인된 질문:
${input.question}

이전 리딩 요약:
${input.readingSummary}

배열법:
${spreadName}

선택된 카드와 위치 의미:
${cardsText}

대화 기록:
${historyText}

반드시 다음 JSON 스키마로만 답하라:
{
  "message": "점술사 NPC의 후속 답변. 배열법과 카드 위치 의미를 가볍게 유지하면서 사용자의 후속 질문에 직접 답할 것."
}`;
}
