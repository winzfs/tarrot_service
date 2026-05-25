import { handleChat, handleQuestionAssist, handleReading, handleSpreadRecommendation } from "./aiHandlers";
import { DEFAULT_MODEL, hasAiBinding, jsonHeaders, type Env } from "./runtime";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") return Response.json({ ok: true, service: "tarrot-service", aiModel: env.AI_MODEL ?? DEFAULT_MODEL, aiBinding: hasAiBinding(env) }, { headers: jsonHeaders });
    if (url.pathname === "/api/question-assist" && request.method === "POST") return handleQuestionAssist(request, env);
    if (url.pathname === "/api/spread-recommendation" && request.method === "POST") return handleSpreadRecommendation(request, env);
    if (url.pathname === "/api/reading" && request.method === "POST") return handleReading(request, env);
    if (url.pathname === "/api/chat" && request.method === "POST") return handleChat(request, env);
    if (url.pathname.startsWith("/api/")) return Response.json({ error: "Not Found" }, { status: 404, headers: jsonHeaders });
    return env.ASSETS.fetch(request);
  },
};
