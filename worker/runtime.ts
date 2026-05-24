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
const BACKUP_MODEL = "@cf/openai/gpt-oss-20b";

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

function modelCandidates(env: Env): string[] {
  const configured = env.AI_MODEL ?? DEFAULT_MODEL;
  return configured === BACKUP_MODEL ? [configured] : [configured, BACKUP_MODEL];
}

async function tryRun(env: Env & { AI: Ai }, model: string, payload: Record<string, unknown>): Promise<string> {
  const result = await env.AI.run(model, payload);
  return aiResultToText(result);
}

function isUsableAiText(text: string, request: AiJsonRequest): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (!request.guided_json) return true;
  return extractJsonObject(trimmed) !== null;
}

export async function runAiText(env: Env & { AI: Ai }, request: AiJsonRequest): Promise<string> {
  const strictPrompt = `${request.prompt}\n\nReturn exactly one valid JSON object. Do not use markdown. Do not add explanations.`;
  const responseFormat = { type: "json_object" };
  const messagePayload = { messages: [{ role: "user", content: request.prompt }], max_tokens: request.max_tokens, temperature: request.temperature };
  const strictMessagePayload = { messages: [{ role: "user", content: strictPrompt }], max_tokens: request.max_tokens, temperature: request.temperature };
  const promptPayload = { prompt: request.prompt, max_tokens: request.max_tokens, temperature: request.temperature };
  const strictPromptPayload = { prompt: strictPrompt, max_tokens: request.max_tokens, temperature: request.temperature };
  const inputPayload = { input: strictPrompt, max_tokens: request.max_tokens, temperature: request.temperature };

  const attempts: Record<string, unknown>[] = [];
  if (request.guided_json) {
    attempts.push({ ...messagePayload, guided_json: request.guided_json });
    attempts.push({ ...promptPayload, guided_json: request.guided_json });
    attempts.push({ ...strictMessagePayload, response_format: responseFormat });
    attempts.push({ ...strictPromptPayload, response_format: responseFormat });
    attempts.push({ ...inputPayload, response_format: responseFormat });
  }
  attempts.push(strictMessagePayload);
  attempts.push(strictPromptPayload);
  attempts.push(inputPayload);

  let lastError: unknown;
  for (const model of modelCandidates(env)) {
    for (const payload of attempts) {
      try {
        const text = await tryRun(env, model, payload);
        if (isUsableAiText(text, request)) return text;
        lastError = new Error(`Workers AI returned unusable text from ${model}: ${text.slice(0, 120)}`);
      } catch (error) {
        lastError = error;
        console.error("Workers AI call attempt failed", model, error instanceof Error ? error.message : String(error));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? "Workers AI failed"));
}
