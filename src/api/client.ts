import type { ChatRequest, ChatResponse, ReadingRequest, ReadingResponse } from "./types";

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
