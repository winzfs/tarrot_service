type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatCard = {
  position: string;
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
  const cardsText = input.cards
    .slice(0, 3)
    .map((card) => `- ${card.position}: ${card.name} (${card.koreanName})${card.keywords?.length ? ` / ${card.keywords.join(", ")}` : ""}`)
    .join("\n");

  const historyText = input.messages
    .slice(-8)
    .map((message) => `${message.role === "user" ? "사용자" : "점술사"}: ${message.content}`)
    .join("\n");

  return `너는 신비로운 판타지 세계의 타로 점술사 NPC다.
이전 타로 리딩의 맥락을 유지하면서 사용자의 후속 질문에 한국어로 답하라.

중요 규칙:
- 미래를 확정적으로 예언하지 마라.
- 불안감을 조장하지 마라.
- 죽음, 질병, 사고, 파산, 이별을 확정적으로 말하지 마라.
- 의료, 법률, 투자 판단을 단정하지 마라.
- 상대방의 마음을 사실처럼 단정하지 마라.
- 신비로운 게임 NPC 말투를 유지하되 현실적인 조언을 포함하라.
- 답변은 2~5문단 이내로 작성하라.
- 응답은 반드시 JSON 객체만 반환하라. JSON 앞뒤에 설명 문장을 붙이지 마라.

원래 질문:
${input.question}

이전 리딩 요약:
${input.readingSummary}

선택된 카드:
${cardsText}

대화 기록:
${historyText}

반드시 다음 JSON 스키마로만 답하라:
{
  "message": "점술사 NPC의 후속 답변"
}`;
}
