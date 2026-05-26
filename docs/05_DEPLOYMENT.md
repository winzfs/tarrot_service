# 05. 배포 가이드

이 문서는 `tarrot_service`를 Cloudflare Workers에 배포하는 방법과 현재 GitHub Actions 자동배포 흐름을 정리한다.

현재 앱은 다음 구조로 배포된다.

```txt
Vite build output: dist/
Cloudflare Worker entry: worker/entry.ts
API Worker: worker/index.ts
Static Assets binding: ASSETS
Workers AI binding: AI
```

## 1. 현재 배포 방식

배포 대상은 Cloudflare Workers다.

Worker는 두 가지 역할을 한다.

1. `/api/question-assist`, `/api/spread-recommendation`, `/api/reading`, `/api/chat`, `/api/health`, `/api/ai-diagnostics` API 처리
2. 그 외 요청은 `dist/` 정적 앱 제공

현재 배포 엔트리는 `worker/entry.ts`다.

```txt
worker/entry.ts
  ├─ /api/ai-diagnostics 직접 처리
  └─ 나머지 요청은 worker/index.ts로 위임
```

## 2. 필요한 Cloudflare 설정

GitHub Actions 배포를 사용하려면 저장소 Secrets에 다음 값을 등록해야 한다.

```txt
CLOUDFLARE_API_TOKEN 또는 CF_API_TOKEN
CLOUDFLARE_ACCOUNT_ID 또는 CF_ACCOUNT_ID
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

## 4. GitHub Actions 자동배포

현재 저장소에는 다음 워크플로우가 있다.

```txt
.github/workflows/deploy.yml
```

트리거:

```yaml
on:
  push:
    branches:
      - main
  workflow_dispatch:
```

정상적인 자동배포 흐름:

```txt
main 브랜치에 push
  ↓
GitHub Actions: Deploy to Cloudflare Workers 실행
  ↓
npm install --no-audit --no-fund
  ↓
npm run build
  ↓
npx wrangler deploy worker/entry.ts
  ↓
Cloudflare Workers 배포
```

현재 workflow 주요 단계:

```txt
1. Checkout
2. Node.js 24 설정
3. Cloudflare secrets 확인
4. npm install --no-audit --no-fund
5. npm run build
6. dist 출력 확인
7. npx wrangler --version
8. npx wrangler deploy worker/entry.ts
```

## 5. ChatGPT/GitHub connector 커밋 주의사항

ChatGPT의 GitHub connector 또는 GitHub App/API로 생성된 커밋은 `main`에 반영되더라도 GitHub Actions의 `push` 트리거가 자동 실행되지 않을 수 있다.

이 경우는 배포 실패가 아니라 **workflow run 자체가 생성되지 않은 상태**다.

증상:

```txt
- main에 커밋은 존재한다.
- GitHub Actions 탭에 새 run이 없다.
- 해당 커밋에 workflow run이 붙어 있지 않다.
- Cloudflare 배포도 갱신되지 않는다.
```

원인 후보:

```txt
- GitHub App/API 토큰으로 생성된 커밋이 Actions 재귀 실행 방지 정책에 걸림
- connector 기반 파일 업데이트가 일반 사용자의 git push와 다르게 처리됨
- workflow 자체 실패가 아니라 push 이벤트가 Actions로 전달되지 않음
```

해결 방법:

### 방법 A. GitHub Actions에서 수동 실행

```txt
GitHub 저장소
  → Actions
  → Deploy to Cloudflare Workers
  → Run workflow
  → branch: main
```

### 방법 B. 로컬에서 빈 커밋으로 트리거

```bash
git checkout main
git pull origin main
git commit --allow-empty -m "Trigger deploy"
git push origin main
```

이 방식은 일반 `git push` 이벤트를 발생시키므로 `on: push branches: main` 트리거가 정상 실행될 가능성이 높다.

### 방법 C. 실제 변경 커밋을 로컬에서 다시 push

```bash
git checkout main
git pull origin main
# 필요한 수정 후
git add .
git commit -m "Update feature"
git push origin main
```

## 6. 자동배포가 돌지 않을 때 확인 순서

```txt
1. GitHub Actions 탭에서 새 run이 생성됐는지 확인
2. 새 run이 없다면 커밋이 main HEAD에 있는지 확인
3. workflow 파일이 main에 존재하는지 확인: .github/workflows/deploy.yml
4. workflow 트리거가 push/main인지 확인
5. connector/API 커밋이라면 workflow_dispatch로 수동 실행
6. 또는 로컬에서 빈 커밋 push로 deploy 트리거
```

구분 기준:

```txt
Actions run 없음
→ 자동배포 트리거 문제

Actions run 있음 + 실패
→ workflow 로그에서 빌드/권한/Cloudflare 오류 확인
```

## 7. 로컬 배포

Cloudflare에 로그인되어 있다면 로컬에서도 배포할 수 있다.

```bash
npm install
npm run build
npx wrangler login
npm run deploy
```

또는 workflow와 동일하게 직접 실행할 수 있다.

```bash
npm install
npm run build
npx wrangler deploy worker/entry.ts
```

## 8. Workers AI 설정

`wrangler.jsonc`에는 다음 설정이 필요하다.

```jsonc
{
  "main": "worker/entry.ts",
  "ai": {
    "binding": "AI"
  },
  "vars": {
    "AI_MODEL": "@cf/google/gemma-4-26b-a4b-it"
  }
}
```

현재 AI 모델 후보 순서:

```txt
@cf/google/gemma-4-26b-a4b-it
@cf/google/gemma-3-12b-it
@cf/openai/gpt-oss-20b
@cf/meta/llama-3.1-8b-instruct
@cf/meta/llama-3-8b-instruct
@cf/mistral/mistral-7b-instruct-v0.1
```

## 9. 배포 후 확인

배포 후 다음 경로를 확인한다.

```txt
/
/api/health
/api/ai-diagnostics
```

`/api/health` 확인 포인트:

```txt
- ok: true
- service: tarrot-service
- buildVersion
- aiModel
- aiBinding: true
```

`/api/ai-diagnostics` 확인 포인트:

```txt
- ok
- aiBinding
- configuredModel
- workingModel
- workingPayload
- attempts[].error
```

## 10. 현재 MVP 동작 범위

현재 배포 가능한 MVP 범위:

```txt
인트로 화면
질문 입력
점술사 질문 보조
배열 추천
질문 봉인
카드 선택
카드 공개
/api/reading Workers AI 호출
카드별 챕터 해석
종장 해석
요약/공유 화면
카드 갤러리
/admin 배경 설정 화면
```

## 11. 문제 해결

### GitHub Actions run 자체가 안 생기는 경우

- connector/API 커밋인지 확인
- Actions 탭에서 `Deploy to Cloudflare Workers`를 수동 실행
- 또는 로컬에서 빈 커밋 push

### GitHub Actions run은 생겼지만 배포가 실패하는 경우

- `CLOUDFLARE_API_TOKEN` 또는 `CF_API_TOKEN` 값 확인
- `CLOUDFLARE_ACCOUNT_ID` 또는 `CF_ACCOUNT_ID` 값 확인
- API Token에 Workers 배포 권한이 있는지 확인
- `npm run build` 실패 로그 확인
- `npx wrangler deploy worker/entry.ts` 실패 로그 확인

### AI 응답이 fallback으로 나오는 경우

- `/api/ai-diagnostics`에서 `workingModel` 확인
- 모델명이 현재 Cloudflare Workers AI에서 사용 가능한지 확인
- Workers AI 일일 무료 할당량 또는 유료 플랜 상태 확인
- `/api/reading` 응답의 `_debugSource`, `_debugReason`, `_debugError` 확인

### 정적 화면은 뜨는데 API가 안 되는 경우

- Worker route가 올바른지 확인
- `wrangler.jsonc`의 `main`이 `worker/entry.ts`인지 확인
- `wrangler.jsonc`의 `assets.binding`이 `ASSETS`인지 확인
- `worker/entry.ts`에서 `/api/ai-diagnostics` 처리 후 나머지를 `worker/index.ts`로 위임하는지 확인
- `worker/index.ts`에서 `/api/*` 라우팅이 먼저 처리되는지 확인
