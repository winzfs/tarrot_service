# 05. 현재 구현 상태

이 문서는 `tarrot_service`의 현재 구현 상태와 최근 복구 이슈를 빠르게 파악하기 위한 문서다.

기준 시점: 인트로 먹통, AI fallback, 연출 간소화 이슈를 점검하고 프론트/VFX/Worker 배포 경로를 복구한 직후.

## 1. 현재 한 줄 상태

**Phaser 기반 게임형 타로 플로우와 카드/VFX 연출은 유지·복구 중이며, Cloudflare Worker는 새 엔트리(`worker/entry.ts`)로 배포하도록 우회했다. AI 기능은 아직 fallback으로 보이며, 코드 문제뿐 아니라 Cloudflare Workers AI 사용량/쿼터/뉴런 소진 가능성이 높다.**

## 2. 현재 우선순위

```txt
1. 최신 main이 실제 Cloudflare Worker에 배포됐는지 확인
2. 인트로/카드/VFX 연출이 원래 밀도로 복구됐는지 모바일 실기기 확인
3. 질문 입력 → 질문 보조 → 배열 추천 → 카드 선택 → 리딩 → 요약 플로우 확인
4. AI는 나중에 별도 점검
   - 현재는 fallback 상태로 두고, Workers AI 사용량/쿼터/뉴런 소진 여부를 먼저 확인
```

## 3. 의도된 사용자 플로우

```txt
IntroScene
  ↓
QuestionScene 1단계: 질문 입력
  ↓
QuestionScene 2단계: 점술사 질문 보조
  ↓
QuestionScene 3단계: 점술사 배열 추천 / 다른 배열 선택
  ↓
질문 봉인 연출
  ↓
CardSelectScene
  ↓
ReadingScene: 카드별 챕터 해석 + 종장 해석
  ↓
SummaryScene: 별빛의 기록 요약/공유/이미지 저장
```

## 4. 최근 주요 복구 이력

### 4.1 FlowMachine 씬 이중 시작 수정

- `ConversationFlowMachine`이 대상 씬을 데이터 없이 먼저 시작하고, 이후 executor에서 다시 시작하던 구조를 수정했다.
- `CardSelectScene`, `ReadingScene`은 `draft`, `spread`, `cards` 데이터가 필수이므로 데이터 없는 scene start가 런타임 문제를 만들 수 있었다.
- 현재는 호출부 executor에서 데이터 포함 `scene.start`만 수행하도록 정리했다.

### 4.2 인트로 먹통 원인 대응

- 인트로 먹통처럼 보였던 원인 중 하나는 Phaser Tweens API 오용이었다.
- `getAllTweens` 직접 호출 문제를 안전 처리했다.
- 이후 임시로 들어간 자동 진행/전체화면 터치/window pointer fallback은 연출을 감상하기 전에 화면이 넘어가게 만들 수 있어 제거했다.

현재 IntroScene 원칙:

```txt
- 자동 진행 없음
- 화면 아무 곳 터치로 시작 없음
- window pointer hard fallback 없음
- 시작 버튼 클릭 또는 Enter/Space로만 진행
- 기존 카드/glow/rune ring/star/sparkle/sweep/burst 연출 유지
```

### 4.3 VFX 간소화 복구

- 성능 제한 때문에 VFX가 간소화되는 현상을 막기 위해 `vfxEffects.ts`에서 파티클/트윈을 중간에 줄이거나 destroy하던 제한을 제거했다.
- `playBurst`, `playSmoke`, `spawnTextureSparkles`는 원래 의도한 밀도를 우선한다.
- 성능 최적화를 이유로 연출을 단순화하지 않는 것이 현재 원칙이다.

### 4.4 Worker 배포 경로 우회

기존 `worker/index.ts`는 Codex 수정 과정에서 다음 문제가 생긴 이력이 있다.

```txt
- runAiText 중복 선언
- result 미정의 참조
- AI 호출 성공 후에도 fallback으로 떨어질 가능성
```

그래서 현재는 기존 파일을 직접 배포하지 않고, 새 엔트리를 사용한다.

```txt
worker/entry.ts
worker/runtime.ts
worker/aiHandlers.ts
worker/diagnostics.ts
```

현재 배포 명령:

```txt
npx wrangler deploy worker/entry.ts
```

로컬 배포 스크립트:

```txt
npm run build && wrangler deploy worker/entry.ts
```

## 5. AI 현재 상태

현재 사용자 보고 기준:

```txt
- 질문 보조/배열 추천/리딩이 여전히 fallback처럼 보임
- AI 문제는 후순위로 미룸
- 원인 후보는 코드보다 Cloudflare Workers AI 사용량/쿼터/뉴런 소진 가능성이 큼
```

나중에 확인할 항목:

```txt
GET /api/health
- aiBinding 값 확인

POST /api/question-assist
POST /api/spread-recommendation
POST /api/reading
- _debugSource 확인
- _debugReason 확인

Cloudflare Dashboard
- Workers AI 사용량/한도/과금 상태 확인
- 뉴런/쿼터/크레딧 소진 여부 확인
- Worker 로그에서 env.AI.run 실패 메시지 확인
```

판단 기준:

```txt
_debugSource: ai, _debugReason: ok
  → AI 호출 성공

_debugSource: fallback, _debugReason: missing_binding
  → Worker에 AI binding이 붙지 않음

_debugSource: fallback, _debugReason: ai_error
  → AI binding은 있으나 모델 호출 실패
  → 모델명, 권한, 사용량/쿼터/뉴런 소진, 파라미터 문제를 확인해야 함
```

## 6. 씬별 현재 상태

### IntroScene

현재 상태:

- 인트로 연출 복구 완료 단계
- `public/img/title.png` 타이틀 이미지 사용
- 카드 뒷면 이미지, glow, rune ring, 별빛, sparkle, sweep, burst 유지
- 자동 진행 제거
- 전체화면 터치 시작 제거
- 시작 버튼 또는 Enter/Space로만 진행

확인 필요:

- 실제 배포본에서 자동으로 넘어가지 않는지
- 원래보다 연출이 간소화되지 않았는지
- 버튼 터치가 정상 동작하는지

### QuestionScene

현재 상태:

- 질문 입력, 질문 보조, 배열 추천, 질문 봉인 단계 유지
- AI 실패 시 fallback으로 진행 가능
- AI는 점술사 NPC로만 표현하고, 기능명으로 노출하지 않음

확인 필요:

- fallback 상태에서도 플로우가 끊기지 않는지
- 하단 UI가 모바일 브라우저 UI에 가리지 않는지

### CardSelectScene

현재 상태:

- 실제 카드 앞면/뒷면 이미지 사용
- 1장/3장/5장 배열 카드 선택 지원
- 카드 플립/확대/공개 연출 유지
- FlowMachine 데이터 누락 문제 수정됨

확인 필요:

- 5장 배열 모바일 배치
- 해석 버튼 위치
- 카드 공개 VFX 밀도

### ReadingScene

현재 상태:

- 카드별 챕터 해석 + 종장 해석 구조 유지
- AI 실패 시 fallbackReading 사용
- AI 복구는 후순위

확인 필요:

- fallback 상태에서도 화면이 정상 진행되는지
- 종장 융합 연출과 대화창 위치

### SummaryScene

현재 상태:

- 요약·공유 화면 유지
- 공유/이미지 저장/텍스트 복사/새 질문 버튼 유지

확인 필요:

- ReadingScene 이후 정상 진입
- 저장 이미지 누락 여부

## 7. 현재 중요한 파일

```txt
src/game/scenes/IntroScene.ts
src/game/scenes/QuestionScene.ts
src/game/scenes/CardSelectScene.ts
src/game/scenes/ReadingScene.ts
src/game/scenes/SummaryScene.ts
src/game/vfx/vfxEffects.ts
src/game/performance/qualityProfile.ts
src/game/flow/ConversationFlowMachine.ts
src/api/client.ts
src/api/types.ts
worker/entry.ts
worker/runtime.ts
worker/aiHandlers.ts
worker/diagnostics.ts
worker/index.ts
worker/prompts/questionAssist.ts
worker/prompts/spread.ts
worker/prompts/reading.ts
worker/response.ts
package.json
.github/workflows/deploy.yml
wrangler.jsonc
```

## 8. 배포 상태

현재 GitHub Actions는 다음 구조다.

```txt
on push to main
npm install --no-audit --no-fund
npm run build
npx wrangler deploy worker/entry.ts
```

확인 필요:

- 최신 main 커밋으로 Actions가 실제 실행됐는지
- 실행되지 않았다면 GitHub Actions에서 수동 Run workflow
- 배포 성공 후 Cloudflare Worker에서 최신 프론트/VFX/Worker 코드가 반영됐는지

로컬 배포:

```bash
npm install
npm run build
npm run deploy
```

## 9. 현재 UX 원칙

- 연출은 원래 의도한 신비롭고 게임적인 분위기를 유지한다.
- 성능 최적화를 이유로 인트로/VFX/카드 연출을 간소화하지 않는다.
- 먹통 방지를 이유로 자동 스킵이나 전체화면 터치 스킵을 넣지 않는다.
- 시작은 명확한 버튼 입력으로만 진행한다.
- AI 실패 시 fallback은 허용하지만, fallback을 AI처럼 꾸미지 않는다.
- AI 문제는 사용량/쿼터/뉴런 소진 가능성을 포함해 별도 점검한다.

## 10. 남은 작업

### 1순위: 배포 반영 확인

- 최신 main이 Cloudflare Worker에 배포됐는지 확인
- 인트로/VFX 복구가 실제 배포본에 반영됐는지 확인

### 2순위: 연출 QA

- 인트로 연출 밀도 확인
- 질문 봉인 VFX 확인
- 카드 공개 VFX 확인
- ReadingScene 챕터/종장 연출 확인

### 3순위: 플로우 QA

- 질문 입력 → 카드 선택 → 리딩 → 요약까지 진행 확인
- fallback 상태에서도 UX가 끊기지 않는지 확인

### 4순위: AI 원인 분리

- Workers AI 사용량/쿼터/뉴런 소진 확인
- `/api/health` 확인
- `_debugSource`, `_debugReason` 확인
- Worker 로그 확인

### 5순위: 코드 정리

- 기존 `worker/index.ts`를 삭제하거나 `worker/entry.ts` 기반 안전 버전으로 정리
- 임시 진단 코드 정리
- 문서와 실제 배포 구조 동기화
