# 03. 구현 로드맵

이 문서는 `tarrot_service`를 어떤 순서로 구현할지 정의한다.

원칙은 다음과 같다.

> 먼저 작동하게 만들고, 그다음 분위기를 강화하고, 마지막으로 확장한다.

## Phase 0. 문서와 기준 확정

목표:

- 개발자가 가장 먼저 읽을 문서 세트를 만든다.
- 제품 방향과 기술 방향을 고정한다.

작업:

- `00_DEVELOPMENT_PRINCIPLES.md`
- `01_PRODUCT_PLAN.md`
- `02_TECHNICAL_DIRECTION.md`
- `03_IMPLEMENTATION_ROADMAP.md`
- `04_AI_PROMPT_GUIDE.md`

완료 기준:

- 프로젝트 정체성이 문서로 명확히 설명되어 있다.
- 개발 원칙, 제품 방향, 기술 구조, AI 톤이 정리되어 있다.

## Phase 1. 프로젝트 기본 세팅

목표:

- Cloudflare Workers + Vite + Phaser 기반 프로젝트가 실행된다.

작업:

- `package.json` 작성
- `tsconfig.json` 작성
- `wrangler.jsonc` 작성
- `index.html` 작성
- `src/main.ts` 작성
- 기본 Phaser 게임 생성
- `npm run dev`로 로컬 실행 확인
- `npm run build`로 빌드 확인

완료 기준:

- 브라우저에서 Phaser 캔버스가 뜬다.
- Cloudflare 배포 설정이 준비되어 있다.

## Phase 2. 기본 게임 씬 구성

목표:

- 사용자가 게임 같은 화면 흐름을 경험할 수 있다.

필수 씬:

```txt
BootScene
IntroScene
QuestionScene
CardSelectScene
ReadingScene
ChatScene
```

작업:

### BootScene

- 기본 리소스 준비
- 화면 크기 설정
- 공통 색상과 폰트 기준 설정

### IntroScene

- 타이틀 표시
- 마법진 또는 빛나는 원형 그래픽
- 시작 버튼
- 파티클 배경

### QuestionScene

- 점술사 NPC 대화창
- 질문 입력 UI
- 카테고리 버튼
- 다음 버튼

### CardSelectScene

- 카드 뒷면 표시
- 3장 선택 또는 3장 고정 배치
- hover/touch 효과
- 카드 선택 상태 표시

### ReadingScene

- 카드 뒤집기 연출
- API 호출 로딩 연출
- 리딩 결과 출력

### ChatScene

- 후속 질문 입력
- AI 점술사 답변 출력
- 다시 점치기 버튼

완료 기준:

- API 없이도 전체 화면 흐름이 더미 데이터로 동작한다.

## Phase 3. 타로 데이터 구현

목표:

- 카드 데이터와 스프레드 규칙이 코드로 분리된다.

작업:

- `src/tarot/types.ts`
- `src/tarot/cards.ts`
- `src/tarot/spreads.ts`

초기 카드 범위:

- 메이저 아르카나 22장

카드 데이터 필드:

```ts
export type TarotCard = {
  id: string;
  name: string;
  koreanName: string;
  keywords: string[];
  description: string;
  element?: string;
};
```

스프레드 데이터 필드:

```ts
export type TarotSpread = {
  id: string;
  name: string;
  positions: {
    id: string;
    label: string;
    description: string;
  }[];
};
```

완료 기준:

- 3장 스프레드가 데이터로 정의되어 있다.
- 카드 추첨 로직이 UI와 분리되어 있다.

## Phase 4. 카드 선택과 공개 연출

목표:

- 이 서비스의 핵심인 “카드를 뽑는 느낌”을 만든다.

작업:

- 카드 뒷면 그래픽 구현
- 카드 테두리 금색 장식
- 선택 시 빛 효과
- 카드 뒤집기 트윈
- 카드 이름 표시
- 선택 완료 후 다음 단계 진행

연출 원칙:

- 과하게 빠르지 않게 한다.
- 카드가 뒤집힐 때 기대감이 있어야 한다.
- 모바일 터치에서도 정확히 선택되어야 한다.

완료 기준:

- 사용자가 카드를 직접 선택하고 공개하는 느낌을 받는다.

## Phase 5. Worker API 구현

목표:

- 프론트엔드에서 AI 리딩을 요청할 수 있다.

작업:

- `worker/index.ts`
- `worker/prompts/reading.ts`
- `worker/prompts/chat.ts`
- `worker/tarot/response.ts`
- `/api/reading`
- `/api/chat`

API 원칙:

- Worker에서만 AI를 호출한다.
- 요청 body를 검증한다.
- 입력 길이를 제한한다.
- AI 응답 파싱 실패 시 fallback을 반환한다.

완료 기준:

- `/api/reading`이 구조화된 JSON을 반환한다.
- `/api/chat`이 후속 답변을 반환한다.

## Phase 6. Workers AI 연결

목표:

- Cloudflare Workers AI의 Gemma 계열 모델을 사용한다.

작업:

- `wrangler.jsonc`에 AI binding 설정
- `env.AI.run()` 호출
- `AI_MODEL` 설정값 사용
- 로컬/배포 환경에서 동작 확인

모델 설정 원칙:

```ts
const model = env.AI_MODEL || "@cf/google/gemma-3-12b-it";
```

완료 기준:

- 실제 AI 응답으로 리딩 결과가 생성된다.
- 모델명 교체가 쉬운 구조다.

## Phase 7. 리딩 결과 UI 구현

목표:

- AI 리딩 결과가 게임 UI로 표시된다.

작업:

- 결과 제목 패널
- 카드별 해석 패널
- 종합 조언 패널
- 점술사 NPC 한마디
- 다시 점치기 버튼
- 후속 대화 버튼

UI 원칙:

- 긴 텍스트를 한 번에 던지지 않는다.
- 카드별로 나누어 읽기 쉽게 보여준다.
- NPC 대화창과 정보 패널을 구분한다.

완료 기준:

- 사용자가 결과를 쉽게 읽을 수 있다.
- 게임 분위기가 유지된다.

## Phase 8. 후속 대화 구현

목표:

- 사용자가 리딩 후 추가 질문을 할 수 있다.

작업:

- 대화 입력 UI
- 메시지 리스트
- `/api/chat` 연동
- 로딩 상태 표시
- 대화 종료/다시 점치기 버튼

대화 원칙:

- 리딩 결과 맥락을 유지한다.
- AI는 계속 점술사 NPC 말투를 유지한다.
- 위험하거나 단정적인 조언은 피한다.

완료 기준:

- 사용자가 리딩 결과에 대해 이어서 질문할 수 있다.

## Phase 9. 모바일 최적화

목표:

- 모바일에서도 게임처럼 자연스럽게 사용할 수 있다.

작업:

- 세로 화면 기준 레이아웃
- 카드 크기 조정
- 대화창 하단 배치
- 터치 영역 확대
- 작은 화면에서 텍스트 overflow 처리

완료 기준:

- 스마트폰에서 시작부터 리딩까지 문제없이 진행된다.

## Phase 10. 배포와 QA

목표:

- Cloudflare에 배포 가능한 상태로 만든다.

작업:

- `npm run build` 확인
- `npm run deploy` 확인
- Worker route 확인
- API 오류 확인
- 모바일 브라우저 테스트

QA 체크리스트:

- 첫 화면이 뜨는가?
- 질문 입력이 되는가?
- 카드 선택이 되는가?
- 카드 공개가 되는가?
- AI 결과가 표시되는가?
- 후속 대화가 되는가?
- API 실패 시 fallback이 보이는가?
- 모바일에서 화면이 깨지지 않는가?

## Phase 11. 확장 기능

MVP 이후 후보:

### 콘텐츠 확장

- 오늘의 한 장
- 연애운 스프레드
- 직업운 스프레드
- 선택 비교 스프레드
- 카드 도감

### 몰입감 확장

- 카드 이미지 에셋
- 배경음
- 효과음
- 점술사 캐릭터 일러스트
- 더 풍부한 파티클

### 서비스 확장

- 공유 링크
- 결과 이미지 저장
- 리딩 기록
- 로그인
- 유료 프리미엄 스프레드

## 우선순위 요약

```txt
1. 문서
2. 실행 가능한 게임 앱
3. 카드 선택 경험
4. Workers AI 리딩
5. 결과 UI
6. 후속 대화
7. 모바일 완성도
8. 배포
9. 확장 기능
```

절대 잊지 말 것:

> 기능보다 먼저 분위기다. 이 프로젝트의 첫 번째 품질 기준은 “게임 속 신비한 점술관에 들어온 느낌”이다.
