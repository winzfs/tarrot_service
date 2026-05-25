import { DEFAULT_MODEL, hasAiBinding, jsonHeaders, runAiText, type Env } from "./runtime";

export async function handleAiDiagnostics(env: Env): Promise<Response> {
  const base = {
    ok: true,
    aiBinding: hasAiBinding(env),
    aiModel: env.AI_MODEL ?? DEFAULT_MODEL,
  };

  if (!hasAiBinding(env)) {
    return Response.json({ ...base, aiCall: "skipped", reason: "missing_binding" }, { headers: jsonHeaders });
  }

  try {
    const text = await runAiText(env, {
      prompt: "Return exactly this JSON object: {\"ok\":true,\"source\":\"ai\"}",
      max_tokens: 80,
      temperature: 0,
      guided_json: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          source: { type: "string" },
        },
        required: ["ok", "source"],
      },
    });

    return Response.json({ ...base, aiCall: "ok", text: text.slice(0, 500) }, { headers: jsonHeaders });
  } catch (error) {
    return Response.json(
      {
        ...base,
        aiCall: "failed",
        reason: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: jsonHeaders },
    );
  }
}
