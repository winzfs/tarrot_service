# 05. 배포 가이드

이 문서는 `tarrot_service`를 Cloudflare Workers에 배포하는 방법을 정리한다.

현재 앱은 다음 구조로 배포된다.

```txt
Vite build output: dist/
Cloudflare Worker: worker/index.ts
Static Assets binding: ASSETS
Workers AI binding: AI
```

## 1. 현재 배포 방식

배포 대상은 Cloudflare Workers다.

Worker는 두 가지 역할을 한다.

1. `/api/reading`, `/api/chat`, `/api/health` API 처리
2. 그 외 요청은 `dist/` 정적 앱 제공

## 2. 필요한 Cloudflare 설정

GitHub Actions 배포를 사용하려면 저장소 Secrets에 다음 값을 등록해야 한다.

```txt
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

GitHub 저장소에서 설정 위치:

```txt
Settings
  → Secrets and variables
  → Actions
  → New repository secret
```

## 3. Cloudflare API Token 권한

API Token은 Workers 배포가 가능해야 한다.

권장 권한:

```txt
Account - Workers Scripts - Edit
Account - Workers AI - Edit 또는 Read/Run 권한
Account - Account Settings - Read
```

Cloudflare 계정/권한 구성에 따라 필요한 권한 이름은 다를 수 있다.

## 4. GitHub Actions 배포

현재 저장소에는 다음 워크플로우가 있다.

```txt
.github/workflows/deploy.yml
```

동작 조건:

- `main` 브랜치에 push될 때 자동 실행
- GitHub Actions 화면에서 수동 실행 가능

실행 단계:

```txt
1. Checkout
2. Node.js 22 설정
3. npm install
4. npm run build
5. wrangler deploy
```

## 5. 로컬 배포

Cloudflare에 로그인되어 있다면 로컬에서도 배포할 수 있다.

```bash
npm install
npm run build
npx wrangler login
npm run deploy
```

## 6. Workers AI 설정

`wrangler.jsonc`에는 다음 설정이 필요하다.

```jsonc
{
  "ai": {
    "binding": "AI"
  },
  "vars": {
    "AI_MODEL": "@cf/google/gemma-3-12b-it"
  }
}
```

모델을 바꾸고 싶다면 `AI_MODEL`만 변경한다.

## 7. 배포 후 확인

배포 후 다음 경로를 확인한다.

```txt
/
/api/health
```

`/api/health`는 다음과 비슷한 JSON을 반환해야 한다.

```json
{
  "ok": true,
  "service": "tarrot-service",
  "phase": "workers-ai-mvp",
  "aiModel": "@cf/google/gemma-3-12b-it"
}
```

## 8. 현재 MVP 동작 범위

현재 배포 가능한 MVP 범위:

```txt
인트로 화면
질문 입력
카테고리 선택
메이저 아르카나 3장 랜덤 추첨
/api/reading Workers AI 호출
AI 리딩 결과 표시
다시 점치기
```

아직 미구현:

```txt
후속 대화 AI 연결
고급 카드 뒤집기 애니메이션
카드별 풀 일러스트
리딩 기록 저장
공유 기능
```

## 9. 문제 해결

### 배포가 실패하는 경우

- `CLOUDFLARE_API_TOKEN` 값 확인
- `CLOUDFLARE_ACCOUNT_ID` 값 확인
- API Token에 Workers 배포 권한이 있는지 확인
- Cloudflare Workers AI 사용 가능 계정인지 확인

### AI 응답이 fallback으로 나오는 경우

- 모델명이 현재 Cloudflare Workers AI에서 사용 가능한지 확인
- `AI_MODEL` 값을 다른 Gemma 계열 모델로 변경
- `/api/health`에서 모델명 확인

### 정적 화면은 뜨는데 API가 안 되는 경우

- Worker route가 올바른지 확인
- `wrangler.jsonc`의 `assets.binding`이 `ASSETS`인지 확인
- `worker/index.ts`에서 `/api/*` 라우팅이 먼저 처리되는지 확인
