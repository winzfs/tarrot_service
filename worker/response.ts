type ReadingCardResponse = {
  position: string;
  name: string;
  koreanName: string;
  reading: string;
};

export type ReadingResponse = {
  title: string;
  summary: string;
  cards: ReadingCardResponse[];
  advice: string;
  npcLine: string;
};

export type ChatResponse = {
  message: string;
};

export type FallbackReadingCardInput = {
  position: string;
  positionMeaning?: string;
  name: string;
  koreanName: string;
  keywords?: string[];
  description?: string;
};

export type ContextualFallbackReadingInput = {
  question: string;
  spreadName: string;
  cards: FallbackReadingCardInput[];
};

export const fallbackReading: ReadingResponse = {
  title: "안개 낀 별의 문",
  summary: "카드의 속삭임이 잠시 흐릿해졌습니다. 하지만 지금의 질문을 차분히 바라보는 것만으로도 첫 문은 열렸습니다.",
  cards: [],
  advice: "질문을 조금 더 짧고 구체적으로 바꾸어 다시 시도해보세요. 타로는 미래를 고정하는 예언이 아니라, 지금의 마음과 상황을 비추는 거울입니다.",
  npcLine: "안개는 걷힙니다. 별빛은 다시 말을 걸 것입니다.",
};

export const fallbackChat: ChatResponse = {
  message:
    "안개가 잠시 짙어져 점술사의 목소리가 흐려졌습니다. 질문을 조금 더 짧게 바꾸어 다시 물어보세요. 카드는 언제나 가능성을 비추는 거울입니다.",
};

function compact(value: string, max = 220): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function getKeywordText(card: FallbackReadingCardInput): string {
  const keywords = Array.isArray(card.keywords) ? card.keywords.map((keyword) => keyword.trim()).filter(Boolean).slice(0, 3) : [];
  return keywords.length > 0 ? keywords.join(" · ") : "카드의 핵심 상징";
}

export function buildContextualFallbackReading(input: ContextualFallbackReadingInput): ReadingResponse {
  const question = compact(input.question, 180) || "지금의 질문";
  const spreadName = compact(input.spreadName, 80) || "선택된 배열";
  const safeCards = input.cards.slice(0, 10);
  const cards = safeCards.map((card): ReadingCardResponse => {
    const position = compact(card.position, 80) || "카드의 자리";
    const positionMeaning = compact(card.positionMeaning || "이 위치는 질문의 한 장면을 비춥니다.", 160);
    const koreanName = compact(card.koreanName, 80) || "알 수 없는 카드";
    const name = compact(card.name, 80) || "Unknown Card";
    const keywordText = getKeywordText(card);
    return {
      position,
      name,
      koreanName,
      reading: `${position}의 자리에 놓인 ${koreanName}은 '${question}'라는 질문에서 ${positionMeaning} 이 흐름을 먼저 보라고 말합니다. ${keywordText}의 상징은 카드의 일반 뜻보다 지금 질문 속에서 반복되는 감정, 조건, 선택 기준을 비춥니다. 오늘은 결론을 단정하기보다 이 카드가 가리키는 작은 확인점 하나를 현실에서 점검해보세요.`,
    };
  });

  const cardNames = cards.map((card) => card.koreanName).join(" · ");
  return {
    title: "봉인된 질문에 비친 카드의 장면",
    summary: `${spreadName}은 '${question}'라는 질문을 카드의 자리별 장면으로 나누어 보여줍니다. ${cardNames || "선택된 카드들"}은 지금 단정적인 답보다 흐름을 읽고 다음 행동을 작게 정리하라는 신호를 줍니다.`,
    cards,
    advice: `종장에서는 '${question}'에 대해 하나의 확답을 서두르기보다, 카드들이 공통으로 가리키는 조건을 먼저 확인하라고 말합니다. 지금 중요한 것은 감정적으로 결론을 고정하는 일이 아니라, 실제로 바꿀 수 있는 선택지와 아직 확인되지 않은 변수를 나누어 보는 것입니다. 오늘은 가장 마음에 걸리는 지점 하나를 적고, 그 지점에 대해 할 수 있는 작은 행동 하나만 정해보세요.`,
    npcLine: "별빛은 답을 강요하지 않습니다. 다만 지금 바라봐야 할 문을 조용히 밝혀줄 뿐입니다.",
  };
}

export function extractModelText(result: unknown): string {
  if (typeof result === "string") return result;

  if (result && typeof result === "object") {
    const record = result as Record<string, unknown>;

    if (typeof record.response === "string") return record.response;
    if (typeof record.text === "string") return record.text;
    if (typeof record.result === "string") return record.result;

    const choices = record.choices;
    if (Array.isArray(choices) && choices.length > 0) {
      const firstChoice = choices[0] as Record<string, unknown>;
      if (typeof firstChoice.text === "string") return firstChoice.text;
      if (firstChoice.message && typeof firstChoice.message === "object") {
        const message = firstChoice.message as Record<string, unknown>;
        if (typeof message.content === "string") return message.content;
      }
    }
  }

  return "";
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace < 0 || lastBrace <= firstBrace) return null;

  try {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeText(value: unknown, fallback: string, max = 1200): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

export function parseReadingResponse(text: string, fallback: ReadingResponse = fallbackReading): ReadingResponse {
  const parsed = extractJsonObject(text) as Partial<ReadingResponse> | null;

  if (!parsed) return fallback;

  const parsedCards = Array.isArray(parsed.cards)
    ? parsed.cards
        .filter((card): card is ReadingCardResponse => {
          const maybe = card as Partial<ReadingCardResponse>;
          return (
            typeof maybe.position === "string" &&
            typeof maybe.name === "string" &&
            typeof maybe.koreanName === "string" &&
            typeof maybe.reading === "string" &&
            maybe.reading.trim().length > 0
          );
        })
        .slice(0, 10)
    : [];

  return {
    title: normalizeText(parsed.title, fallback.title, 160),
    summary: normalizeText(parsed.summary, fallback.summary, 420),
    cards: parsedCards.length > 0 ? parsedCards : fallback.cards,
    advice: normalizeText(parsed.advice, fallback.advice, 1200),
    npcLine: normalizeText(parsed.npcLine, fallback.npcLine, 220),
  };
}

export function parseChatResponse(text: string): ChatResponse {
  const parsed = extractJsonObject(text) as Partial<ChatResponse> | null;

  if (!parsed || typeof parsed.message !== "string") {
    const trimmed = text.trim();
    return trimmed.length > 0 ? { message: trimmed.slice(0, 1600) } : fallbackChat;
  }

  return { message: parsed.message.slice(0, 1600) };
}
