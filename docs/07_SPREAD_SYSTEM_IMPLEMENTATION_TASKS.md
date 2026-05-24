# 07. 배열법 시스템 구현 작업 목록

이 문서는 `06_READING_FLOW_AND_SPREAD_SYSTEM.md`에서 정의한 공통 리딩 흐름을 실제 코드로 확장하기 위한 구현 작업 목록과 현재 완료 상태를 정리한다.

목표는 단순히 카드 수를 늘리는 것이 아니다.

> 현재 리딩을 데이터 기반 배열법 시스템으로 바꾸고, 1장/3장/5장 배열을 같은 흐름으로 확장 가능하게 만든다.

## 1. 현재 완료 요약

현재 완료된 것:

```txt
Phase A. spread 데이터 구조 정리 완료
Phase B. 기존 3장 배열 spread 기반 리팩터링 완료
Phase C. API payload에 spread/position 의미 추가 완료
Phase D. AI 프롬프트 개선 완료
Phase E. 1장 배열 추가 완료
Phase F. 5장 배열 추가 완료
Phase G. 5장 배열 QA와 연출 타이밍 조정 진행 중
```

현재 구현된 핵심 기능:

```txt
- src/tarot/spreads.ts 기반 배열법 데이터
- 오늘의 한 장 1장 배열
- 상황과 조언의 세 문 3장 배열
- 시간의 세 문 3장 배열
- 관계의 거울 5장 배열
- 선택의 갈림길 5장 배열
- 질문 카테고리/질문 문장 기반 자동 배열 추천
- 질문 화면의 추천 배열 표시
- CardSelectScene 카드 수별 배치
- ReadingScene spread 기반 챕터 진행
- 5장 종장 fusion-card-4, fusion-card-5 보정
- reading/chat 프롬프트의 spreadName, positionMeaning 반영
- 5장 리딩용 token budget 상향
```

## 2. 구현 원칙

- 게임 화면 전체 채움 정책은 건드리지 않는다.
- `GameConfig.ts`의 스케일 정책은 배열법 구현 작업에서 변경하지 않는다.
- 기존 인트로, 질문 봉인, 카드 공개, 챕터, 종장 흐름은 유지한다.
- 새 배열법은 새 씬을 만들기보다 기존 씬을 데이터 기반으로 확장한다.
- AI는 반드시 카드 위치 의미를 알고 해석해야 한다.
- 해석은 확정 예언이 아니라 가능성과 현실적 조언으로 정리한다.
- 10장 이상의 배열은 모바일 배치와 응답 길이 부담이 크므로 후순위로 둔다.

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

현재 타입 핵심:

```ts
export type TarotSpread = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  recommendedFor: ReadingCategory[];
  cardsToDraw: number;
  positions: TarotSpreadPosition[];
};

export type TarotSpreadPosition = {
  id: string;
  label: string;
  chapterTitle: string;
  shortMeaning: string;
  promptMeaning: string;
  aura?: "past-aura" | "present-aura" | "future-aura";
  layoutHint?: {
    x: number;
    y: number;
  };
};
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
worker/prompts/chat.ts
```

완료 내용:

```txt
- ReadingRequest에 spreadName 추가
- 카드 payload에 positionId, positionMeaning, spreadId, spreadName 포함
- Worker가 spreadName과 positionMeaning을 읽음
- Worker가 1~10장 payload를 받을 수 있도록 정리
- response parser가 최대 10장까지 허용
```

### Phase D. AI 프롬프트 개선

상태: 완료, 품질 QA 진행 중.

대상 파일:

```txt
worker/prompts/reading.ts
worker/prompts/chat.ts
worker/index.ts
```

완료 내용:

```txt
- reading prompt에 spreadName, spreadId, card_count 반영
- positionMeaning 중심 해석 강화
- 1장/3장/5장별 응답 길이 가이드 추가
- 관계 배열/선택 배열/상황 배열/오늘의 한 장 전용 해석 규칙 추가
- chat prompt가 3장 고정에서 가변 배열 기반으로 변경
- 후속 대화에서 spreadName, positionMeaning 유지
- /api/reading max_tokens 1400 → 2200 상향
```

### Phase E. 1장 배열 추가

상태: 완료.

구현 배열:

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
- 자유 질문 중 오늘/짧게/한마디/메시지 계열 질문에 추천
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
- 관계/연애/인간관계 카테고리는 관계의 거울 5장 추천
- 선택/갈림길/할까 말까 계열 자유 질문은 선택의 갈림길 5장 추천
- CardSelectScene 5장 배치 추가: 위 2장 + 아래 3장
- 5장 카드 크기/터치 영역 보정
- 5장 종장 fusion-card-4, fusion-card-5 CSS 보정
```

### Phase G. QA와 연출 타이밍 조정

상태: 진행 중.

남은 작업:

```txt
- 5장 배열 모바일 실기기 QA
- 5장 카드 터치 영역 확인
- 5장 카드 라벨/카드명 겹침 확인
- 5장 리딩에서 제4장/제5장 제목과 대화창 확인
- 5장 종장 융합 연출 확인
- 5장 AI 응답 길이와 품질 확인
- 후속 대화에서 5장 맥락 유지 확인
```

## 4. 현재 지원 배열법

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

## 5. 현재 추천 로직

```txt
연애 / 인간관계 카테고리
→ 관계의 거울 5장

일 / 돈 카테고리
→ 상황과 조언의 세 문

자유 질문 + 오늘/하루/짧게/한마디/메시지
→ 오늘의 한 장

자유 질문 + 선택/둘 중/할까 말까/이직/퇴사/고백/연락할까/계속할까
→ 선택의 갈림길 5장

자유 질문 + 연애/상대/마음/연락/재회/관계
→ 관계의 거울 5장

자유 질문 + 문제/막힘/불안/고민/어떻게/해결/조언
→ 상황과 조언의 세 문

자유 질문 + 미래/앞으로/흐름/결과/전망
→ 시간의 세 문
```

## 6. 씬별 영향 범위와 현재 상태

### BootScene

상태:

- 변경 거의 없음
- 카드/VFX preload 유지

주의:

- VFX 샘플 갤러리 관련 코드를 되살리지 않는다.

### IntroScene

상태:

- 변경 거의 없음

주의:

- 배열법 구현 때문에 인트로 레이아웃을 수정하지 않는다.

### QuestionScene

상태:

- 추천 배열 표시 UI 구현 완료
- 질문 입력 중 추천 배열 갱신 완료
- 카테고리 변경 시 추천 배열 갱신 완료
- 질문 봉인 시 spreadId 저장 완료

주의:

- 질문 봉인 연출은 유지한다.
- 봉인 버튼 터치가 깨지지 않게 한다.
- 추천 배열 패널이 모바일에서 버튼과 겹치지 않는지 확인한다.

### CardSelectScene

상태:

- spread 기반 카드 수 지원 완료
- spread 기반 카드 라벨 지원 완료
- 1장/3장/5장 배치 함수 구현 완료
- 5장 터치 영역/카드 크기 보정 완료

주의:

- 카드 공개 플립과 VFX는 유지한다.
- 터치 영역은 카드보다 넓게 둔다.
- 5장 실기기 터치 QA가 필요하다.

### ReadingScene

상태:

- spread 기반 챕터 제목 지원 완료
- spread 기반 위치 의미 지원 완료
- 카드 수에 따른 챕터 진행 완료
- 1장/3장/5장 종장 진행 완료

주의:

- 터치 잠금 규칙은 유지한다.
- 대화창 표시 후 3초 뒤 진행 가능 규칙은 유지한다.
- 5장 리딩에서 제4장/제5장 레이아웃 QA가 필요하다.

### ChatScene

상태:

- 후속 대화 payload에 spread 정보 포함 완료
- 카드별 positionMeaning 포함 완료
- chat prompt가 1장/3장/5장 맥락을 유지하도록 수정 완료

주의:

- 입력창 하단 잘림 문제를 다시 만들지 않는다.

## 7. QA 체크리스트

### 공통

```txt
- 화면이 viewport를 꽉 채우는가?
- 상단/하단 빈 띠가 없는가?
- 질문 입력이 되는가?
- 추천 배열이 질문에 맞게 바뀌는가?
- 질문 봉인 버튼이 눌리는가?
- 카드가 공개되는가?
- AI 리딩이 정상 생성되는가?
- 후속 대화가 되는가?
```

### 1장 배열

```txt
- 카드가 중앙에 자연스럽게 배치되는가?
- 한 장 공개 후 리딩으로 이동되는가?
- 한 장만으로 종장이 어색하지 않은가?
- AI 응답이 짧고 명확한가?
```

### 3장 배열

```txt
- 카드 위치와 챕터 제목이 일치하는가?
- 종장 조언이 세 장의 흐름을 묶는가?
- 시간/상황 배열의 위치 의미가 AI 응답에 반영되는가?
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
```

### 터치 잠금

```txt
- 챕터 연출 중 터치해도 넘어가지 않는가?
- 대화창 표시 후 3초 뒤에만 넘어가는가?
- 종장 본문 표시 후 3초 뒤에만 후속 대화로 이동하는가?
```

### AI

```txt
- 카드 위치 의미가 반영되는가?
- 질문과 카드가 연결되는가?
- 카드 간 관계를 종합하는가?
- 확정 예언처럼 말하지 않는가?
- 관계 배열에서 상대 마음을 사실처럼 단정하지 않는가?
- 선택 배열에서 특정 선택을 운명처럼 강요하지 않는가?
- 현실적 조언이 포함되는가?
```

## 8. 다음 권장 작업 순서

```txt
1. 5장 배열 모바일 실기기 QA
2. 5장 CardSelectScene 배치/터치/라벨 미세 조정
3. 5장 ReadingScene 제4장/제5장/종장 레이아웃 미세 조정
4. AI 응답 샘플 확인 후 reading prompt 추가 조정
5. 추천 배열을 사용자가 직접 변경할 수 있는 UI 검토
6. 정방향/역방향 카드 시스템 설계
7. 카드/VFX 로딩 최적화
```

## 9. 하면 안 되는 것

```txt
- 배열법 구현 중 GameConfig 스케일 정책을 바꾸지 않는다.
- UI 위치 문제를 전역 CSS safe-area 수정으로 해결하지 않는다.
- 5장 배열을 새 씬으로 따로 만들지 않는다.
- AI에게 카드 이름만 보내고 position 의미를 생략하지 않는다.
- 카드가 많아졌다고 한 화면에 모든 해석을 한 번에 보여주지 않는다.
- 챕터/종장 터치 잠금 규칙을 제거하지 않는다.
- VFX 갤러리 씬을 되살리지 않는다.
```

## 10. 완료 판단

배열법 시스템 구현 완료로 볼 수 있는 조건:

```txt
- 현재 3장 배열이 데이터 기반으로 동작한다. 완료
- 1장 배열이 정상 동작한다. 완료
- 5장 관계 배열이 정상 동작한다. 구현 완료, 실기기 QA 필요
- 5장 선택 배열이 정상 동작한다. 구현 완료, 실기기 QA 필요
- 카드 위치 의미가 AI 프롬프트에 전달된다. 완료
- AI가 위치 의미와 카드 간 관계를 반영한다. 구현 완료, 품질 QA 필요
- 기존 모바일 전체 화면 채움 정책이 유지된다. 완료
- 기존 인트로/질문 봉인/카드 공개/챕터/종장 흐름이 유지된다. 완료
```

## 11. 다음 확장 후보

현재 배열법 시스템 이후 확장 후보:

```txt
1. 정방향/역방향 카드 시스템
2. 사용자가 추천 배열을 직접 바꾸는 UI
3. 내면의 나침반 5장
4. 월간 흐름 7장
5. 켈틱 크로스 10장
```

정방향/역방향은 실제 타로 느낌을 강화하지만, 카드 이미지 회전, UI 표시, AI 프롬프트 변화가 모두 필요하므로 별도 단계로 진행한다.
