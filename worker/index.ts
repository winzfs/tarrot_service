import { buildChatPrompt } from "./prompts/chat";
import { buildQuestionAssistPrompt } from "./prompts/questionAssist";
import { buildReadingPrompt } from "./prompts/reading";
import { buildSpreadRecommendationPrompt } from "./prompts/spread";
import { buildContextualFallbackReading, extractModelText, fallbackChat, parseChatResponse, parseReadingResponse, type ReadingResponse } from "./response";

export interface Env {
  AI?: Ai;
  ASSETS: Fetcher;
  AI_MODEL?: string;
}

type SpreadRecommendationRequestBody = { category?: string; question?: string };
type QuestionAssistRequestBody = { question?: string };
type QuestionAssistOption = { label: string; appendText: string };
type QuestionAssistResponse = { guidance: string; followUpQuestion: string; assistOptions: QuestionAssistOption[] };
type SpreadRecommendationResponse = { spreadId: string; reason: string; refinedQuestion: string; detectedThemes: string[] };
type ReadingCardBody = { position?: string; positionId?: string; positionMeaning?: string; name?: string; koreanName?: string; keywords?: string[]; description?: string };
type ReadingRequestBody = { category?: string; question?: string; spreadId?: string; spreadName?: string; cards?: ReadingCardBody[] };
type ChatRequestBody = { question?: string; readingSummary?: string; cards?: Omit<ReadingCardBody, "description">[]; messages?: { role?: string; content?: string }[] };
type AiJsonRequest = { prompt: string; max_tokens: number; temperature: number; guided_json: Record<string, unknown> };

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };
const BUILD_VERSION = "ai-diagnostics-2026-05-26-0409";
const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const allowedSpreadIds = new Set(["daily-one-card", "situation-obstacle-advice", "past-present-future", "relationship-mirror-five", "choice-crossroad-five"]);

const questionAssistGuidedJson = { type: "object", properties: { guidance: { type: "string" }, followUpQuestion: { type: "string" }, assistOptions: { type: "array", items: { type: "object", properties: { label: { type: "string" }, appendText: { type: "string" } }, required: ["label", "appendText"] } } }, required: ["guidance", "followUpQuestion", "assistOptions"] };
const spreadRecommendationGuidedJson = { type: "object", properties: { spreadId: { type: "string" }, reason: { type: "string" }, refinedQuestion: { type: "string" }, detectedThemes: { type: "array", items: { type: "string" } } }, required: ["spreadId", "reason", "refinedQuestion", "detectedThemes"] };
const readingGuidedJson = { type: "object", properties: { title: { type: "string" }, summary: { type: "string" }, cards: { type: "array", items: { type: "object", properties: { position: { type: "string" }, name: { type: "string" }, koreanName: { type: "string" }, reading: { type: "string" } }, required: ["position", "name", "koreanName", "reading"] } }, advice: { type: "string" }, npcLine: { type: "string" } }, required: ["title", "summary", "cards", "advice", "npcLine"] };
const chatGuidedJson = { type: "object", properties: { message: { type: "string" } }, required: ["message"] };

function hasAiBinding(env: Env): env is Env & { AI: Ai } {
  return Boolean(env.AI && typeof env.AI.run === "function");
}

function debugError(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240);
}

function maybeObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function extractResultObject(result: unknown): Record<string, unknown> | null {
  const root = maybeObject(result);
  if (!root) return null;
  const response = maybeObject(root.response);
  if (response) return response;
  const output = maybeObject(root.output);
  if (output) return output;
  return null;
}

function extractAiTextOrJson(result: unknown): string {
  const directObject = extractResultObject(result);
  if (directObject) return JSON.stringify(directObject);
  return extractModelText(result);
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

function appendStrictJsonReminder(prompt: string): string {
  return `${prompt}\n\n중요: 지금 환경에서는 구조화 출력 보조 기능이 실패할 수 있다. 그래도 반드시 JSON 객체 하나만 출력하라. 마크다운 코드블록, 설명 문장, 앞뒤 안내문을 절대 붙이지 마라.`;
}

async function runAiText(env: Env & { AI: Ai }, request: AiJsonRequest): Promise<string> {
  const model = env.AI_MODEL ?? DEFAULT_MODEL;
  const basePayload = {
    messages: [{ role: "user", content: request.prompt }],
    max_tokens: request.max_tokens,
    temperature: request.temperature,
  };

  try {
    const result = await env.AI.run(model, { ...basePayload, guided_json: request.guided_json });
    return extractAiTextOrJson(result);
  } catch (error) {
    console.error("Workers AI guided_json call failed; retrying without guided_json", debugError(error));
  }

  const result = await env.AI.run(model, {
    ...basePayload,
    messages: [{ role: "user", content: appendStrictJsonReminder(request.prompt) }],
  });
  return extractAiTextOrJson(result);
}

function getFallbackQuestionAssist(question: string): QuestionAssistResponse {
  return {
    guidance: "질문을 조금 더 선명하게 만들 수 있어요.",
    followUpQuestion: "카드가 어떤 방향을 더 비춰주면 좋을까요?",
    assistOptions: [
      { label: "앞으로의 흐름", appendText: "앞으로 이 일이 어떤 흐름으로 이어질지도 알고 싶어." },
      { label: "내가 할 일", appendText: "지금 내가 취하면 좋은 태도와 다음 행동도 함께 보고 싶어." },
      { label: "막힌 이유", appendText: "현재 흐름을 막고 있는 요소가 무엇인지도 알고 싶어." },
    ],
  };
}

function normalizeQuestionAssist(parsed: Record<string, unknown>, question: string): QuestionAssistResponse {
  const fallback = getFallbackQuestionAssist(question);
  const guidance = typeof parsed.guidance === "string" ? parsed.guidance.trim().slice(0, 120) : fallback.guidance;
  const followUpQuestion = typeof parsed.followUpQuestion === "string" ? parsed.followUpQuestion.trim().slice(0, 120) : fallback.followUpQuestion;
  const options = (Array.isArray(parsed.assistOptions) ? parsed.assistOptions : [])
    .map((value): QuestionAssistOption | null => {
      const option = maybeObject(value);
      const label = typeof option?.label === "string" ? option.label.trim().slice(0, 18) : "";
      const appendText = typeof option?.appendText === "string" ? option.appendText.trim().slice(0, 120) : "";
      return label && appendText ? { label, appendText } : null;
    })
    .filter((value): value is QuestionAssistOption => value !== null)
    .slice(0, 3);
  return { guidance, followUpQuestion, assistOptions: options.length > 0 ? options : fallback.assistOptions };
}

function parseQuestionAssistResponse(text: string, question: string): QuestionAssistResponse {
  const parsed = extractJsonObject(text);
  return parsed ? normalizeQuestionAssist(parsed, question) : getFallbackQuestionAssist(question);
}

function getFallbackThemes(category: string): string[] {
  if (category === "love" || category === "relationship") return ["관계 흐름", "마음의 방향", "현실 조언"];
  if (category === "work") return ["현재 상황", "막힌 지점", "실행 조언"];
  if (category === "money") return ["현실 판단", "안정성", "선택 기준"];
  return ["현재 흐름", "가능성", "조언"];
}

function parseThemeList(value: unknown, category: string): string[] {
  const themes = Array.isArray(value)
    ? value.filter((theme): theme is string => typeof theme === "string").map((theme) => theme.trim().slice(0, 14)).filter(Boolean).slice(0, 4)
    : [];
  return themes.length > 0 ? themes : getFallbackThemes(category);
}

function getFallbackSpread(category: string, question: string): SpreadRecommendationResponse {
  return {
    spreadId: "situation-obstacle-advice",
    reason: "질문을 안정적으로 읽기 위해 현재 상황과 조언을 함께 보는 배열을 골랐습니다.",
    refinedQuestion: `${question} 이 흐름에서 내가 살펴봐야 할 점과 도움이 되는 태도는 무엇일까?`.slice(0, 180),
    detectedThemes: getFallbackThemes(category),
  };
}

function parseSpreadRecommendationResponse(text: string, category: string, question: string): SpreadRecommendationResponse | null {
  const parsed = extractJsonObject(text);
  if (!parsed) return null;
  const spreadId = typeof parsed.spreadId === "string" ? parsed.spreadId : "";
  if (!allowedSpreadIds.has(spreadId)) return null;
  return {
    spreadId,
    reason: (typeof parsed.reason === "string" ? parsed.reason : "질문에 어울리는 배열을 골랐습니다.").slice(0, 180),
    refinedQuestion: (typeof parsed.refinedQuestion === "string" ? parsed.refinedQuestion : question).slice(0, 180),
    detectedThemes: parseThemeList(parsed.detectedThemes, category),
  };
}

function alignReadingWithDrawnCards(reading: ReadingResponse, fallback: ReadingResponse): ReadingResponse {
  return {
    ...reading,
    cards: fallback.cards.map((fallbackCard, index) => {
      const aiCard = reading.cards[index];
      const aiReading = aiCard?.reading?.trim();
      return {
        position: fallbackCard.position,
        name: fallbackCard.name,
        koreanName: fallbackCard.koreanName,
        reading: aiReading && aiReading.length >= 12 ? aiReading.slice(0, 900) : fallbackCard.reading,
      };
    }),
    advice: reading.advice?.trim() ? reading.advice : fallback.advice,
    npcLine: reading.npcLine?.trim() ? reading.npcLine : fallback.npcLine,
  };
}

async function readJsonBody<T>(request: Request): Promise<T | Response> {
  try {
    return (await request.json()) as T;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: jsonHeaders });
  }
}

async function handleQuestionAssist(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody<QuestionAssistRequestBody>(request);
  if (body instanceof Response) return body;
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  if (question.length < 3) return Response.json({ error: "question is required" }, { status: 400, headers: jsonHeaders });
  if (!hasAiBinding(env)) return Response.json({ ...getFallbackQuestionAssist(question), _debugSource: "fallback", _debugReason: "missing_binding", buildVersion: BUILD_VERSION }, { headers: jsonHeaders });
  try {
    const text = await runAiText(env, { prompt: buildQuestionAssistPrompt({ question }), max_tokens: 420, temperature: 0.55, guided_json: questionAssistGuidedJson });
    return Response.json({ ...parseQuestionAssistResponse(text, question), _debugSource: "ai", _debugReason: "ok", buildVersion: BUILD_VERSION }, { headers: jsonHeaders });
  } catch (error) {
    console.error("Workers AI question assist failed", debugError(error));
    return Response.json({ ...getFallbackQuestionAssist(question), _debugSource: "fallback", _debugReason: "ai_error", _debugError: debugError(error), buildVersion: BUILD_VERSION }, { headers: jsonHeaders });
  }
}

async function handleSpreadRecommendation(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody<SpreadRecommendationRequestBody>(request);
  if (body instanceof Response) return body;
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  const category = typeof body.category === "string" ? body.category : "free";
  if (question.length < 3) return Response.json({ error: "question is required" }, { status: 400, headers: jsonHeaders });
  const fallback = getFallbackSpread(category, question);
  if (!hasAiBinding(env)) return Response.json({ ...fallback, _debugSource: "fallback", _debugReason: "missing_binding", buildVersion: BUILD_VERSION }, { headers: jsonHeaders });
  try {
    const text = await runAiText(env, { prompt: buildSpreadRecommendationPrompt({ category, question }), max_tokens: 420, temperature: 0.32, guided_json: spreadRecommendationGuidedJson });
    const recommendation = parseSpreadRecommendationResponse(text, category, question);
    if (!recommendation) throw new Error("Invalid spread recommendation response");
    return Response.json({ ...recommendation, _debugSource: "ai", _debugReason: "ok", buildVersion: BUILD_VERSION }, { headers: jsonHeaders });
  } catch (error) {
    console.error("Workers AI spread recommendation failed", debugError(error));
    return Response.json({ ...fallback, _debugSource: "fallback", _debugReason: "ai_error", _debugError: debugError(error), buildVersion: BUILD_VERSION }, { headers: jsonHeaders });
  }
}

async function handleReading(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody<ReadingRequestBody>(request);
  if (body instanceof Response) return body;
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  const category = typeof body.category === "string" ? body.category : "free";
  const spreadId = typeof body.spreadId === "string" ? body.spreadId : "past-present-future";
  const spreadName = typeof body.spreadName === "string" ? body.spreadName : "시간의 세 문";
  const cards = Array.isArray(body.cards) ? body.cards.slice(0, 10) : [];
  if (question.length < 3 || cards.length < 1) return Response.json({ error: "question and at least 1 card are required" }, { status: 400, headers: jsonHeaders });
  const safeCards = cards.map((card, index) => ({
    position: card.position || ["과거", "현재", "미래"][index] || `${index + 1}번째 카드`,
    positionId: card.positionId || `position-${index + 1}`,
    positionMeaning: card.positionMeaning || "이 위치는 질문의 한 장면을 비춘다.",
    name: card.name || "Unknown Card",
    koreanName: card.koreanName || "알 수 없는 카드",
    keywords: Array.isArray(card.keywords) ? card.keywords.slice(0, 6) : [],
    description: card.description || "",
  }));
  const contextualFallback = buildContextualFallbackReading({ question, spreadName, cards: safeCards });
  if (!hasAiBinding(env)) return Response.json({ ...contextualFallback, _debugSource: "fallback", _debugReason: "missing_binding", buildVersion: BUILD_VERSION }, { headers: jsonHeaders });
  try {
    const text = await runAiText(env, { prompt: buildReadingPrompt({ category, question, spreadId, spreadName, cards: safeCards }), max_tokens: 2200, temperature: 0.75, guided_json: readingGuidedJson });
    const parsedReading = parseReadingResponse(text, contextualFallback);
    return Response.json({ ...alignReadingWithDrawnCards(parsedReading, contextualFallback), _debugSource: "ai", _debugReason: "ok", buildVersion: BUILD_VERSION }, { headers: jsonHeaders });
  } catch (error) {
    console.error("Workers AI reading failed", debugError(error));
    return Response.json({ ...contextualFallback, _debugSource: "fallback", _debugReason: "ai_error", _debugError: debugError(error), buildVersion: BUILD_VERSION }, { headers: jsonHeaders });
  }
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody<ChatRequestBody>(request);
  if (body instanceof Response) return body;
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  const readingSummary = typeof body.readingSummary === "string" ? body.readingSummary.trim().slice(0, 900) : "";
  const cards = Array.isArray(body.cards) ? body.cards.slice(0, 10) : [];
  const messages = Array.isArray(body.messages)
    ? body.messages.filter((message) => (message.role === "user" || message.role === "assistant") && typeof message.content === "string").slice(-8).map((message) => ({ role: message.role as "user" | "assistant", content: String(message.content).trim().slice(0, 500) }))
    : [];
  if (question.length < 3 || readingSummary.length < 3 || messages.length < 1) return Response.json({ error: "question, readingSummary, and messages are required" }, { status: 400, headers: jsonHeaders });
  const safeCards = cards.map((card, index) => ({
    position: card.position || ["과거", "현재", "미래"][index] || `${index + 1}번째 카드`,
    positionId: card.positionId || `position-${index + 1}`,
    positionMeaning: card.positionMeaning || "이 위치는 질문의 한 장면을 비춘다.",
    name: card.name || "Unknown Card",
    koreanName: card.koreanName || "알 수 없는 카드",
    keywords: Array.isArray(card.keywords) ? card.keywords.slice(0, 6) : [],
  }));
  if (!hasAiBinding(env)) return Response.json({ ...fallbackChat, _debugSource: "fallback", _debugReason: "missing_binding", buildVersion: BUILD_VERSION }, { headers: jsonHeaders });
  try {
    const text = await runAiText(env, { prompt: buildChatPrompt({ question, readingSummary, cards: safeCards, messages }), max_tokens: 900, temperature: 0.75, guided_json: chatGuidedJson });
    return Response.json({ ...parseChatResponse(text), _debugSource: "ai", _debugReason: "ok", buildVersion: BUILD_VERSION }, { headers: jsonHeaders });
  } catch (error) {
    console.error("Workers AI chat failed", debugError(error));
    return Response.json({ ...fallbackChat, _debugSource: "fallback", _debugReason: "ai_error", _debugError: debugError(error), buildVersion: BUILD_VERSION }, { headers: jsonHeaders });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, service: "tarrot-service", phase: "direct-worker-ai", buildVersion: BUILD_VERSION, aiModel: env.AI_MODEL ?? DEFAULT_MODEL, aiBinding: hasAiBinding(env) }, { headers: jsonHeaders });
    }
    if (url.pathname === "/api/question-assist" && request.method === "POST") return handleQuestionAssist(request, env);
    if (url.pathname === "/api/spread-recommendation" && request.method === "POST") return handleSpreadRecommendation(request, env);
    if (url.pathname === "/api/reading" && request.method === "POST") return handleReading(request, env);
    if (url.pathname === "/api/chat" && request.method === "POST") return handleChat(request, env);
    if (url.pathname.startsWith("/api/")) return Response.json({ error: "Not Found" }, { status: 404, headers: jsonHeaders });
    return env.ASSETS.fetch(request);
  },
};
