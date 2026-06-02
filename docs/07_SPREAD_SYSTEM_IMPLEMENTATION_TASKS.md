# 07. 배열법 시스템 구현 작업 목록

이 문서는 `06_READING_FLOW_AND_SPREAD_SYSTEM.md`에서 정의한 공통 리딩 흐름을 실제 코드로 확장하기 위한 구현 작업 목록과 현재 완료 상태를 정리한다.

목표는 단순히 카드 수를 늘리는 것이 아니다.

> 현재 리딩을 데이터 기반 배열법 시스템으로 바꾸고, AI 기반 배열 추천과 1장/3장/5장 배열을 같은 흐름으로 확장 가능하게 만든다.

현재 런타임의 마지막 화면은 `SummaryScene`이다. 후속 대화용 `ChatScene`은 현재 코드에서 제거된 상태이며, 다시 필요할 때 별도 확장 작업으로 재도입한다.

## 1. 현재 완료 요약

현재 완료된 것:

```txt
Phase A. spread 데이터 구조 정리 완료
Phase B. 기존 3장 배열 spread 기반 리팩터링 완료
Phase C. API payload에 spread/position 의미 추가 완료
Phase D. AI 리딩 프롬프트 개선 완료
Phase E. 1장 배열 추가 완료
Phase F. 5장 배열 추가 완료
Phase G. 질문 화면 수동 배열 선택 UI 완료
Phase H. AI 기반 배열 추천 API 완료
Phase I. 질문 화면 하단 UI 압축 배치 완료, 실기기 QA 필요
Phase J. 현재 플로우를 SummaryScene 기준으로 문서 정리 완료
```

현재 구현된 핵심 기능:

```txt
- src/tarot/spreads.ts 기반 배열법 데이터
- 오늘의 한 장 1장 배열
- 상황과 조언의 세 문 3장 배열
- 시간의 세 문 3장 배열
- 관계의 거울 5장 배열
- 선택의 갈림길 5장 배열
- 룰 기반 임시 배열 추천
- /api/spread-recommendation 기반 AI 배열 추천
- AI 추천 실패 시 룰 기반 fallback
- 사용자가 직접 배열을 선택하는 UI
- 질문 화면의 추천 배열 표시
- 질문 화면 하단 가림 완화를 위한 압축 배치
- CardSelectScene 카드 수별 배치
- spread.positions[].layoutHint 기반 카드 선택 배치
- ReadingScene spread 기반 챕터 진행
- ReadingScene 종장 이후 SummaryScene 진입
- SummaryScene 별빛의 기록 요약/공유/이미지 저장/텍스트 복사
- 5장 종장 fusion-card-4, fusion-card-5 보정
- reading 프롬프트의 spreadName, spreadId, positionMeaning 반영
- 5장 리딩용 token budget 상향
```

현재 제거/보류된 것:

```txt
- src/game/scenes/ChatScene.ts
- /api/chat
- requestChat
- ChatMessage
- ChatResponse
- fallbackChat
- parseChatResponse
- worker/prompts/chat.ts 기반 후속 대화 흐름
```

## 2. 구현 원칙

- 게임 화면 전체 채움 정책은 건드리지 않는다.
- `GameConfig.ts`의 스케일 정책은 배열법 구현 작업에서 변경하지 않는다.
- 기존 인트로, 질문 봉인, 카드 공개, 챕터, 종장, 요약 기록 흐름은 유지한다.
- 새 배열법은 새 씬을 만들기보다 기존 씬을 데이터 기반으로 확장한다.
- AI 추천은 실패해도 서비스를 막으면 안 된다. 반드시 룰 기반 fallback으로 진행 가능해야 한다.
- 사용자가 직접 고른 배열은 AI 추천보다 우선한다.
- AI는 반드시 카드 위치 의미를 알고 해석해야 한다.
- 해석은 확정 예언이 아니라 가능성과 현실적 조언으로 정리한다.
- 10장 이상의 배열은 모바일 배치와 응답 길이 부담이 크므로 후순위로 둔다.
- 후속 질문 기능은 현재 범위가 아니며, 필요 시 ChatScene/API를 별도 설계한다.

## 3. 구현 단계별 상태

### Phase A. spread 데이터 구조 정리

상태: 완료.

대상 파일:

```txt
src/tarot/spreads.ts
src/tarot/types.ts
src/game/state/ReadingDraft.ts
```

완료 내용:

```txt
- TarotSpread 타입 추가
- TarotSpreadPosition 타입 추가
- DrawnCard에 positionId, positionMeaning, spreadId, spreadName 추가
- ReadingDraft에 spreadId 추가
- src/tarot/spreads.ts 생성
```

### Phase B. 기존 3장 배열 spread 기반 리팩터링

상태: 완료.

대상 파일:

```txt
src/game/scenes/CardSelectScene.ts
src/game/scenes/ReadingScene.ts
src/tarot/spreads.ts
src/tarot/types.ts
```

완료 내용:

```txt
- CardSelectScene이 spread.cardsToDraw 기준으로 카드 추첨
- CardSelectScene이 spread.positions 기준으로 카드 위치/의미 부여
- ReadingScene이 spread.positions 기반 chapterTitle/shortMeaning/aura 사용
- stepCards.length 기반으로 1장/3장/5장 진행 가능
- 기존 터치 잠금, 자동 대화창, 종장 진행 유지
```

### Phase C. API payload에 spread 정보 추가

상태: 완료.

대상 파일:

```txt
src/api/types.ts
src/api/client.ts
worker/index.ts
worker/prompts/reading.ts
worker/response.ts
```

완료 내용:

```txt
- ReadingRequest에 spreadId, spreadName 추가
- 카드 payload에 positionId, positionMeaning, spreadId, spreadName 포함
- Worker가 spreadName과 positionMeaning을 읽음
- Worker가 1~10장 payload를 받을 수 있도록 정리
- response parser가 최대 10장까지 허용
```

### Phase D. AI 리딩 프롬프트 개선

상태: 완료, 품질 QA 진행 중.

대상 파일:

```txt
worker/prompts/reading.ts
worker/index.ts
worker/response.ts
```

완료 내용:

```txt
- reading prompt에 spreadName, spreadId, card_count 반영
- positionMeaning 중심 해석 강화
- 1장/3장/5장별 응답 길이 가이드 추가
- 관계 배열/선택 배열/상황 배열/오늘의 한 장 전용 해석 규칙 추가
- /api/reading max_tokens 1400 → 2200 상향
```

참고:

```txt
- 후속 대화용 chat prompt는 현재 런타임 범위에서 제외했다.
- ChatScene 재도입 시 별도 Phase로 분리한다.
```

### Phase E. 1장 배열 추가

상태: 완료.

```txt
id: daily-one-card
name: 오늘의 한 장
cardsToDraw: 1
positions:
  - 오늘의 메시지
```

완료 내용:

```txt
- 1장 카드 중앙 배치
- 1장 챕터 → 종장 진행 지원
- 1장용 짧은 리딩 가이드 적용
```

### Phase F. 5장 배열 추가

상태: 완료, 모바일 QA 필요.

구현 배열 1:

```txt
id: relationship-mirror-five
name: 관계의 거울
cardsToDraw: 5
positions:
  1. 나의 마음
  2. 상대의 흐름
  3. 관계의 현재
  4. 막고 있는 것
  5. 조언
```

구현 배열 2:

```txt
id: choice-crossroad-five
name: 선택의 갈림길
cardsToDraw: 5
positions:
  1. 선택 A
  2. 선택 B
  3. 숨은 변수
  4. 진짜 바람
  5. 선택의 조언
```

완료 내용:

```txt
- CardSelectScene 5장 배치 추가: 위 2장 + 아래 3장
- 5장 카드 크기/터치 영역 보정
- 5장 종장 fusion-card-4, fusion-card-5 CSS 보정
```

### Phase G. 질문 화면 수동 배열 선택 UI

상태: 완료, 모바일 QA 필요.

대상 파일:

```txt
src/game/scenes/QuestionScene.ts
```

완료 내용:

```txt
- 한 장 / 상황 / 시간 / 관계 / 선택 버튼 추가
- 직접 선택한 배열은 selectedSpreadId로 저장
- 직접 선택 시 AI 자동 추천 중단
- 질문 봉인 시 직접 선택한 배열을 우선 사용
```

현재 참고:

```txt
- 실제 질문 화면은 RPG식 대화 선택지 흐름으로 개편되어 있다.
- 기존 grid/button UI는 일부 숨김 처리되거나 대화 선택지로 대체되어 있다.
- 문서상 핵심은 selectedSpreadId/isManualSpreadSelection 정책 유지다.
```

### Phase H. AI 기반 배열 추천 API

상태: 완료, API QA 필요.

대상 파일:

```txt
worker/prompts/spread.ts
worker/index.ts
src/api/types.ts
src/api/client.ts
src/game/scenes/QuestionScene.ts
```

완료 내용:

```txt
- /api/spread-recommendation 추가
- SpreadRecommendationRequest/Response 타입 추가
- requestSpreadRecommendation client 추가
- 질문 입력 후 0.72초 debounce 뒤 AI 추천 호출
- AI 추천 중 문구 표시
- AI 추천 결과의 spreadId/reason을 추천 패널에 반영
- 허용된 spreadId만 Worker에서 통과
- AI 실패 시 situation-obstacle-advice fallback 응답
- 프론트 실패 시 룰 기반 추천 유지
```

### Phase I. 질문 화면 하단 UI 압축 배치

상태: 완료, 실기기 QA 필요.

대상 파일:

```txt
src/game/scenes/QuestionScene.ts
src/game/patches/questionSceneSpreadPreviewPatch.ts
```

완료 내용:

```txt
- QuestionScene 하단 RPG 대화창 스킨 적용
- 의식 3/5 배열 프리뷰를 Phaser 기반 카드 미리보기로 보강
- 1장/3장/5장 프리뷰 배치 적용
- 하단 UI와 선택지 가림을 줄이기 위해 대화창/선택지 위치 보정
```

주의:

```txt
- 키보드가 올라왔을 때 입력창이 가려지는지는 별도 확인 필요
- 모바일 브라우저/앱 하단 UI와 선택지가 겹치는지 실기기 확인 필요
- createDialogueUI()와 setChoices() 자체를 통째로 교체하지 않는다.
```

### Phase J. SummaryScene 기준 문서 정리

상태: 완료.

대상 파일:

```txt
docs/05_CURRENT_STATUS.md
docs/06_READING_FLOW_AND_SPREAD_SYSTEM.md
docs/07_SPREAD_SYSTEM_IMPLEMENTATION_TASKS.md
```

완료 내용:

```txt
- 현재 기본 흐름을 ReadingScene → SummaryScene으로 통일
- ChatScene 제거 상태 문서화
- 후속 대화는 다음 확장 후보로 이동
- SummaryScene의 요약/공유/이미지 저장/텍스트 복사 역할 명시
```

## 4. 현재 지원 배열법

사용자가 직접 선택할 수 있고 AI 추천 허용 목록에 들어가는 배열은 다음 5개다.

```txt
오늘의 한 장
- 오늘의 메시지

상황과 조언의 세 문
- 현재 상황
- 막고 있는 것
- 조언

시간의 세 문
- 과거
- 현재
- 미래

관계의 거울 5장
- 나의 마음
- 상대의 흐름
- 관계의 현재
- 막고 있는 것
- 조언

선택의 갈림길 5장
- 선택 A
- 선택 B
- 숨은 변수
- 진짜 바람
- 선택의 조언
```

참고:

```txt
- src/tarot/spreads.ts에는 relationship-three, choice-three 데이터가 남아 있을 수 있다.
- 현재 기본 선택 UI와 Worker allowedSpreadIds는 위 5개 기준이다.
- 3장 관계/선택 배열을 다시 노출하려면 selectableSpreadIds, allowedSpreadIds, 문서를 함께 갱신한다.
```

## 5. 현재 추천 흐름

```txt
질문 입력
  ↓
룰 기반 임시 추천 표시
  ↓
0.72초 debounce
  ↓
/api/spread-recommendation 호출
  ↓
AI 추천 성공
  → 추천 배열과 이유 갱신

AI 추천 실패
  → 룰 기반 추천 유지

사용자 수동 선택
  → 직접 선택 우선, AI 추천 중단

질문 변경
  → 현재 구현에서는 수동 선택/AI 추천 상태를 초기화하고 새 질문 기준으로 다시 추천
```

## 6. 씬별 영향 범위와 현재 상태

### QuestionScene

상태:

```txt
- 룰 기반 임시 추천 완료
- AI 추천 호출 완료
- 수동 배열 선택 완료
- 추천 패널/대화형 배열 제안 완료
- 질문 화면 압축 배치 완료
- RPG 대화창 스킨 적용 완료
- 의식 3/5 카드 프리뷰 적용 완료
```

주의:

```txt
- /api/spread-recommendation 라우트가 배포 환경에 반영되어야 한다.
- AI 추천 실패 시 404/500이 콘솔에 과도하게 쌓이지 않는지 확인한다.
- 하단 UI가 실제 모바일에서 가려지지 않는지 확인한다.
```

### CardSelectScene

상태:

```txt
- spread 기반 카드 수 지원 완료
- 1장/3장/5장 배치 함수 구현 완료
- layoutHint 우선 반영 완료
- 5장 터치 영역/카드 크기 보정 완료
```

### ReadingScene

상태:

```txt
- spread 기반 챕터 제목 지원 완료
- spread 기반 위치 의미 지원 완료
- 카드 수에 따른 챕터 진행 완료
- 1장/3장/5장 종장 진행 완료
- 종장 이후 SummaryScene 이동 완료
```

### SummaryScene

상태:

```txt
- 질문/배열/선택 카드/요약 표시 완료
- 공유 기능 유지
- 이미지 저장 기능 유지
- 텍스트 복사 기능 유지
```

### ChatScene

상태:

```txt
- 현재 사용하지 않음
- 코드에서 제거됨
- 후속 질문 기능이 필요해질 때 별도 API와 함께 재도입
```

## 7. QA 체크리스트

### 코드/빌드

```txt
- npm run typecheck 통과
- npm run build 통과
- ChatScene/requestChat/ChatMessage 잔여 참조 없음
- worker/prompts/chat.ts 잔여 참조 없음
- /api/spread-recommendation 404 없음
- /api/spread-recommendation JSON 응답 정상
- /api/reading JSON 응답 정상
```

### 질문 화면

```txt
- 질문 입력/확인/질문 보조/배열 추천 단계가 끊기지 않는가?
- 0.72초 뒤 AI 추천 이유가 반영되는가?
- 직접 배열 선택 시 AI 추천보다 우선되는가?
- 질문 변경 시 추천 상태가 새 질문 기준으로 갱신되는가?
- 한 장/상황/시간/관계/선택 선택지가 모두 접근 가능한가?
- 하단 대화창/선택지가 브라우저 UI에 가리지 않는가?
- 의식 3/5 카드 프리뷰가 선택지와 겹치지 않는가?
```

### 1장 배열

```txt
- 카드가 중앙에 자연스럽게 배치되는가?
- 한 장 공개 후 리딩으로 이동되는가?
- 한 장만으로 종장이 어색하지 않은가?
- AI 응답이 짧고 명확한가?
- SummaryScene 기록에 1장 배열이 자연스럽게 표시되는가?
```

### 3장 배열

```txt
- 카드 위치와 챕터 제목이 일치하는가?
- 종장 조언이 세 장의 흐름을 묶는가?
- 시간/상황 배열의 위치 의미가 AI 응답에 반영되는가?
- SummaryScene 기록에 3장 카드가 잘리지 않고 표시되는가?
```

### 5장 배열

```txt
- 카드가 서로 겹치지 않는가?
- 터치 영역이 정확한가?
- 다섯 장 공개 후 리딩으로 이동하는가?
- 다섯 개 챕터가 순서대로 진행되는가?
- 1/5~5/5 진행 표시가 맞는가?
- 제4장/제5장 제목이 잘리는가?
- 종장 융합에서 4번째/5번째 카드가 자연스럽게 보이는가?
- 종장 조언이 너무 길어지지 않는가?
- SummaryScene 기록에서 5장 카드 목록이 모바일에서 읽을 만한가?
```

### SummaryScene

```txt
- ReadingScene 종장 터치 후 SummaryScene으로 정상 이동하는가?
- 질문/배열명/카드 목록/요약이 모두 보이는가?
- 공유 버튼이 지원 환경에서 동작하는가?
- 공유 미지원 환경에서 복사 fallback이 동작하는가?
- 이미지 저장 시 카드 이미지가 누락되지 않는가?
- 텍스트 복사 버튼이 정상 동작하는가?
```

### AI

```txt
- /api/health에서 aiBinding이 true인가?
- /api/ai-diagnostics에서 최소 1개 모델/payload 조합이 성공하는가?
- AI 추천 배열이 질문 의도에 맞는가?
- 카드 위치 의미가 리딩에 반영되는가?
- 질문과 카드가 연결되는가?
- 카드 간 관계를 종합하는가?
- 확정 예언처럼 말하지 않는가?
- 관계 배열에서 상대 마음을 사실처럼 단정하지 않는가?
- 선택 배열에서 특정 선택을 운명처럼 강요하지 않는가?
- 현실적 조언이 포함되는가?
```

## 8. 다음 권장 작업 순서

```txt
1. npm run typecheck / npm run build
2. /api/health, /api/ai-diagnostics 확인
3. /api/spread-recommendation 실제 응답 QA
4. /api/reading 실제 응답 QA
5. 질문 화면 모바일 실기기 QA
6. SummaryScene 공유/이미지 저장/복사 QA
7. 5장 배열 모바일 실기기 QA
8. 5장 ReadingScene 제4장/제5장/종장 레이아웃 미세 조정
9. AI 추천 샘플 확인 후 worker/prompts/spread.ts 튜닝
10. 정방향/역방향 카드 시스템 설계
```

## 9. 하면 안 되는 것

```txt
- UI 위치 문제를 GameConfig 스케일 변경으로 해결하지 않는다.
- UI 위치 문제를 전역 CSS safe-area 수정으로 먼저 해결하지 않는다.
- AI 추천 실패 때문에 질문 진행을 막지 않는다.
- 직접 선택한 배열을 AI 추천으로 덮어쓰지 않는다.
- 5장 배열을 새 씬으로 따로 만들지 않는다.
- AI에게 카드 이름만 보내고 position 의미를 생략하지 않는다.
- 카드가 많아졌다고 한 화면에 모든 해석을 한 번에 보여주지 않는다.
- 챕터/종장 터치 잠금 규칙을 제거하지 않는다.
- VFX 갤러리 씬을 되살리지 않는다.
- 후속 질문 기능을 임시로 끼워 넣지 않는다. 필요하면 ChatScene/API를 새 Phase로 설계한다.
```

## 10. 완료 판단

배열법 시스템 구현 완료로 볼 수 있는 조건:

```txt
- 1장 배열이 정상 동작한다. 완료
- 3장 배열이 정상 동작한다. 완료
- 5장 관계 배열이 정상 동작한다. 구현 완료, 실기기 QA 필요
- 5장 선택 배열이 정상 동작한다. 구현 완료, 실기기 QA 필요
- AI 기반 배열 추천이 정상 동작한다. 구현 완료, API QA 필요
- 수동 배열 선택이 정상 동작한다. 구현 완료, 모바일 QA 필요
- 카드 위치 의미가 AI 프롬프트에 전달된다. 완료
- AI가 위치 의미와 카드 간 관계를 반영한다. 구현 완료, 품질 QA 필요
- ReadingScene 이후 SummaryScene으로 이동한다. 완료
- SummaryScene에서 요약/공유/이미지 저장/복사가 가능하다. 구현 완료, QA 필요
- 기존 모바일 전체 화면 채움 정책이 유지된다. 완료
- 기존 인트로/질문 봉인/카드 공개/챕터/종장 흐름이 유지된다. 완료
```

## 11. 다음 확장 후보

```txt
1. 정방향/역방향 카드 시스템
2. 내면의 나침반 5장
3. 월간 흐름 7장
4. 켈틱 크로스 10장
5. 후속 질문용 ChatScene + /api/chat 재도입
```

정방향/역방향은 실제 타로 느낌을 강화하지만, 카드 이미지 회전, UI 표시, AI 프롬프트 변화가 모두 필요하므로 별도 단계로 진행한다.

후속 질문 기능은 현재 제거된 상태다. 다시 넣을 경우 `ChatScene`, `requestChat`, `ChatMessage`, `/api/chat`, chat prompt, SummaryScene 진입 버튼을 한 번에 설계한다.
