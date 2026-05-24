import type {
  ChatRequest,
  ChatResponse,
  QuestionAssistRequest,
  QuestionAssistResponse,
  ReadingRequest,
  ReadingResponse,
  SpreadRecommendationRequest,
  SpreadRecommendationResponse,
} from "./types";

export async function requestQuestionAssist(payload: QuestionAssistRequest): Promise<QuestionAssistResponse> {
  const response = await fetch("/api/question-assist", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Question assist request failed: ${response.status}`);
  }

  return response.json() as Promise<QuestionAssistResponse>;
}

export async function requestSpreadRecommendation(payload: SpreadRecommendationRequest): Promise<SpreadRecommendationResponse> {
  const response = await fetch("/api/spread-recommendation", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Spread recommendation request failed: ${response.status}`);
  }

  return response.json() as Promise<SpreadRecommendationResponse>;
}

export async function requestReading(payload: ReadingRequest): Promise<ReadingResponse> {
  const response = await fetch("/api/reading", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Reading request failed: ${response.status}`);
  }

  return response.json() as Promise<ReadingResponse>;
}

export async function requestChat(payload: ChatRequest): Promise<ChatResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`);
  }

  return response.json() as Promise<ChatResponse>;
}
