# 02. 기술 방향

이 문서는 `tarrot_service`의 기술 선택, 아키텍처, 디렉터리 구조, API 설계 방향을 정의한다.

## 1. 기술 선택 요약

```txt
게임 클라이언트: Phaser 3 + TypeScript
번들러: Vite
AI/API 서버: Cloudflare Workers
AI 모델 실행: Cloudflare Workers AI
배포: Cloudflare Workers + Static Assets
상태 저장 MVP: 클라이언트 메모리
상태 저장 확장: Cloudflare KV 또는 D1
```

## 2. 왜 Phaser인가

이 프로젝트는 단순 웹앱이 아니라 게임형 타로 경험을 목표로 한다.

Phaser를 선택하는 이유:

- 카드 뒤집기 애니메이션 구현이 쉽다.
- 파티클, 빛, 트윈, 씬 전환을 자연스럽게 만들 수 있다.
- 모바일 터치 입력을 처리하기 좋다.
- RPG 대화창, 메뉴, 카드 선택 화면을 게임처럼 구성할 수 있다.
- HTML/CSS만으로는 부족한 게임 감성을 만들 수 있다.

## 3. 왜 Cloudflare Workers AI인가

Cloudflare Workers AI를 선택하는 이유:

- 별도 서버 관리가 필요 없다.
- Worker와 AI 호출을 같은 엣지 환경에서 처리할 수 있다.
- API 키를 브라우저에 노출하지 않아도 된다.
- 정적 게임 클라이언트와 API를 한 프로젝트에서 배포할 수 있다.
- 모델 교체가 비교적 쉽다.

## 4. 전체 아키텍처

```txt
사용자 브라우저
  ↓
Phaser 게임 클라이언트
  ↓ fetch
Cloudflare Worker API
  ↓ env.AI.run
Cloudflare Workers AI Gemma 계열 모델
```

## 5. 주요 책임 분리

### Phaser 클라이언트

담당:

- 게임 씬 렌더링
- 입력 처리
- 카드 선택과 뒤집기
- 대화창 표시
- API 요청
- 결과 표시

담당하지 않는 것:

- AI 프롬프트 생성
- 모델 호출
- 보안이 필요한 설정 관리
- 장기 저장소 직접 접근

### Cloudflare Worker

담당:

- 정적 에셋 제공
- API 라우팅
- AI 프롬프트 조립
- Workers AI 호출
- 응답 JSON 정리
- 오류 응답 처리

### Workers AI

담당:

- 타로 리딩 문장 생성
- 후속 대화 답변 생성

## 6. 추천 디렉터리 구조

```txt
tarrot_service/
  docs/
    00_DEVELOPMENT_PRINCIPLES.md
    01_PRODUCT_PLAN.md
    02_TECHNICAL_DIRECTION.md
    03_IMPLEMENTATION_ROADMAP.md
    04_AI_PROMPT_GUIDE.md
  index.html
  package.json
  tsconfig.json
  wrangler.jsonc
  src/
    main.ts
    styles.css
    game/
      GameConfig.ts
      scenes/
        BootScene.ts
        IntroScene.ts
        QuestionScene.ts
        CardSelectScene.ts
        ReadingScene.ts
        ChatScene.ts
      ui/
        DialogueBox.ts
        ArcanaButton.ts
        TarotCardView.ts
      effects/
        particles.ts
        glow.ts
    tarot/
      cards.ts
      spreads.ts
      types.ts
    api/
      client.ts
      types.ts
  worker/
    index.ts
    prompts/
      reading.ts
      chat.ts
    tarot/
      safety.ts
      response.ts
```

## 7. API 설계

### POST /api/reading

사용자가 질문과 선택된 카드를 보내면, AI 리딩을 생성한다.

Request:

```json
{
  "question": "이번 프로젝트는 잘 풀릴까?",
  "spreadId": "past-present-future",
  "cards": [
    {
      "id": "the_moon",
      "name": "The Moon",
      "koreanName": "달",
      "position": "과거",
      "keywords": ["불안", "직감", "숨겨진 진실"]
    }
  ]
}
```

Response:

```json
{
  "title": "달빛 아래 열린 문",
  "summary": "불확실함 속에서도 방향을 찾을 수 있는 시기입니다.",
  "cards": [
    {
      "position": "과거",
      "name": "The Moon",
      "koreanName": "달",
      "reading": "최근 당신은 명확하지 않은 감정과 정보 속에서 움직였습니다."
    }
  ],
  "advice": "큰 결론보다 작은 검증을 먼저 해보세요.",
  "npcLine": "별빛은 희미하지만, 길은 아직 닫히지 않았습니다."
}
```

### POST /api/chat

리딩 결과 이후 사용자의 후속 질문에 답한다.

Request:

```json
{
  "question": "이번 프로젝트는 잘 풀릴까?",
  "readingSummary": "불확실함 속에서도 방향을 찾을 수 있는 시기입니다.",
  "messages": [
    {
      "role": "user",
      "content": "좀 더 현실적인 조언으로 말해줘."
    }
  ]
}
```

Response:

```json
{
  "message": "현실적으로 보면, 지금은 감만 믿기보다 작은 결과물을 먼저 확인하는 것이 좋겠습니다."
}
```

## 8. AI 모델 설정

Cloudflare Workers AI의 모델명은 시점에 따라 바뀔 수 있으므로 코드에 직접 고정하지 않는다.

`wrangler.jsonc`:

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

Worker:

```ts
const model = env.AI_MODEL || "@cf/google/gemma-3-12b-it";
```

원칙:

- Gemma 계열 모델을 우선한다.
- Gemma2 모델명이 명확히 사용 가능해지면 설정값만 바꾼다.
- 프론트엔드는 모델명을 몰라도 된다.

## 9. 응답 파싱 전략

AI는 항상 완벽한 JSON을 반환하지 않을 수 있다.

따라서 Worker에서 다음 처리가 필요하다.

1. JSON 응답 요청
2. 응답 문자열에서 JSON 파싱 시도
3. 실패 시 안전한 fallback 응답 반환
4. 프론트엔드는 fallback도 렌더링 가능해야 함

Fallback 예시:

```json
{
  "title": "별빛이 흐릿한 밤",
  "summary": "지금은 해석을 완전히 정리하기 어려운 흐름입니다.",
  "cards": [],
  "advice": "잠시 후 다시 시도하거나 질문을 조금 더 구체적으로 적어보세요.",
  "npcLine": "안개가 잠시 짙어졌습니다. 그러나 문은 다시 열릴 것입니다."
}
```

## 10. 성능 원칙

- 첫 화면 로딩은 가볍게 유지한다.
- 대형 이미지 에셋은 MVP에서 사용하지 않는다.
- 카드 이미지는 초기에는 Phaser 그래픽으로 그리거나 CSS/Canvas 기반 카드로 처리한다.
- AI 호출 중에는 로딩 연출을 보여준다.
- 네트워크 실패 시 게임이 멈추지 않게 한다.

## 11. 배포 전략

개발:

```bash
npm install
npm run dev
```

빌드:

```bash
npm run build
```

배포:

```bash
npm run deploy
```

Cloudflare 인증과 계정 설정은 Wrangler를 통해 처리한다.

## 12. 확장 저장소 전략

MVP에서는 저장소를 사용하지 않는다.

추후 확장 시:

### KV

- 짧은 리딩 세션 저장
- 공유용 리딩 결과 저장
- 간단한 설정 저장

### D1

- 사용자별 리딩 기록
- 통계
- 카드별 사용량
- 유료 기능 확장

## 13. 보안 원칙

- AI 호출은 반드시 Worker에서만 수행한다.
- 브라우저에 모델 설정이나 민감한 값을 직접 노출하지 않는다.
- 사용자 입력은 길이 제한을 둔다.
- AI 응답은 HTML로 직접 삽입하지 않는다.
- 텍스트는 안전하게 렌더링한다.

## 14. 개발 순서

1. 문서 작성
2. 프로젝트 기본 세팅
3. Phaser 기본 씬 구성
4. 타로 카드 데이터 작성
5. 카드 선택 UI 구현
6. Worker API 구현
7. Workers AI 연결
8. 리딩 결과 UI 구현
9. 후속 대화 구현
10. 모바일 최적화
11. 배포
