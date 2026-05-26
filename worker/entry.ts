import worker from "./index";
import { handleAiDiagnostics } from "./aiDiagnostics";

const DEFAULT_MODEL = "@cf/google/gemma-4-26b-a4b-it";

export default {
  async fetch(request: Request, env: unknown): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/ai-diagnostics") {
      return handleAiDiagnostics(env as { AI?: Ai; AI_MODEL?: string }, DEFAULT_MODEL);
    }
    return worker.fetch(request, env as never);
  },
};
