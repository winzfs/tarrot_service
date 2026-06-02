# 05. 현재 구현 상태

이 문서는 `tarrot_service`의 현재 구현 상태와 최근 정리 이슈를 빠르게 파악하기 위한 문서다.

기준 시점: ChatScene 미완성 잔재를 제거하고, 실제 런타임 플로우와 문서를 `ReadingScene → SummaryScene` 기준으로 맞춘 상태.

## 1. 현재 한 줄 상태

**Phaser 기반 게임형 타로 플로우와 카드/VFX 연출은 유지 중이다. 현재 기본 흐름은 `IntroScene → QuestionScene → CardSelectScene → ReadingScene → SummaryScene`이며, 최종 화면은 `별빛의 기록` 요약/공유/이미지 저장/텍스트 복사 화면이다. 미완성 후속 대화용 `ChatScene`과 관련 타입/응답 파서 잔재는 제거했다. Cloudflare Worker는 `wrangler.jsonc`의 `main: worker/entry.ts` 기준으로 배포되며, AI는 실패해도 fallback으로 진행 가능하다. 현재 문서 기준 main 최신 정리 커밋은 `fe74c235ddaaaf627f9545b6f3e969525be8cfd6` 이후 상태다.**

## 2. 현재 우선순위

```txt
1. 최신 main이 실제 Cloudflare Worker에 배포됐는지 확인
2. npm run typecheck / npm run build 통과 확인
3. QuestionScene 1/5 → 3/5 진행이 실제 모바일에서 끊기지 않는지 확인
4. RPG 대화창 위치/크기/선택지 간격 QA
5. 의식 3/5 배열 프리뷰의 위치/크기/부유/밝기 변화 QA
6. ReadingScene → SummaryScene 진입과 공유/이미지 저장/복사 QA
7. AI는 별도 점검
   - Workers AI binding, 모델 호출, 사용량/쿼터/뉴런 소진 여부 확인
```

## 3. 현재 사용자 플로우

```txt
IntroScene
  ↓
QuestionScene 1단계: 점술사 NPC 인사 / 질문 입력
  ↓
QuestionScene 2단계: 점술사 질문 보조
  ↓
QuestionScene 3단계: 점술사 배열 추천 / 배열 설명 / 카드 뒷면 프리뷰 / 다른 배열 선택
  ↓
질문 봉인 연출
  ↓
CardSelectScene
  ↓
ReadingScene: 카드별 챕터 해석 + 종장 해석
  ↓
SummaryScene: 별빛의 기록 요약 / 공유 / 이미지 저장 / 텍스트 복사
```

현재 최종 화면은 `SummaryScene`이다. 후속 질문용 `ChatScene`은 현재 런타임에서 사용하지 않으며 코드에서도 제거했다.

## 4. 최근 주요 정리/복구 이력

### 4.1 ChatScene 미완성 잔재 제거

정리 이유:

```txt
- ChatScene.ts가 requestChat을 import했지만 src/api/client.ts에는 requestChat이 없었다.
- ChatScene.ts가 ChatMessage 타입을 import했지만 src/api/types.ts에는 ChatMessage가 없었다.
- tsconfig.json은 src 전체를 include하므로, 미사용 씬이어도 typecheck를 깨뜨릴 수 있었다.
- Worker response.ts에는 ChatResponse/fallbackChat/parseChatResponse 잔재가 있었지만 /api/chat 핸들러와 연결되어 있지 않았다.
```

정리 내용:

```txt
- src/game/scenes/ChatScene.ts 삭제
- worker/response.ts의 ChatResponse 제거
- worker/response.ts의 fallbackChat 제거
- worker/response.ts의 parseChatResponse 제거
- docs/06_READING_FLOW_AND_SPREAD_SYSTEM.md를 SummaryScene 기준으로 갱신
```

후속 질문 기능이 필요할 때는 다음을 별도 작업으로 다시 설계한다.

```txt
- ChatScene 재작성
- GameConfig.ts scene 목록에 ChatScene 등록
- src/api/types.ts에 ChatMessage/ChatRequest/ChatResponse 추가
- src/api/client.ts에 requestChat 추가
- worker/index.ts에 /api/chat 추가
- SummaryScene에서 후속 질문 진입 버튼 추가
```

### 4.2 FlowMachine 씬 이중 시작 수정

- `ConversationFlowMachine`이 대상 씬을 데이터 없이 먼저 시작하고, 이후 executor에서 다시 시작하던 구조를 수정했다.
- `CardSelectScene`, `ReadingScene`은 `draft`, `spread`, `cards` 데이터가 필수이므로 데이터 없는 scene start가 런타임 문제를 만들 수 있었다.
- 현재는 호출부 executor에서 데이터 포함 `scene.start`만 수행하도록 정리했다.

### 4.3 인트로 먹통 원인 대응

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

### 4.4 VFX 간소화 복구

- 성능 제한 때문에 VFX가 간소화되는 현상을 막기 위해 `vfxEffects.ts`에서 파티클/트윈을 중간에 줄이거나 destroy하던 제한을 제거했다.
- `playBurst`, `playSmoke`, `spawnTextureSparkles`는 원래 의도한 밀도를 우선한다.
- 성능 최적화를 이유로 연출을 단순화하지 않는 것이 현재 원칙이다.

### 4.5 Worker 배포 경로 정리

현재 Worker 엔트리:

```txt
worker/entry.ts
```

`worker/entry.ts` 역할:

```txt
- /api/ai-diagnostics 요청은 worker/aiDiagnostics.ts로 보낸다.
- 나머지 요청은 worker/index.ts의 fetch로 넘긴다.
```

현재 API 처리 파일:

```txt
worker/index.ts
worker/aiDiagnostics.ts
worker/prompts/questionAssist.ts
worker/prompts/spread.ts
worker/prompts/reading.ts
worker/response.ts
```

현재 `wrangler.jsonc` 기준:

```txt
main: worker/entry.ts
AI binding: AI
AI_MODEL: @cf/google/gemma-4-26b-a4b-it
assets.directory: ./dist
```

현재 배포 명령:

```bash
npm run build
npm run deploy
```

`package.json`의 deploy 스크립트는 다음과 같다.

```bash
npm run build && wrangler deploy
```

명시적으로 엔트리를 지정해야 할 때만 다음을 사용한다.

```bash
npx wrangler deploy worker/entry.ts
```

### 4.6 QuestionScene 의식 3/5 배열 프리뷰 보강

의식 3/5 배열 추천 화면을 게임형으로 보강했다.

현재 구현 파일:

```txt
src/game/patches/questionSceneSpreadPreviewPatch.ts
src/main.ts
```

구현 방식:

```txt
- main.ts에서 installQuestionSceneSpreadPreviewPatch()를 실행한다.
- 제목이 "의식 3/5 · 배열 제안"일 때만 카드 프리뷰가 동작한다.
- 배열명 첫 줄에서 카드 수를 추출한다.
- 배열별 고유 설명을 강제로 표시한다.
- 카드 뒷면 프리뷰는 Phaser 오브젝트로 렌더링한다.
- 카드 뒷면 텍스처 키는 BootScene에서 로드되는 "tarot-card-back"을 사용한다.
```

현재 프리뷰 연출:

```txt
- DOM/CSS 카드 프리뷰는 제거했다.
- Phaser 기반 카드 이미지 프리뷰로 되돌렸다.
- 카드 밝기 변화는 카드 이미지 위에 같은 이미지를 ADD blend overlay로 얹고 alpha tween으로 처리한다.
- 카드 자체는 container 단위로 살짝 부유한다.
- 카드에는 고정 금색/보라색 테두리가 있다.
- 5장 배열은 2장/3장 두 줄 배치다.
```

현재 프리뷰 레이아웃 값:

```txt
1장 배열
- 크기: 248 x 384
- 위치: centerX, sy(478)

3장 배열
- 크기: 198 x 306
- 간격: 44
- 위치: y = sy(486)

5장 배열
- 크기: 138 x 214
- 배치: 위 2장 / 아래 3장
- gapX: 44
- gapY: 34
- 위 줄 y: sy(418)
- 아래 줄 y: topY + height + gapY
```

중요한 시행착오:

```txt
- DOM/CSS 기반 카드 프리뷰는 Phaser DOMElement 합성과 CSS opacity/filter 애니메이션 때문에 카드가 미세하게 떨려 보일 수 있었다.
- 사선 shine/유리광은 작은 다중 카드 프리뷰에서는 자연스럽지 않고 밝기 출렁임이 두드러졌다.
- 현재 방향은 챕터 해석의 본격 카드 등장 연출은 ReadingScene에 맡기고, 의식 3/5 프리뷰는 Phaser 기반 카드 미리보기 + 은은한 생동감만 주는 방식이다.
```

### 4.7 QuestionScene RPG 대화창 스킨 안정 적용

현재 QuestionScene에는 RPG 게임 NPC 대화창처럼 보이는 하단 대화창 스킨이 적용되어 있다.

성공 방식:

```txt
- createDialogueUI()를 패치에서 교체하지 않는다.
- 기본 QuestionScene.createDialogueUI()가 dialogueTitleText, dialogueBodyText, choiceButtons를 만들게 둔다.
- 기본 setChoices()를 먼저 실행한다.
- 그 뒤 선택지의 외형/위치/깊이만 RPG 스타일로 덧칠한다.
- 질문 입력, 단계 전환, 선택지 action 연결 로직은 직접 재구현하지 않는다.
- setDialogue()는 기존 동작을 먼저 수행한 뒤 대화창 텍스트 위치/스타일을 조정한다.
- RPG 스킨은 safe overlay 방식으로 panel/nameplate/portrait placeholder만 추가한다.
```

현재 대화창 구성:

```txt
- 하단 RPG식 대화 패널
- 점술사 이름표
- 프로필 placeholder: ✦
- 대화 제목/본문
- 선택지 리스트
- primary 선택지는 ➤ 표시
- 일반 선택지는 번호 표시
```

주의:

```txt
- RPG 대화창을 더 다듬을 때도 createDialogueUI() 완전 교체는 금지.
- setChoices() action 연결을 새로 만들지 말 것.
- 기존 setChoices()를 먼저 호출한 후 스타일만 보정하는 방식 유지.
- 의식 1/5 진행 확인 없이 추가 패치를 누적하지 말 것.
```

## 5. AI 현재 상태

현재 상태:

```txt
- 질문 보조/배열 추천/리딩은 AI 호출 실패 시 fallback으로 진행된다.
- AI가 fallback처럼 보이면 코드만 보지 말고 Cloudflare Workers AI binding/모델/사용량/쿼터를 함께 확인해야 한다.
- /api/ai-diagnostics는 여러 모델과 payload 형식을 실제 env.AI.run으로 테스트한다.
```

확인할 항목:

```txt
GET /api/health
- ok
- service
- aiBinding

GET /api/ai-diagnostics
- ok
- aiBinding
- configuredModel
- workingModel
- workingPayload
- attempts[].ok
- attempts[].error

POST /api/question-assist
POST /api/spread-recommendation
POST /api/reading
- 정상 JSON 응답 여부
- fallback 문구만 반복되는지 여부

Cloudflare Dashboard
- Workers AI 사용량/한도/과금 상태 확인
- 뉴런/쿼터/크레딧 소진 여부 확인
- Worker 로그에서 env.AI.run 실패 메시지 확인
```

판단 기준:

```txt
/api/health aiBinding: false
  → Worker에 AI binding이 붙지 않음

/api/ai-diagnostics ok: true
  → 최소 1개 모델/payload 조합 호출 성공

/api/ai-diagnostics ok: false, aiBinding: true
  → AI binding은 있으나 모든 모델 호출 실패
  → 모델명, 권한, 사용량/쿼터/뉴런 소진, 파라미터 문제 확인
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
- RPG식 하단 NPC 대화창 스킨 적용됨
- 의식 3/5 배열 추천 화면에 배열별 설명과 카드 뒷면 프리뷰가 표시됨
- 카드 프리뷰는 `src/game/patches/questionSceneSpreadPreviewPatch.ts`에서 Phaser 기반으로 관리됨
- 5장 배열 프리뷰는 2장/3장 두 줄 배치
- 카드 프리뷰에는 고정 테두리, 은은한 밝기 변화, 부유 tween이 적용됨

확인 필요:

- 1/5부터 질문 입력까지 끊기지 않는지
- fallback 상태에서도 플로우가 끊기지 않는지
- 하단 RPG 대화창이 모바일 브라우저 UI에 가리지 않는지
- 의식 3/5 카드 프리뷰가 선택지/대화창과 겹치지 않는지
- 1장/3장/5장 프리뷰 위치가 모바일에서 적절한지
- 밝기 변화와 부유 효과가 과하거나 떨려 보이지 않는지

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
- QuestionScene과 같은 RPG NPC 대화창 구조 확장 여부

### ReadingScene

현재 상태:

- 카드별 챕터 해석 + 종장 해석 구조 유지
- AI 실패 시 local fallback reading 사용
- 종장 이후 SummaryScene으로 이동
- 챕터 해석 카드 등장/유리광 연출은 ReadingScene 쪽 본편 연출로 유지

확인 필요:

- fallback 상태에서도 화면이 정상 진행되는지
- 종장 융합 연출과 대화창 위치
- 챕터 해석 카드 연출이 프리뷰 조정과 무관하게 유지되는지
- 카드별 챕터/종장 해석에도 RPG NPC 대화창 구조를 적용할지 검토
- SummaryScene 진입 전 마무리 체감이 어색하지 않은지

### SummaryScene

현재 상태:

- 최종 요약/공유 화면
- 질문, 배열명, 선택 카드, 리딩 요약 표시
- 공유/이미지 저장/텍스트 복사 기능 유지

확인 필요:

- ReadingScene 이후 정상 진입
- 공유 API 지원 여부
- 클립보드 복사 지원 여부
- 저장 이미지 누락 여부
- 모바일에서 버튼 위치가 브라우저 UI와 겹치지 않는지

## 7. 현재 중요한 파일

```txt
src/main.ts
src/game/GameConfig.ts
src/game/patches/questionSceneSpreadPreviewPatch.ts
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
src/tarot/spreads.ts
src/tarot/types.ts
worker/entry.ts
worker/aiDiagnostics.ts
worker/index.ts
worker/prompts/questionAssist.ts
worker/prompts/spread.ts
worker/prompts/reading.ts
worker/response.ts
package.json
.github/workflows/deploy.yml
wrangler.jsonc
```

현재 없는/제거된 파일 또는 기능:

```txt
src/game/scenes/ChatScene.ts
/api/chat
requestChat
ChatMessage
ChatResponse
fallbackChat
parseChatResponse
```

## 8. 배포 상태

현재 GitHub Actions는 다음 구조다.

```txt
on push to main
npm install --no-audit --no-fund
npm run build
npx wrangler deploy worker/entry.ts
```

현재 로컬 배포 기본 명령:

```bash
npm install
npm run typecheck
npm run build
npm run deploy
```

확인 필요:

```txt
- 최신 main 커밋으로 Actions가 실제 실행됐는지
- npm run typecheck가 ChatScene 제거 이후 통과하는지
- npm run build가 통과하는지
- 배포 성공 후 Cloudflare Worker에서 최신 프론트/VFX/Worker 코드가 반영됐는지
- /api/health와 /api/ai-diagnostics 결과가 예상대로 나오는지
```

## 9. 현재 UX 원칙

- 연출은 원래 의도한 신비롭고 게임적인 분위기를 유지한다.
- 성능 최적화를 이유로 인트로/VFX/카드 연출을 간소화하지 않는다.
- 먹통 방지를 이유로 자동 스킵이나 전체화면 터치 스킵을 넣지 않는다.
- 시작은 명확한 버튼 입력으로만 진행한다.
- AI 실패 시 fallback은 허용하지만, fallback을 AI처럼 꾸미지 않는다.
- AI 문제는 binding, 모델명, 사용량/쿼터/뉴런 소진 가능성을 포함해 별도 점검한다.
- 의식 3/5 프리뷰는 배열 이해를 돕는 미리보기이며, ReadingScene의 본격 카드 등장/해석 연출을 대체하지 않는다.
- 프리뷰 연출이 산만하거나 떨려 보이면, 복잡한 DOM/CSS shine보다 Phaser 기반 단순 밝기/부유 tween을 우선한다.
- RPG 대화창은 QuestionScene 기본 흐름 위에 스킨처럼 얹는다.
- 검증 전에는 createDialogueUI/setChoices를 직접 재구현하지 않는다.
- 현재 최종 화면은 SummaryScene이며, 후속 채팅은 추후 확장 후보로 둔다.

## 10. 남은 작업

### 1순위: 빌드/타입체크 확인

- `npm run typecheck`
- `npm run build`
- ChatScene 제거 후 src 전체 타입체크가 통과하는지 확인
- worker/response.ts에서 제거한 chat helper 참조가 남아 있지 않은지 확인

### 2순위: 배포 반영 확인

- 최신 main이 Cloudflare Worker에 배포됐는지 확인
- 인트로/VFX 복구가 실제 배포본에 반영됐는지 확인
- QuestionScene RPG 대화창이 실제 배포본에 반영됐는지 확인
- QuestionScene 의식 3/5 프리뷰가 실제 배포본에 반영됐는지 확인
- ReadingScene → SummaryScene 흐름이 실제 배포본에서 정상 동작하는지 확인

### 3순위: QuestionScene RPG 대화창 QA

- 의식 1/5 시작 진행 정상 여부
- 질문 입력 표시 정상 여부
- 선택지 터치 정상 여부
- 대화창이 하단에 안정적으로 보이는지 확인
- 선택지가 1개/2개/5개일 때 간격이 적절한지 확인
- 프로필 placeholder 영역이 너무 크거나 작지 않은지 확인

### 4순위: 의식 3/5 프리뷰 QA

- 1장 배열 위치: 현재 centerX, sy(478)
- 3장 배열 위치: 현재 y = sy(486)
- 5장 배열 위치: 현재 topY = sy(418)
- 5장 배열이 2장/3장 두 줄로 보이는지 확인
- 카드 프리뷰가 선택지/대화창과 겹치지 않는지 확인
- 부유 효과가 과하거나 어색하지 않은지 확인
- 밝기 변화가 너무 강하거나 약하지 않은지 확인

### 5순위: CardSelectScene 대화형 확장

- 카드 선택 전 점술사 대사 추가
- 카드 선택 중 짧은 반응 추가
- 카드 선택 완료 후 해석으로 넘어가는 NPC 대사 추가
- 기존 카드 선택/플립/공개 연출은 유지

### 6순위: ReadingScene 대화형 확장

- 카드별 챕터 해석을 NPC 대화창과 연결
- 종장 해석에서 카드별 해설이 하나씩 뜨는 연출 유지
- 챕터 카드 등장/유리광 연출은 유지
- SummaryScene 진입 전 점술사 마무리 대사 검토

### 7순위: AI 원인 분리

- Workers AI binding 확인
- `/api/health` 확인
- `/api/ai-diagnostics` 확인
- Worker 로그 확인
- Cloudflare Workers AI 사용량/쿼터/뉴런 소진 확인

### 8순위: 코드 정리

- 임시 진단 코드 유지/삭제 여부 결정
- `questionSceneSpreadPreviewPatch.ts`가 충분히 안정되면 QuestionScene 본문으로 통합할지 검토
- RPG 대화창 스킨을 여러 씬에서 재사용할 수 있도록 공통 유틸로 분리 검토
- 후속 질문 기능을 다시 넣을 경우 ChatScene/API를 새 설계로 복구
- 문서와 실제 배포 구조 동기화
