import { extractModelText } from "./response";

export interface Env {
  AI?: Ai;
  ASSETS: Fetcher;
  AI_MODEL?: string;
}

export type AiJsonRequest = {
  prompt: string;
  max_tokens: number;
  temperature: number;
  guided_json?: Record<string, unknown>;
};

export const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

export const DEFAULT_MODEL = "@cf/google/gemma-3-12b-it";

export function hasAiBinding(env: Env): env is Env & { AI: Ai } {
  return Boolean(env.AI && typeof env.AI.run === "function");
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function aiResultToText(result: unknown): string {
  const root = asObject(result);
  const response = asObject(root?.response);
  const output = asObject(root?.output);
  const structured = response ?? output;
  return structured ? JSON.stringify(structured) : extractModelText(result);
}

export function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function readJson<T>(request: Request): Promise<T | Response> {
  try {
    return (await request.json()) as T;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: jsonHeaders });
  }
}

export async function runAiText(env: Env & { AI: Ai }, request: AiJsonRequest): Promise<string> {
  const model = env.AI_MODEL ?? DEFAULT_MODEL;
  const payload = {
    messages: [{ role: "user", content: request.prompt }],
    max_tokens: request.max_tokens,
    temperature: request.temperature,
  };

  if (request.guided_json) {
    try {
      return aiResultToText(await env.AI.run(model, { ...payload, guided_json: request.guided_json }));
    } catch (error) {
      console.error("Workers AI guided_json failed; retrying plain JSON", error instanceof Error ? error.message : String(error));
    }
  }

  return aiResultToText(
    await env.AI.run(model, {
      ...payload,
      messages: [{ role: "user", content: `${request.prompt}\n\nReturn exactly one JSON object.` }],
    }),
  );
}
