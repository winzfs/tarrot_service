type DiagnosticEnv = {
  AI?: Ai;
  AI_MODEL?: string;
};

type AttemptResult = {
  model: string;
  payload: string;
  ok: boolean;
  elapsedMs: number;
  textPreview?: string;
  error?: string;
};

const DIAGNOSTIC_MODELS = [
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3-8b-instruct",
  "@cf/google/gemma-3-12b-it",
  "@cf/google/gemma-7b-it",
  "@cf/mistral/mistral-7b-instruct-v0.1",
];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
}

function extractText(result: unknown): string {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") return JSON.stringify(result);
  const record = result as Record<string, unknown>;
  if (typeof record.response === "string") return record.response;
  if (typeof record.text === "string") return record.text;
  if (typeof record.result === "string") return record.result;
  const response = record.response;
  if (response && typeof response === "object") return JSON.stringify(response);
  const output = record.output;
  if (output && typeof output === "object") return JSON.stringify(output);
  return JSON.stringify(result);
}

async function tryAiRun(env: DiagnosticEnv & { AI: Ai }, model: string, payloadName: string, payload: Record<string, unknown>): Promise<AttemptResult> {
  const startedAt = Date.now();
  try {
    const result = await env.AI.run(model, payload);
    const elapsedMs = Date.now() - startedAt;
    return {
      model,
      payload: payloadName,
      ok: true,
      elapsedMs,
      textPreview: extractText(result).slice(0, 500),
    };
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    return {
      model,
      payload: payloadName,
      ok: false,
      elapsedMs,
      error: getErrorMessage(error),
    };
  }
}

export async function handleAiDiagnostics(env: DiagnosticEnv, defaultModel: string): Promise<Response> {
  const hasBinding = Boolean(env.AI && typeof env.AI.run === "function");
  const configuredModel = env.AI_MODEL ?? defaultModel;
  const models = Array.from(new Set([configuredModel, ...DIAGNOSTIC_MODELS]));

  if (!hasBinding) {
    return Response.json({
      ok: false,
      aiBinding: false,
      configuredModel,
      reason: "missing_binding",
    });
  }

  const aiEnv = env as DiagnosticEnv & { AI: Ai };
  const attempts: AttemptResult[] = [];

  for (const model of models) {
    attempts.push(await tryAiRun(aiEnv, model, "messages", {
      messages: [{ role: "user", content: "Reply with the exact text OK." }],
      max_tokens: 16,
      temperature: 0,
    }));
    if (attempts[attempts.length - 1]?.ok) break;

    attempts.push(await tryAiRun(aiEnv, model, "prompt", {
      prompt: "Reply with the exact text OK.",
      max_tokens: 16,
      temperature: 0,
    }));
    if (attempts[attempts.length - 1]?.ok) break;
  }

  const firstSuccess = attempts.find((attempt) => attempt.ok);
  return Response.json({
    ok: Boolean(firstSuccess),
    aiBinding: true,
    configuredModel,
    workingModel: firstSuccess?.model ?? null,
    workingPayload: firstSuccess?.payload ?? null,
    attempts,
  });
}
