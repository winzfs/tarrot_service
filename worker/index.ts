import { buildChatPrompt } from "./prompts/chat";
import { buildQuestionAssistPrompt } from "./prompts/questionAssist";
import { buildReadingPrompt } from "./prompts/reading";
import { buildSpreadRecommendationPrompt } from "./prompts/spread";
import { extractModelText, fallbackChat, fallbackReading, parseChatResponse, parseReadingResponse } from "./response";

export interface Env {
  AI: Ai;
  ASSETS: Fetcher;
  AI_MODEL?: string;
}

type SpreadRecommendationRequestBody = {
  category?: string;
  question?: string;
};

type QuestionAssistRequestBody = {
  question?: string;
};

type QuestionAssistOption = {
  label: string;
  appendText: string;
};

type QuestionAssistResponse = {
  guidance: string;
  followUpQuestion: string;
  assistOptions: QuestionAssistOption[];
};

type ReadingRequestBody = {
  category?: string;
  question?: string;
  spreadId?: string;
  spreadName?: string;
  cards?: {
    position?: string;
    positionId?: string;
    positionMeaning?: string;
    name?: string;
    koreanName?: string;
    keywords?: string[];
    description?: string;
  }[];
};

type ChatRequestBody = {
  question?: string;
  readingSummary?: string;
  cards?: {
    position?: string;
    positionId?: string;
    positionMeaning?: string;
    name?: string;
    koreanName?: string;
    keywords?: string[];
  }[];
  messages?: {
    role?: string;
    content?: string;
  }[];
};

type SpreadRecommendationResponse = {
  spreadId: string;
  reason: string;
  refinedQuestion: string;
  detectedThemes: string[];
};

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

const DEFAULT_MODEL = "@cf/google/gemma-3-12b-it";

const allowedSpreadIds = new Set([
  "daily-one-card",
  "situation-obstacle-advice",
  "past-present-future",
  "relationship-mirror-five",
  "choice-crossroad-five",
]);

const questionAssistGuidedJson = {
  type: "object",
  properties: {
    guidance: { type: "string" },
    followUpQuestion: { type: "string" },
    assistOptions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          appendText: { type: "string" },
        },
        required: ["label", "appendText"],
      },
    },
  },
  required: ["guidance", "followUpQuestion", "assistOptions"],
};

const spreadRecommendationGuidedJson = {
  type: "object",
  properties: {
    spreadId: { type: "string" },
    reason: { type: "string" },
    refinedQuestion: { type: "string" },
    detectedThemes: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["spreadId", "reason", "refinedQuestion", "detectedThemes"],
};

const readingGuidedJson = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    cards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          position: { type: "string" },
          name: { type: "string" },
          koreanName: { type: "string" },
          reading: { type: "string" },
        },
        required: ["position", "name", "koreanName", "reading"],
      },
    },
    advice: { type: "string" },
    npcLine: { type: "string" },
  },
  required: ["title", "summary", "cards", "advice", "npcLine"],
};

const chatGuidedJson = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
  required: ["message"],
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json(
        {
          ok: true,
          service: "tarrot-service",
          phase: "workers-ai-reading-and-chat",
          aiModel: env.AI_MODEL ?? DEFAULT_MODEL,
        },
        { headers: jsonHeaders },
      );
    }

    if (url.pathname === "/api/question-assist" && request.method === "POST") {
      return handleQuestionAssist(request, env);
    }

    if (url.pathname === "/api/spread-recommendation" && request.method === "POST") {
      return handleSpreadRecommendation(request, env);
    }

    if (url.pathname === "/api/reading" && request.method === "POST") {
      return handleReading(request, env);
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      return handleChat(request, env);
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "Not Found" }, { status: 404, headers: jsonHeaders });
    }

    return env.ASSETS.fetch(request);
  },
};

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

function parseQuestionAssistResponse(text: string, question: string): QuestionAssistResponse {
  const parsed = extractJsonObject(text);
  if (!parsed) return getFallbackQuestionAssist(question);

  const guidance = typeof parsed.guidance === "string" ? parsed.guidance.trim().slice(0, 120) : "질문을 조금 더 선명하게 만들 수 있어요.";
  const followUpQuestion = typeof parsed.followUpQuestion === "string" ? parsed.followUpQuestion.trim().slice(0, 120) : "카드가 어떤 방향을 더 비춰주면 좋을까요?";
  const rawOptions = Array.isArray(parsed.assistOptions) ? parsed.assistOptions : [];
  const assistOptions = rawOptions
    .map((option): QuestionAssistOption | null => {
      if (!option || typeof option !== "object") return null;
      const item = option as Record<string, unknown>;
      const label = typeof item.label === "string" ? item.label.trim().slice(0, 18) : "";
      const appendText = typeof item.appendText === "string" ? item.appendText.trim().slice(0, 120) : "";
      if (!label || !appendText) return null;
      return { label, appendText };
    })
    .filter((option): option is QuestionAssistOption => option !== null)
    .slice(0, 3);

  return {
    guidance,
    followUpQuestion,
    assistOptions: assistOptions.length > 0 ? assistOptions : getFallbackQuestionAssist(question).assistOptions,
  };
}

function getFallbackThemes(category: string): string[] {
  if (category === "love" || category === "relationship") return ["관계 흐름", "마음의 방향", "현실 조언"];
  if (category === "work") return ["현재 상황", "막힌 지점", "실행 조언"];
  if (category === "money") return ["현실 판단", "안정성", "선택 기준"];
  return ["현재 흐름", "가능성", "조언"];
}

function parseThemeList(value: unknown, category: string): string[] {
  if (!Array.isArray(value)) return getFallbackThemes(category);

  const themes = value
    .filter((theme): theme is string => typeof theme === "string")
    .map((theme) => theme.trim().slice(0, 14))
    .filter(Boolean)
    .slice(0, 4);

  return themes.length > 0 ? themes : getFallbackThemes(category);
}

function parseSpreadRecommendationResponse(text: string, category: string, question: string): SpreadRecommendationResponse | null {
  const parsed = extractJsonObject(text);
  if (!parsed) return null;

  const spreadId = typeof parsed.spreadId === "string" ? parsed.spreadId : "";
  const reason = typeof parsed.reason === "string" ? parsed.reason : "질문에 어울리는 배열을 골랐습니다.";
  const refinedQuestion = typeof parsed.refinedQuestion === "string" ? parsed.refinedQuestion : question;
  const detectedThemes = parseThemeList(parsed.detectedThemes, category);

  if (!allowedSpreadIds.has(spreadId)) return null;
  return {
    spreadId,
    reason: reason.slice(0, 180),
    refinedQuestion: refinedQuestion.slice(0, 180),
    detectedThemes,
  };
}

async function handleQuestionAssist(request: Request, env: Env): Promise<Response> {
  let body: QuestionAssistRequestBody;

  try {
    body = (await request.json()) as QuestionAssistRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: jsonHeaders });
  }

  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";

  if (question.length < 3) {
    return Response.json({ error: "question is required" }, { status: 400, headers: jsonHeaders });
  }

  const prompt = buildQuestionAssistPrompt({ question });

  try {
    const result = await env.AI.run(env.AI_MODEL ?? DEFAULT_MODEL, {
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 420,
      temperature: 0.55,
      guided_json: questionAssistGuidedJson,
    });

    const assist = parseQuestionAssistResponse(extractModelText(result), question);
    return Response.json(assist, { headers: jsonHeaders });
  } catch (error) {
    console.error("Workers AI question assist failed", error);
    return Response.json(getFallbackQuestionAssist(question), { headers: jsonHeaders });
  }
}

async function handleSpreadRecommendation(request: Request, env: Env): Promise<Response> {
  let body: SpreadRecommendationRequestBody;

  try {
    body = (await request.json()) as SpreadRecommendationRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: jsonHeaders });
  }

  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  const category = typeof body.category === "string" ? body.category : "free";

  if (question.length < 3) {
    return Response.json({ error: "question is required" }, { status: 400, headers: jsonHeaders });
  }

  const prompt = buildSpreadRecommendationPrompt({ category, question });

  try {
    const result = await env.AI.run(env.AI_MODEL ?? DEFAULT_MODEL, {
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 420,
      temperature: 0.32,
      guided_json: spreadRecommendationGuidedJson,
    });

    const recommendation = parseSpreadRecommendationResponse(extractModelText(result), category, question);
    if (!recommendation) throw new Error("Invalid spread recommendation response");

    return Response.json(recommendation, { headers: jsonHeaders });
  } catch (error) {
    console.error("Workers AI spread recommendation failed", error);
    return Response.json(
      {
        spreadId: "situation-obstacle-advice",
        reason: "질문을 안정적으로 읽기 위해 현재 상황과 조언을 함께 보는 배열을 골랐습니다.",
        refinedQuestion: `${question} 이 흐름에서 내가 살펴봐야 할 점과 도움이 되는 태도는 무엇일까?`.slice(0, 180),
        detectedThemes: getFallbackThemes(category),
      },
      { headers: jsonHeaders },
    );
  }
}

async function handleReading(request: Request, env: Env): Promise<Response> {
  let body: ReadingRequestBody;

  try {
    body = (await request.json()) as ReadingRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: jsonHeaders });
  }

  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  const category = typeof body.category === "string" ? body.category : "free";
  const spreadId = typeof body.spreadId === "string" ? body.spreadId : "past-present-future";
  const spreadName = typeof body.spreadName === "string" ? body.spreadName : "시간의 세 문";
  const cards = Array.isArray(body.cards) ? body.cards.slice(0, 10) : [];

  if (question.length < 3 || cards.length < 1) {
    return Response.json(
      { error: "question and at least 1 card are required" },
      { status: 400, headers: jsonHeaders },
    );
  }

  const safeCards = cards.map((card, index) => ({
    position: card.position || ["과거", "현재", "미래"][index] || `${index + 1}번째 카드`,
    positionId: card.positionId || `position-${index + 1}`,
    positionMeaning: card.positionMeaning || "이 위치는 질문의 한 장면을 비춘다.",
    name: card.name || "Unknown Card",
    koreanName: card.koreanName || "알 수 없는 카드",
    keywords: Array.isArray(card.keywords) ? card.keywords.slice(0, 6) : [],
    description: card.description || "",
  }));

  const prompt = buildReadingPrompt({ category, question, spreadId, spreadName, cards: safeCards });

  try {
    const result = await env.AI.run(env.AI_MODEL ?? DEFAULT_MODEL, {
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 2200,
      temperature: 0.75,
      guided_json: readingGuidedJson,
    });

    const text = extractModelText(result);
    const reading = parseReadingResponse(text);

    return Response.json(reading, { headers: jsonHeaders });
  } catch (error) {
    console.error("Workers AI reading failed", error);
    return Response.json(fallbackReading, { headers: jsonHeaders });
  }
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  let body: ChatRequestBody;

  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: jsonHeaders });
  }

  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  const readingSummary = typeof body.readingSummary === "string" ? body.readingSummary.trim().slice(0, 900) : "";
  const cards = Array.isArray(body.cards) ? body.cards.slice(0, 10) : [];
  const messages = Array.isArray(body.messages)
    ? body.messages
        .filter((message) =>
          (message.role === "user" || message.role === "assistant") && typeof message.content === "string",
        )
        .slice(-8)
        .map((message) => ({
          role: message.role as "user" | "assistant",
          content: String(message.content).trim().slice(0, 500),
        }))
    : [];

  if (question.length < 3 || readingSummary.length < 3 || messages.length < 1) {
    return Response.json(
      { error: "question, readingSummary, and messages are required" },
      { status: 400, headers: jsonHeaders },
    );
  }

  const safeCards = cards.map((card, index) => ({
    position: card.position || ["과거", "현재", "미래"][index] || `${index + 1}번째 카드`,
    positionId: card.positionId || `position-${index + 1}`,
    positionMeaning: card.positionMeaning || "이 위치는 질문의 한 장면을 비춘다.",
    name: card.name || "Unknown Card",
    koreanName: card.koreanName || "알 수 없는 카드",
    keywords: Array.isArray(card.keywords) ? card.keywords.slice(0, 6) : [],
  }));

  const prompt = buildChatPrompt({ question, readingSummary, cards: safeCards, messages });

  try {
    const result = await env.AI.run(env.AI_MODEL ?? DEFAULT_MODEL, {
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 900,
      temperature: 0.75,
      guided_json: chatGuidedJson,
    });

    const text = extractModelText(result);
    const chat = parseChatResponse(text);

    return Response.json(chat, { headers: jsonHeaders });
  } catch (error) {
    console.error("Workers AI chat failed", error);
    return Response.json(fallbackChat, { headers: jsonHeaders });
  }
}
