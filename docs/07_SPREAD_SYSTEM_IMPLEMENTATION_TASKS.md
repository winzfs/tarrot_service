# 07. 배열법 시스템 구현 작업 목록

이 문서는 `06_READING_FLOW_AND_SPREAD_SYSTEM.md`에서 정의한 공통 리딩 흐름을 실제 코드로 확장하기 위한 구현 작업 목록이다.

목표는 단순히 카드 수를 늘리는 것이 아니다.

> 현재 과거/현재/미래 3장 리딩을 데이터 기반 배열법 시스템으로 바꾸고, 이후 1장/3장/5장 배열을 같은 흐름으로 확장 가능하게 만든다.

## 1. 최종 목표

구현 완료 후 구조는 다음을 만족해야 한다.

```txt
질문 카테고리
  ↓
추천 배열법 선택 또는 자동 선택
  ↓
spread 데이터 기반 카드 수/위치 결정
  ↓
카드 선택 화면에서 spread.positions 기반 배치
  ↓
리딩 화면에서 spread.positions 기반 챕터 생성
  ↓
AI 프롬프트에 position 의미 전달
  ↓
종장에서 카드 간 관계와 전체 흐름 해석
```

## 2. 구현 원칙

- 게임 화면 전체 채움 정책은 건드리지 않는다.
- `GameConfig.ts`의 스케일 정책은 배열법 구현 작업에서 변경하지 않는다.
- 기존 인트로, 질문 봉인, 카드 공개, 챕터, 종장 흐름은 유지한다.
- 새 배열법은 새 씬을 만들기보다 기존 씬을 데이터 기반으로 확장한다.
- 처음부터 켈틱 크로스 10장까지 구현하지 않는다.
- 우선 1장/3장/5장 배열까지만 안정적으로 지원한다.
- AI는 반드시 카드 위치 의미를 알고 해석해야 한다.
- 해석은 확정 예언이 아니라 가능성과 현실적 조언으로 정리한다.

## 3. 구현 단계 요약

```txt
Phase A. spread 데이터 구조 정리
Phase B. 현재 3장 배열을 spread 기반으로 리팩터링
Phase C. API payload에 spread/position 의미 추가
Phase D. AI 프롬프트 개선
Phase E. 1장 배열 추가
Phase F. 5장 배열 추가
Phase G. QA와 연출 타이밍 조정
```

## 4. Phase A. spread 데이터 구조 정리

### 목표

현재 하드코딩된 과거/현재/미래 구조를 데이터로 옮긴다.

### 대상 파일

```txt
src/tarot/spreads.ts
src/tarot/types.ts
src/game/state/ReadingDraft.ts
```

### 추가할 타입

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
  layoutHint?: {
    x: number;
    y: number;
  };
};
```

### 우선 정의할 spread

```txt
past-present-future
- 이름: 시간의 세 문
- 카드 수: 3
- 위치: 과거 / 현재 / 미래
```

### 완료 기준

- `spreads.ts`에서 `past-present-future`를 데이터로 조회할 수 있다.
- spread의 positions에 label, chapterTitle, shortMeaning, promptMeaning이 모두 있다.
- 현재 3장 리딩에 필요한 문구가 더 이상 여러 씬에 분산되지 않는다.

## 5. Phase B. 현재 3장 배열을 spread 기반으로 리팩터링

### 목표

현재 구현을 망가뜨리지 않고, 기존 3장 흐름을 spread 데이터로 동작하게 바꾼다.

### 대상 파일

```txt
src/game/scenes/CardSelectScene.ts
src/game/scenes/ReadingScene.ts
src/tarot/cards.ts
src/tarot/spreads.ts
src/tarot/types.ts
```

### CardSelectScene 수정

현재:

```txt
positions = ["과거", "현재", "미래"]
카드 수 3장 고정
좌표 3장 기준 고정
```

변경:

```txt
spread.positions 기준으로 카드 수 결정
spread.positions[index].label을 위치 라벨로 사용
spread.positions[index].layoutHint가 있으면 배치에 사용
없으면 카드 수별 기본 배치 사용
```

### ReadingScene 수정

현재:

```txt
chapterTitles 배열 하드코딩
chapterWhispers 배열 하드코딩
3장 기준 currentStep 처리
```

변경:

```txt
spread.positions[index].chapterTitle 사용
spread.positions[index].shortMeaning 사용
spread.positions[index].promptMeaning은 API 전달용으로 사용
카드 수는 stepCards.length 기준 유지
```

### 완료 기준

- 기존 과거/현재/미래 리딩이 시각적으로 거의 동일하게 동작한다.
- 카드 수와 챕터 제목이 spread 데이터에서 나온다.
- 기존 터치 잠금, 자동 대화창 표시, 종장 진행이 깨지지 않는다.

## 6. Phase C. API payload에 spread 정보 추가

### 목표

AI가 단순히 `과거`, `현재`, `미래`라는 label만 받는 것이 아니라, 각 위치가 어떤 의미인지 알게 한다.

### 대상 파일

```txt
src/api/types.ts
src/api/client.ts
worker/index.ts
worker/prompts/reading.ts
worker/prompts/chat.ts
```

### 요청 payload 확장

현재 카드 정보에 추가할 필드:

```ts
{
  position: string;
  positionId: string;
  positionMeaning: string;
  spreadId: string;
  spreadName: string;
}
```

권장 request 형태:

```json
{
  "category": "love",
  "question": "이 관계를 계속 이어가도 될까?",
  "spreadId": "past-present-future",
  "spreadName": "시간의 세 문",
  "cards": [
    {
      "id": "the_moon",
      "name": "The Moon",
      "koreanName": "달",
      "position": "과거",
      "positionId": "past",
      "positionMeaning": "현재 질문에 영향을 준 이전 흐름과 감정적 배경",
      "keywords": ["불안", "직감", "숨겨진 감정"]
    }
  ]
}
```

### 완료 기준

- Worker가 spreadName과 positionMeaning을 받는다.
- 프롬프트에 위치 의미가 포함된다.
- fallback 응답도 기존 화면에서 깨지지 않는다.

## 7. Phase D. AI 프롬프트 개선

### 목표

AI 해석을 실제 타로 리딩에 가깝게 만든다.

### 대상 파일

```txt
worker/prompts/reading.ts
worker/prompts/chat.ts
```

### reading 프롬프트에 추가할 규칙

```txt
각 카드 해석 순서:
1. 카드가 놓인 위치를 말한다.
2. 그 위치가 질문에서 뜻하는 바를 설명한다.
3. 카드의 상징을 설명한다.
4. 질문과 연결해 해석한다.
5. 지나치게 확정적으로 말하지 않는다.
6. 현실적인 태도나 다음 행동을 제안한다.
```

### 종장 조언 규칙

```txt
종합 조언은 다음을 포함한다.
- 카드들의 전체 흐름
- 반복되는 분위기나 수트/상징
- 카드 간 관계
- 사용자의 질문에 대한 가능성의 방향
- 지금 할 수 있는 현실적 조언
```

### chat 프롬프트에 추가할 정보

후속 대화에서도 다음 정보를 유지한다.

```txt
- spreadName
- 각 카드 position
- positionMeaning
- 카드별 reading
- 전체 advice
```

### 완료 기준

- AI가 카드 일반 의미만 말하지 않는다.
- 위치 의미와 질문을 연결한다.
- 종합 조언이 카드 간 관계를 언급한다.
- 후속 대화에서도 배열 맥락이 유지된다.

## 8. Phase E. 1장 배열 추가

### 목표

가벼운 리딩을 지원한다.

### spread 후보

```txt
id: daily-one-card
name: 오늘의 한 장
cardsToDraw: 1
positions:
  - 오늘의 메시지
```

### 필요한 작업

- `spreads.ts`에 1장 배열 추가
- CardSelectScene에서 1장 중앙 배치 지원
- ReadingScene에서 1개 챕터 후 바로 종장으로 이동 지원
- 종장에서는 1장의 핵심 메시지를 짧게 정리

### 완료 기준

- 1장 배열에서도 카드 공개, 챕터, 종장이 자연스럽게 이어진다.
- UI가 너무 비어 보이지 않는다.

## 9. Phase F. 5장 배열 추가

### 목표

실제 타로 상담 느낌을 강화한다.

### 우선 후보 1: 관계의 거울

```txt
id: relationship-mirror
name: 관계의 거울
cardsToDraw: 5
positions:
  1. 나의 마음
  2. 상대의 마음
  3. 관계의 현재
  4. 막고 있는 것
  5. 조언
```

### 우선 후보 2: 선택의 갈림길

```txt
id: choice-crossroad
name: 선택의 갈림길
cardsToDraw: 5
positions:
  1. 선택 A의 흐름
  2. 선택 B의 흐름
  3. 숨은 변수
  4. 내가 진짜 원하는 것
  5. 조언
```

### 필요한 작업

- 5장 카드 배치 좌표 정의
- 카드 크기와 터치 영역 조정
- CardSelectScene이 5장 배열을 지원
- ReadingScene은 5개 챕터를 지원
- 종장 조언은 카드 간 관계를 더 명확히 해석

### 완료 기준

- 5장 카드가 모바일 화면에서 겹치지 않는다.
- 카드 공개가 한 장씩 안정적으로 가능하다.
- 챕터 수가 늘어나도 사용자가 흐름을 잃지 않는다.
- 종장 조언이 5장 전체를 하나의 흐름으로 묶는다.

## 10. Phase G. 정방향/역방향 추가

이 단계는 1장/3장/5장 배열이 안정화된 뒤 진행한다.

### 목표

실제 타로 리딩 느낌을 강화한다.

### 추가 필드

```ts
orientation: "upright" | "reversed";
```

### UI 규칙

```txt
정방향: 카드 정상 표시
역방향: 카드 이미지 180도 회전
카드명 주변에 역방향 표시
```

### AI 해석 규칙

```txt
정방향:
- 카드의 에너지가 비교적 자연스럽게 드러남

역방향:
- 카드의 에너지가 막힘, 지연, 내면화, 왜곡으로 드러남
- 나쁜 카드로 단정하지 않음
```

### 완료 기준

- 역방향 카드가 UI에서 명확히 보인다.
- AI가 역방향을 과도하게 부정적으로 해석하지 않는다.

## 11. 씬별 영향 범위

### BootScene

예상 변경:

- 대부분 변경 없음
- 카드/VFX preload 유지

주의:

- VFX 샘플 갤러리 관련 코드를 되살리지 않는다.

### IntroScene

예상 변경:

- 대부분 변경 없음

주의:

- 배열법 구현 때문에 인트로 레이아웃을 수정하지 않는다.

### QuestionScene

예상 변경:

- spread 선택 UI 또는 추천 UI 추가 가능
- 질문 카테고리에 따라 기본 spread 선택 가능

주의:

- 질문 봉인 연출은 유지한다.
- 봉인 버튼 터치가 깨지지 않게 한다.

### CardSelectScene

예상 변경 큼.

작업:

- spread 기반 카드 수
- spread 기반 카드 라벨
- 카드 수별 배치 함수
- 1장/3장/5장 지원

주의:

- 카드 공개 플립과 VFX는 유지한다.
- 터치 영역은 카드보다 넓게 둔다.

### ReadingScene

예상 변경 큼.

작업:

- spread 기반 챕터 제목
- spread 기반 위치 의미
- 카드 수에 따른 챕터 진행
- 종장 조언에서 전체 카드 관계 표시

주의:

- 터치 잠금 규칙은 유지한다.
- 대화창 표시 후 3초 뒤 진행 가능 규칙은 유지한다.

### ChatScene

예상 변경 중간.

작업:

- 후속 대화 payload에 spread 정보 포함
- 카드별 positionMeaning 포함

주의:

- 입력창 하단 잘림 문제를 다시 만들지 않는다.

## 12. QA 체크리스트

### 공통

```txt
- 화면이 viewport를 꽉 채우는가?
- 상단/하단 빈 띠가 없는가?
- 질문 입력이 되는가?
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
```

### 3장 배열

```txt
- 기존 과거/현재/미래 흐름이 깨지지 않았는가?
- 카드 위치와 챕터 제목이 일치하는가?
- 종장 조언이 세 장의 흐름을 묶는가?
```

### 5장 배열

```txt
- 카드가 서로 겹치지 않는가?
- 터치 영역이 정확한가?
- 다섯 장 공개 후 리딩으로 이동하는가?
- 다섯 개 챕터가 순서대로 진행되는가?
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
- 현실적 조언이 포함되는가?
```

## 13. 권장 작업 순서

가장 안전한 순서:

```txt
1. spread 타입과 데이터 추가
2. 기존 3장 배열을 spread 데이터 기반으로만 교체
3. 화면이 기존과 동일하게 보이는지 QA
4. API payload에 positionMeaning 추가
5. 프롬프트에 positionMeaning 반영
6. 1장 배열 추가
7. 5장 관계 배열 추가
8. 5장 선택 배열 추가
9. 정방향/역방향 추가
10. 성능/로딩 최적화
```

## 14. 하면 안 되는 것

```txt
- 배열법 구현 중 GameConfig 스케일 정책을 바꾸지 않는다.
- UI 위치 문제를 전역 CSS safe-area 수정으로 해결하지 않는다.
- 5장 배열을 새 씬으로 따로 만들지 않는다.
- AI에게 카드 이름만 보내고 position 의미를 생략하지 않는다.
- 카드가 많아졌다고 한 화면에 모든 해석을 한 번에 보여주지 않는다.
- 챕터/종장 터치 잠금 규칙을 제거하지 않는다.
- VFX 갤러리 씬을 되살리지 않는다.
```

## 15. 완료 판단

배열법 시스템 구현이 완료됐다고 볼 수 있는 조건:

```txt
- 현재 3장 배열이 데이터 기반으로 동작한다.
- 1장 배열이 정상 동작한다.
- 최소 1개의 5장 배열이 정상 동작한다.
- 카드 위치 의미가 AI 프롬프트에 전달된다.
- AI가 위치 의미와 카드 간 관계를 반영한다.
- 기존 모바일 전체 화면 채움 정책이 유지된다.
- 기존 인트로/질문 봉인/카드 공개/챕터/종장 흐름이 유지된다.
```
