export interface Env {
  AI: Ai;
  AI_MODEL?: string;
}

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json(
        {
          ok: true,
          service: "tarrot-service",
          phase: "pre-ai-skeleton",
          aiModel: env.AI_MODEL ?? "not-configured",
        },
        { headers: jsonHeaders },
      );
    }

    if (url.pathname === "/api/reading" && request.method === "POST") {
      return Response.json(
        {
          title: "아직 닫힌 운명의 문",
          summary: "현재는 Worker API 자리만 준비된 단계입니다. 실제 Workers AI 리딩은 다음 Phase에서 연결합니다.",
          cards: [],
          advice: "먼저 Phaser 게임 흐름과 카드 선택 경험을 완성한 뒤 AI 리딩을 연결하세요.",
          npcLine: "별빛은 준비되었습니다. 이제 카드를 놓을 제단을 만들 차례입니다.",
        },
        { headers: jsonHeaders },
      );
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      return Response.json(
        {
          message: "아직 점술사의 목소리는 완전히 깨어나지 않았습니다. 후속 대화 API는 Workers AI 연결 단계에서 구현됩니다.",
        },
        { headers: jsonHeaders },
      );
    }

    return new Response("Not Found", { status: 404 });
  },
};
