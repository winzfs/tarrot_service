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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function postJson<TResponse>(path: string, payload: unknown, label: string): Promise<TResponse> {
  const startedAt = performance.now();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const elapsedMs = Math.round(performance.now() - startedAt);
  const contentType = response.headers.get("content-type") ?? "";
  const responseText = await response.text();

  if (!response.ok) {
    console.error(`[${label}] HTTP ${response.status} after ${elapsedMs}ms`, responseText.slice(0, 500));
    throw new Error(`${label} request failed: ${response.status}`);
  }

  if (!contentType.includes("application/json")) {
    console.error(
      `[${label}] Expected JSON but received ${contentType || "unknown content-type"} after ${elapsedMs}ms`,
      responseText.slice(0, 500),
    );
    throw new Error(`${label} request did not return JSON`);
  }

  try {
    const parsed = JSON.parse(responseText) as TResponse;
    console.info(`[${label}] API response received in ${elapsedMs}ms`);
    return parsed;
  } catch (error) {
    console.error(`[${label}] Failed to parse JSON after ${elapsedMs}ms`, error, responseText.slice(0, 500));
    throw new Error(`${label} response JSON parse failed`);
  }
}

export async function requestQuestionAssist(payload: QuestionAssistRequest): Promise<QuestionAssistResponse> {
  return postJson<QuestionAssistResponse>("/api/question-assist", payload, "Question assist");
}

export async function requestSpreadRecommendation(payload: SpreadRecommendationRequest): Promise<SpreadRecommendationResponse> {
  return postJson<SpreadRecommendationResponse>("/api/spread-recommendation", payload, "Spread recommendation");
}

export async function requestReading(payload: ReadingRequest): Promise<ReadingResponse> {
  return postJson<ReadingResponse>("/api/reading", payload, "Reading");
}

export async function requestChat(payload: ChatRequest): Promise<ChatResponse> {
  return postJson<ChatResponse>("/api/chat", payload, "Chat");
}
