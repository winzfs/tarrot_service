# Arcana Gate / tarrot_service

`tarrot_service`는 신비로운 판타지 게임 속 점술관에 입장해, 사용자가 직접 타로 카드를 뽑고 AI 점술사와 대화하며 해석을 받는 **웹 게임형 타로 서비스**입니다.

이 프로젝트는 단순한 타로 챗봇이 아닙니다.

목표는 사용자가 첫 화면에 들어온 순간부터 다음 감각을 느끼게 하는 것입니다.

> “게임 속 신비한 점술관에 들어온 것 같다.”

## 핵심 방향

- 게임처럼 구성된 타로 카드 경험
- Phaser 기반 카드 선택, 뒤집기, 파티클, RPG 대화창
- Cloudflare Workers AI 기반 AI 점술사
- Gemma 계열 모델을 사용한 타로 해석과 후속 대화
- 타로를 확정적 예언이 아닌 자기성찰 도구로 다루는 안전한 UX

## 기술 스택

```txt
Frontend/Game: Phaser 3 + TypeScript + Vite
Backend/API: Cloudflare Workers
AI: Cloudflare Workers AI
Deploy: Cloudflare Workers Static Assets
```

## 가장 먼저 읽을 문서

개발을 시작하기 전에 반드시 아래 순서대로 문서를 읽습니다.

```txt
docs/00_DEVELOPMENT_PRINCIPLES.md
docs/01_PRODUCT_PLAN.md
docs/02_TECHNICAL_DIRECTION.md
docs/03_IMPLEMENTATION_ROADMAP.md
docs/04_AI_PROMPT_GUIDE.md
```

### 1. 개발 원칙

`docs/00_DEVELOPMENT_PRINCIPLES.md`

프로젝트의 최상위 기준입니다.

모든 UI, 기능, 리팩터링, AI 응답 설계는 이 문서의 원칙을 따릅니다.

핵심 문장:

> 기능보다 먼저 분위기다.

### 2. 제품 기획서

`docs/01_PRODUCT_PLAN.md`

서비스 콘셉트, 사용자 플로우, 화면 구성, MVP 범위를 설명합니다.

### 3. 기술 방향

`docs/02_TECHNICAL_DIRECTION.md`

Phaser, Vite, Cloudflare Workers, Workers AI를 어떻게 나누어 사용할지 설명합니다.

### 4. 구현 로드맵

`docs/03_IMPLEMENTATION_ROADMAP.md`

Phase별 구현 순서와 완료 기준을 정의합니다.

### 5. AI 프롬프트 가이드

`docs/04_AI_PROMPT_GUIDE.md`

Gemma 계열 모델을 신비로운 타로 점술사 NPC처럼 동작시키기 위한 프롬프트 원칙과 응답 형식을 정의합니다.

## 제품 콘셉트

사용자는 신비로운 점술관에 입장합니다.

AI 점술사는 사용자의 질문을 듣고, 사용자가 선택한 타로 카드를 바탕으로 해석을 제공합니다.

기본 흐름:

```txt
인트로 화면
  ↓
질문 입력
  ↓
카드 선택
  ↓
카드 공개
  ↓
AI 리딩
  ↓
후속 대화
```

## MVP 범위

첫 번째 버전은 작게 만들되, 분위기를 강하게 가져갑니다.

필수 기능:

- 시작 화면
- 질문 입력
- 3장 카드 스프레드
- 카드 선택
- 카드 뒤집기 애니메이션
- Workers AI 기반 리딩 생성
- 결과 화면
- 후속 대화
- 모바일 대응

제외 기능:

- 로그인
- 결제
- 복잡한 리딩 기록
- 카드 이미지 대량 에셋
- 관리자 페이지

## 아키텍처

```txt
User Browser
  ↓
Phaser Game Client
  ↓ fetch
Cloudflare Worker API
  ↓ env.AI.run
Cloudflare Workers AI
```

## 추천 디렉터리 구조

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
      ui/
      effects/
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
    tarot/
```

## API 설계

### POST /api/reading

사용자의 질문과 선택된 카드를 바탕으로 타로 리딩을 생성합니다.

### POST /api/chat

리딩 이후 사용자의 후속 질문에 답합니다.

## AI 모델 설정

Cloudflare Workers AI의 Gemma 계열 모델을 사용합니다.

모델명은 코드에 직접 고정하지 않고 `wrangler.jsonc`의 `AI_MODEL` 값으로 관리합니다.

예시:

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

원칙:

- Gemma 계열 모델을 우선 사용합니다.
- 모델명은 언제든 교체 가능해야 합니다.
- 프론트엔드는 모델명을 알 필요가 없습니다.
- 사용 가능한 Gemma2 모델이 명확해지면 설정값만 변경합니다.

## 개발 명령어

패키지 설치:

```bash
npm install
```

로컬 개발:

```bash
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

## 개발 원칙 요약

1. 기능보다 먼저 분위기를 만든다.
2. 단순 HTML 폼 앱처럼 만들지 않는다.
3. AI는 기능이 아니라 점술사 NPC다.
4. 타로는 예언이 아니라 자기성찰 도구다.
5. 모델은 교체 가능하게 만든다.
6. 데이터, 연출, 프롬프트를 분리한다.
7. MVP는 작게 만들되 첫 인상을 강하게 만든다.
8. 모바일을 처음부터 고려한다.

## 타로 해석 원칙

AI는 다음을 지켜야 합니다.

- 미래를 확정적으로 말하지 않습니다.
- 사용자를 겁주지 않습니다.
- 의료, 법률, 투자 판단을 단정하지 않습니다.
- 상대방의 마음을 사실처럼 단정하지 않습니다.
- 카드 상징을 사용자의 질문과 연결합니다.
- 마지막에는 현실적인 조언을 제공합니다.

기본 관점:

> 카드는 미래를 고정하지 않습니다. 카드는 지금의 마음과 상황을 다른 각도에서 바라보게 하는 거울입니다.

## 구현 우선순위

```txt
1. 문서 기준 확정
2. Phaser 기본 화면 구성
3. 카드 데이터와 스프레드 구현
4. 카드 선택과 뒤집기 연출
5. Worker API 구현
6. Workers AI 연결
7. 리딩 결과 UI 구현
8. 후속 대화 구현
9. 모바일 최적화
10. 배포
```

## 현재 상태

현재 저장소는 문서 기준과 초기 프로젝트 세팅을 구성하는 단계입니다.

다음 작업은 `docs/03_IMPLEMENTATION_ROADMAP.md`의 Phase 1부터 진행합니다.

## 최종 목표

이 프로젝트의 최종 목표는 타로 결과를 보여주는 페이지가 아닙니다.

사용자가 짧은 시간 동안이라도 다음 경험을 하게 만드는 것입니다.

> 질문을 품고, 카드를 고르고, 점술사에게 조언을 듣는 작은 판타지 의식.
