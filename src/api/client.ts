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
const DEBUG_QUERY_KEY = "debug";
const DEBUG_STORAGE_KEY = "arcana-api-debug";

type ApiDebugLevel = "info" | "warn" | "error";
type DebuggableApiResponse = { _debugSource?: unknown; _debugReason?: unknown };

function isApiDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get(DEBUG_QUERY_KEY) === "1") {
    window.localStorage.setItem(DEBUG_STORAGE_KEY, "1");
    return true;
  }
  if (params.get(DEBUG_QUERY_KEY) === "0") {
    window.localStorage.removeItem(DEBUG_STORAGE_KEY);
    return false;
  }
  return window.localStorage.getItem(DEBUG_STORAGE_KEY) === "1";
}

function showApiDebugToast(message: string, level: ApiDebugLevel = "info"): void {
  if (!isApiDebugEnabled() || typeof document === "undefined") return;

  const rootId = "arcana-api-debug-overlay";
  let root = document.getElementById(rootId);
  if (!root) {
    root = document.createElement("aside");
    root.id = rootId;
    root.style.position = "fixed";
    root.style.left = "10px";
    root.style.right = "10px";
    root.style.bottom = "calc(10px + env(safe-area-inset-bottom, 0px))";
    root.style.zIndex = "999999";
    root.style.display = "flex";
    root.style.flexDirection = "column";
    root.style.gap = "6px";
    root.style.pointerEvents = "none";
    root.style.fontFamily = "system-ui, sans-serif";
    document.body.appendChild(root);
  }

  const item = document.createElement("div");
  item.textContent = message;
  item.style.padding = "9px 11px";
  item.style.border = "1px solid rgba(246, 211, 101, 0.72)";
  item.style.background = level === "error" ? "rgba(70, 10, 28, 0.94)" : level === "warn" ? "rgba(55, 36, 8, 0.94)" : "rgba(12, 8, 30, 0.94)";
  item.style.color = level === "error" ? "#ffd1dc" : "#fff6d6";
  item.style.fontSize = "12px";
  item.style.lineHeight = "1.35";
  item.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.35)";
  item.style.whiteSpace = "pre-wrap";
  item.style.wordBreak = "break-word";
  root.appendChild(item);

  while (root.children.length > 5) {
    root.firstElementChild?.remove();
  }

  window.setTimeout(() => item.remove(), level === "error" ? 9500 : 6500);
}

function getApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

function getAiDebugInfo(parsed: unknown): { suffix: string; level?: ApiDebugLevel } {
  if (!parsed || typeof parsed !== "object") return { suffix: "" };
  const response = parsed as DebuggableApiResponse;
  const source = typeof response._debugSource === "string" ? response._debugSource : "";
  const reason = typeof response._debugReason === "string" ? response._debugReason : "";
  if (!source) return { suffix: "" };
  return {
    suffix: `\nAI: ${source}${reason ? ` / ${reason}` : ""}`,
    level: source === "fallback" ? "warn" : "info",
  };
}

async function postJson<TResponse>(path: string, payload: unknown, label: string): Promise<TResponse> {
  const url = getApiUrl(path);
  const startedAt = performance.now();
  showApiDebugToast(`${label}\n요청 시작: ${url}`, "info");

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - startedAt);
    const detail = error instanceof Error ? error.message : String(error);
    showApiDebugToast(`${label}\n네트워크 실패 ${elapsedMs}ms\n${detail}`, "error");
    console.error(`[${label}] Network error after ${elapsedMs}ms`, error);
    throw error;
  }

  const elapsedMs = Math.round(performance.now() - startedAt);
  const contentType = response.headers.get("content-type") ?? "";
  const responseText = await response.text();

  if (!response.ok) {
    const preview = responseText.slice(0, 220);
    showApiDebugToast(`${label}\nHTTP ${response.status} · ${elapsedMs}ms\n${preview}`, "error");
    console.error(`[${label}] HTTP ${response.status} after ${elapsedMs}ms`, responseText.slice(0, 500));
    throw new Error(`${label} request failed: ${response.status}`);
  }

  if (!contentType.includes("application/json")) {
    const preview = responseText.slice(0, 220);
    showApiDebugToast(`${label}\nJSON 아님 · ${elapsedMs}ms\ncontent-type: ${contentType || "unknown"}\n${preview}`, "error");
    console.error(
      `[${label}] Expected JSON but received ${contentType || "unknown content-type"} after ${elapsedMs}ms`,
      responseText.slice(0, 500),
    );
    throw new Error(`${label} request did not return JSON`);
  }

  try {
    const parsed = JSON.parse(responseText) as TResponse;
    const aiDebug = getAiDebugInfo(parsed);
    const fastHint = !aiDebug.suffix && elapsedMs < 900 ? " · 너무 빠름: fallback/로컬 응답 의심" : "";
    showApiDebugToast(`${label}\nJSON 응답 ${elapsedMs}ms${fastHint}${aiDebug.suffix}`, aiDebug.level ?? (elapsedMs < 900 ? "warn" : "info"));
    console.info(`[${label}] API response received in ${elapsedMs}ms`);
    return parsed;
  } catch (error) {
    const preview = responseText.slice(0, 220);
    showApiDebugToast(`${label}\nJSON 파싱 실패 · ${elapsedMs}ms\n${preview}`, "error");
    console.error(`[${label}] Failed to parse JSON after ${elapsedMs}ms`, error, responseText.slice(0, 500));
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

export async function requestChat(payload: ChatRequest): Promise<ChatResponse> {
  return postJson<ChatResponse>("/api/chat", payload, "채팅 API");
}
