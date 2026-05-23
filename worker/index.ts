import { buildChatPrompt } from "./prompts/chat";
import { buildReadingPrompt } from "./prompts/reading";
import { extractModelText, fallbackChat, fallbackReading, parseChatResponse, parseReadingResponse } from "./response";

export interface Env {
  AI: Ai;
  ASSETS: Fetcher;
  AI_MODEL?: string;
}

type ReadingRequestBody = {
  category?: string;
  question?: string;
  spreadId?: string;
  cards?: {
    position?: string;
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
    name?: string;
    koreanName?: string;
    keywords?: string[];
  }[];
  messages?: {
    role?: string;
    content?: string;
  }[];
};

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

const DEFAULT_MODEL = "@cf/google/gemma-3-12b-it";

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

async function handleReading(request: Request, env: Env): Promise<Response> {
  let body: ReadingRequestBody;

  try {
    body = (await request.json()) as ReadingRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: jsonHeaders });
  }

  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  const category = typeof body.category === "string" ? body.category : "free";
  const cards = Array.isArray(body.cards) ? body.cards.slice(0, 3) : [];

  if (question.length < 3 || cards.length !== 3) {
    return Response.json(
      { error: "question and exactly 3 cards are required" },
      { status: 400, headers: jsonHeaders },
    );
  }

  const safeCards = cards.map((card, index) => ({
    position: card.position || ["과거", "현재", "미래"][index] || "카드",
    name: card.name || "Unknown Card",
    koreanName: card.koreanName || "알 수 없는 카드",
    keywords: Array.isArray(card.keywords) ? card.keywords.slice(0, 6) : [],
    description: card.description || "",
  }));

  const prompt = buildReadingPrompt({ category, question, cards: safeCards });

  try {
    const result = await env.AI.run(env.AI_MODEL ?? DEFAULT_MODEL, {
      messages: [{ role: "user", content: prompt }],
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
  const cards = Array.isArray(body.cards) ? body.cards.slice(0, 3) : [];
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
    position: card.position || ["과거", "현재", "미래"][index] || "카드",
    name: card.name || "Unknown Card",
    koreanName: card.koreanName || "알 수 없는 카드",
    keywords: Array.isArray(card.keywords) ? card.keywords.slice(0, 6) : [],
  }));

  const prompt = buildChatPrompt({ question, readingSummary, cards: safeCards, messages });

  try {
    const result = await env.AI.run(env.AI_MODEL ?? DEFAULT_MODEL, {
      messages: [{ role: "user", content: prompt }],
    });

    const text = extractModelText(result);
    const chat = parseChatResponse(text);

    return Response.json(chat, { headers: jsonHeaders });
  } catch (error) {
    console.error("Workers AI chat failed", error);
    return Response.json(fallbackChat, { headers: jsonHeaders });
  }
}
