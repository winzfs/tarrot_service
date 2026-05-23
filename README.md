# Arcana Gate / tarrot_service

`tarrot_service`는 신비로운 판타지 게임 속 점술관에 입장해, 사용자가 직접 타로 카드를 뽑고 Cloudflare Workers AI 기반 점술사 NPC에게 해석과 후속 대화를 받는 **웹 게임형 타로 서비스**입니다.

이 프로젝트는 단순한 타로 챗봇이 아닙니다.

> 질문을 품고, 카드를 고르고, 점술사에게 조언을 듣는 작은 판타지 의식.

## 현재 상태

현재 MVP 기반은 구현되어 실제 Cloudflare Workers 배포 환경에서 동작합니다.

완료된 것:

- Phaser 3 + TypeScript + Vite 기반 게임 클라이언트
- Cloudflare Worker Static Assets 배포 구조
- Cloudflare Workers AI binding 연결
- Gemma 계열 모델 기반 `/api/reading`, `/api/chat`
- 인트로 → 질문 입력 → 카드 선택 → 카드 공개 → AI 리딩 → 후속 대화 플로우
- 모바일 세로 화면 기준 1080p 선명도 설정
- 터치 영역 개선
- 카드 뒤집기, 발광, 파티클, 챕터 전환 연출
- `images/images.json` 기반 78장 타로 덱 데이터 로딩
- `images/` 폴더의 실제 카드 이미지 표시
- 카드명 한글/영문 병기
- 카드별 해석 후 종합 조언, 이후 후속 대화

현재 개선 중인 것:

- 카드 이미지/이름 레이아웃 세부 조정
- 모바일 화면별 여백과 텍스트 크기 조정
- 카드 공개/리딩 연출의 완성도 강화
- AI 응답 품질과 안정성 개선

## 핵심 방향

- 게임처럼 구성된 타로 카드 경험
- Phaser 기반 카드 선택, 뒤집기, 발광, 파티클, 챕터 연출
- Cloudflare Workers AI 기반 AI 점술사
- Gemma 계열 모델을 사용한 타로 해석과 후속 대화
- 타로를 확정적 예언이 아닌 자기성찰 도구로 다루는 안전한 UX
- 모바일 우선 세로 화면 설계

## 기술 스택

```txt
Frontend/Game: Phaser 3 + TypeScript + Vite
Backend/API: Cloudflare Workers
AI: Cloudflare Workers AI
Model: @cf/google/gemma-3-12b-it, wrangler.jsonc의 AI_MODEL로 교체 가능
Deploy: Cloudflare Workers Static Assets
Assets: images/images.json + images/*.jpg 카드 이미지
```

## 가장 먼저 읽을 문서

```txt
docs/00_DEVELOPMENT_PRINCIPLES.md
docs/01_PRODUCT_PLAN.md
docs/02_TECHNICAL_DIRECTION.md
docs/03_IMPLEMENTATION_ROADMAP.md
docs/04_AI_PROMPT_GUIDE.md
docs/05_CURRENT_STATUS.md
```

### 1. 개발 원칙

`docs/00_DEVELOPMENT_PRINCIPLES.md`

모든 UI, 기능, 리팩터링, AI 응답 설계의 최상위 기준입니다.

핵심 문장:

> 기능보다 먼저 분위기다.

### 2. 제품 기획서

`docs/01_PRODUCT_PLAN.md`

서비스 콘셉트, 사용자 플로우, 화면 구성, MVP 범위를 설명합니다.

### 3. 기술 방향

`docs/02_TECHNICAL_DIRECTION.md`

Phaser, Vite, Cloudflare Workers, Workers AI, 실제 카드 에셋 구조를 설명합니다.

### 4. 구현 로드맵

`docs/03_IMPLEMENTATION_ROADMAP.md`

완료된 MVP 범위와 다음 개선 단계를 정리합니다.

### 5. AI 프롬프트 가이드

`docs/04_AI_PROMPT_GUIDE.md`

Gemma 계열 모델을 신비로운 타로 점술사 NPC처럼 동작시키기 위한 프롬프트 원칙과 응답 형식을 정의합니다.

### 6. 현재 구현 상태

`docs/05_CURRENT_STATUS.md`

현재 코드 기준의 씬 구성, API, 카드 이미지, 배포 상태, 다음 작업을 한눈에 정리합니다.

## 제품 플로우

```txt
인트로 화면
  ↓
질문의 방
  ↓
카드 선택 / 카드 뒤집기
  ↓
카드별 챕터 해석
  ↓
종합 조언
  ↓
점술사와 후속 대화
```

## 구현된 주요 화면

### 인트로 화면

- `Arcana Gate` 타이틀
- 신비로운 배경과 마법진/카드 연출
- `운명의 문 열기` 버튼

### 질문 입력 화면

- 점술사 NPC 인사
- 질문 카테고리 선택
- 질문 입력창
- 모바일 터치/스크롤 고려

### 카드 선택 화면

- 3장 과거/현재/미래 스프레드
- 전체 78장 덱에서 랜덤 추첨
- 실제 카드 이미지 사용
- 카드 뒤집기, 발광, 파동, 파티클 효과
- 카드명은 한글명과 영어명을 분리해 표시

### 리딩 화면

- 게임 챕터 연출처럼 `과거의 카드`, `현재의 카드`, `미래의 카드` 표시
- 카드 한 장을 크게 보여준 뒤 터치하면 점술사 해석 대화창 표시
- 세 장 이후 종합 조언을 문장 단위로 표시

### 후속 대화 화면

- 리딩 맥락을 유지한 채 `/api/chat` 호출
- 점술사 NPC 말투 유지
- 사용자가 더 물어볼 수 있는 채팅형 화면

## 아키텍처

```txt
User Browser
  ↓
Phaser Game Client
  ↓ fetch
Cloudflare Worker API
  ↓ env.AI.run
Cloudflare Workers AI Gemma model
```

## 디렉터리 구조

```txt
tarrot_service/
  docs/
    00_DEVELOPMENT_PRINCIPLES.md
    01_PRODUCT_PLAN.md
    02_TECHNICAL_DIRECTION.md
    03_IMPLEMENTATION_ROADMAP.md
    04_AI_PROMPT_GUIDE.md
    05_CURRENT_STATUS.md
  images/
    images.json
    *.jpg
  src/
    main.ts
    styles.css
    card-name-layout.css
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
```

## API

### POST `/api/reading`

사용자의 질문과 선택된 3장의 카드를 바탕으로 AI 타로 리딩을 생성합니다.

요청 핵심 필드:

```json
{
  "category": "love",
  "question": "이 관계를 계속 이어가도 될까?",
  "spreadId": "past-present-future",
  "cards": []
}
```

응답 핵심 필드:

```json
{
  "title": "흐름을 비추는 제목",
  "summary": "전체 흐름 요약",
  "cards": [
    {
      "position": "과거",
      "name": "Five of Pentacles",
      "koreanName": "펜타클 5",
      "reading": "질문과 연결된 카드 해석"
    }
  ],
  "advice": "현실적인 종합 조언",
  "npcLine": "점술사 한마디"
}
```

### POST `/api/chat`

리딩 이후 후속 질문에 답합니다.

## AI 모델 설정

Cloudflare Workers AI의 Gemma 계열 모델을 사용합니다.

현재 설정은 `wrangler.jsonc`의 `AI_MODEL`에서 관리합니다.

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

- 모델명은 프론트엔드에 노출하지 않습니다.
- 모델은 설정값으로 교체 가능해야 합니다.
- Gemma2 계열을 직접 사용할 수 있는 환경이 명확해지면 `AI_MODEL`만 바꿉니다.

## 개발 명령어

패키지 설치:

```bash
npm install
```

로컬 개발:

```bash
npm run dev
```

타입 체크:

```bash
npm run typecheck
```

빌드:

```bash
npm run build
```

배포:

```bash
npm run deploy
```

## GitHub Actions 배포

`.github/workflows/deploy.yml`을 통해 main 브랜치 push 또는 수동 실행으로 Cloudflare Workers에 배포합니다.

필요한 GitHub Secrets:

```txt
CLOUDFLARE_API_TOKEN
```

`wrangler.jsonc`에는 현재 `account_id`, `assets`, `AI binding`, `AI_MODEL`이 설정되어 있습니다.

## 개발 원칙 요약

1. 기능보다 먼저 분위기를 만든다.
2. 단순 HTML 폼 앱처럼 만들지 않는다.
3. AI는 기능이 아니라 점술사 NPC다.
4. 타로는 예언이 아니라 자기성찰 도구다.
5. 모델은 교체 가능하게 만든다.
6. 데이터, 연출, 프롬프트를 분리한다.
7. 모바일을 처음부터 고려한다.
8. 카드 이미지는 데이터 기반으로 관리한다.
9. 긴 결과는 단계적으로 보여준다.
10. 배포 가능한 상태를 유지한다.

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

## 다음 작업 후보

```txt
1. 카드명/카드 이미지 레이아웃 최종 정리
2. 모바일 기종별 화면 여백 QA
3. 카드 뒤집기와 챕터 연출 속도 미세 조정
4. AI 응답 품질 개선
5. 카드 이미지 로딩 최적화
6. 사운드 효과 추가
7. 카드 도감 또는 오늘의 한 장 확장
```
