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

export const fallbackReading: ReadingResponse = {
  title: "안개 낀 별의 문",
  summary: "카드의 속삭임이 잠시 흐릿해졌습니다. 하지만 지금의 질문을 차분히 바라보는 것만으로도 첫 문은 열렸습니다.",
  cards: [],
  advice: "질문을 조금 더 짧고 구체적으로 바꾸어 다시 시도해보세요. 타로는 미래를 고정하는 예언이 아니라, 지금의 마음과 상황을 비추는 거울입니다.",
  npcLine: "안개는 걷힙니다. 별빛은 다시 말을 걸 것입니다.",
};

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

export function parseReadingResponse(text: string): ReadingResponse {
  const trimmed = text.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace < 0 || lastBrace <= firstBrace) {
    return fallbackReading;
  }

  try {
    const parsed = JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as Partial<ReadingResponse>;

    return {
      title: typeof parsed.title === "string" ? parsed.title : fallbackReading.title,
      summary: typeof parsed.summary === "string" ? parsed.summary : fallbackReading.summary,
      cards: Array.isArray(parsed.cards)
        ? parsed.cards
            .filter((card): card is ReadingCardResponse => {
              const maybe = card as Partial<ReadingCardResponse>;
              return (
                typeof maybe.position === "string" &&
                typeof maybe.name === "string" &&
                typeof maybe.koreanName === "string" &&
                typeof maybe.reading === "string"
              );
            })
            .slice(0, 3)
        : [],
      advice: typeof parsed.advice === "string" ? parsed.advice : fallbackReading.advice,
      npcLine: typeof parsed.npcLine === "string" ? parsed.npcLine : fallbackReading.npcLine,
    };
  } catch {
    return fallbackReading;
  }
}
