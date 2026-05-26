import type {
  QuestionAssistRequest,
  QuestionAssistResponse,
  ReadingRequest,
  ReadingResponse,
  SpreadRecommendationRequest,
  SpreadRecommendationResponse,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function getApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function postJson<TResponse>(path: string, payload: unknown, label: string): Promise<TResponse> {
  const response = await fetch(getApiUrl(path), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const responseText = await response.text();

  if (!response.ok) {
    console.error(`[${label}] HTTP ${response.status}`, responseText.slice(0, 500));
    throw new Error(`${label} request failed: ${response.status}`);
  }

  if (!contentType.includes("application/json")) {
    console.error(`[${label}] Expected JSON but received ${contentType || "unknown content-type"}`, responseText.slice(0, 500));
    throw new Error(`${label} request did not return JSON`);
  }

  try {
    return JSON.parse(responseText) as TResponse;
  } catch (error) {
    console.error(`[${label}] Failed to parse JSON`, error, responseText.slice(0, 500));
    throw new Error(`${label} response JSON parse failed`);
  }
}

export async function requestQuestionAssist(payload: QuestionAssistRequest): Promise<QuestionAssistResponse> {
  return postJson<QuestionAssistResponse>("/api/question-assist", payload, "질문 보조 API");
}

export async function requestSpreadRecommendation(payload: SpreadRecommendationRequest): Promise<SpreadRecommendationResponse> {
  return postJson<SpreadRecommendationResponse>("/api/spread-recommendation", payload, "배열 추천 API");
}

export async function requestReading(payload: ReadingRequest): Promise<ReadingResponse> {
  return postJson<ReadingResponse>("/api/reading", payload, "리딩 API");
}
