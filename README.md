# Arcana Gate / tarrot_service

`tarrot_service`는 신비로운 판타지 게임 속 점술관에 입장해, 사용자가 직접 타로 카드를 뽑고 Cloudflare Workers AI 기반 점술사 NPC에게 해석과 후속 대화를 받는 **웹 게임형 타로 서비스**입니다.

> 질문을 품고, 카드를 고르고, 점술사에게 조언을 듣는 작은 판타지 의식.

## 현재 상태

현재 MVP 기반은 구현되어 실제 Cloudflare Workers 배포 환경에서 동작합니다.

완료된 것:

- Phaser 3 + TypeScript + Vite 기반 게임 클라이언트
- Cloudflare Worker Static Assets 배포 구조
- Cloudflare Workers AI binding 연결
- Gemma 계열 모델 기반 `/api/spread-recommendation`, `/api/reading`, `/api/chat`
- 인트로 → 질문 입력 → 추천 배열 → 질문 봉인 → 카드 선택 → 카드 공개 → AI 리딩 → 후속 대화 플로우
- 모바일 세로 화면 기준 1080p 선명도 설정
- 모바일 화면을 빈 띠 없이 채우는 Phaser `ENVELOP` 스케일 기준
- 터치 영역 개선 및 리딩 화면 전체 터치 진행 처리
- 카드 뒤집기, 발광, 파티클, 챕터 전환, 종장 융합 연출
- `images/images.json` 기반 78장 타로 덱 데이터 로딩
- `images/` 폴더의 실제 카드 앞면 이미지 표시
- `images/back.png` 기반 카드 뒷면 이미지 표시
- 데이터 기반 배열법 시스템
- 1장/3장/5장 배열 지원
- 질문 화면의 `점술사가 고른 배열` 표시
- 질문 입력 후 AI 기반 배열 추천
- 사용자가 직접 배열을 바꿀 수 있는 수동 선택 UI
- AI 추천 실패 시 기존 룰 기반 추천으로 fallback
- 질문 화면 하단 UI 가림 완화를 위한 압축 배치
- 카드별 챕터 해석 후 종장 종합 조언, 이후 후속 대화
- 5장 배열용 카드 선택 배치와 종장 융합 연출 보정
- VFX 샘플 갤러리 제거, 실제 게임 연출용 VFX 에셋은 유지

현재 개선 중인 것:

- 모바일 기종별 여백과 터치 QA
- 질문 화면 압축 배치 실기기 확인
- AI 추천 배열 응답 품질 확인
- 5장 배열 카드 선택/리딩/종장 화면 QA
- 카드 공개/리딩 연출의 완성도 강화

## 핵심 방향

- 게임처럼 구성된 타로 카드 경험
- Phaser 기반 카드 선택, 뒤집기, 발광, 파티클, 챕터 연출
- Cloudflare Workers AI 기반 AI 점술사
- AI는 리딩뿐 아니라 질문에 맞는 배열법 추천에도 사용
- Gemma 계열 모델을 사용한 타로 해석과 후속 대화
- 타로를 확정적 예언이 아닌 자기성찰 도구로 다루는 안전한 UX
- 모바일 우선 세로 화면 설계
- 게임 화면은 viewport를 무조건 덮고, UI를 그 기준에 맞춰 조정
- 배열법이 늘어나도 질문 봉인, 카드 공개, 챕터 해석, 종장 종합의 공통 의식 흐름을 유지
- AI는 카드명뿐 아니라 배열법, 카드 위치 의미, 카드 간 관계를 함께 해석

## 지원 배열법

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

## 배열 추천 방식

현재 추천 흐름:

```txt
질문 입력
  ↓
즉시 룰 기반 임시 추천 표시
  ↓
0.72초 후 /api/spread-recommendation 호출
  ↓
AI 점술사가 질문과 카테고리를 보고 배열 선택
  ↓
추천 이유와 함께 화면 갱신
```

수동 선택 정책:

```txt
사용자가 배열 버튼을 직접 누름
→ AI 자동 추천 중단
→ 직접 선택한 배열 유지

카테고리를 바꿈
→ 직접 선택 해제
→ 새 카테고리/질문 기준으로 다시 추천
```

Fallback:

```txt
AI 추천 실패 또는 응답 이상
→ 기존 룰 기반 추천 사용
```

## 기술 스택

```txt
Frontend/Game: Phaser 3 + TypeScript + Vite
Backend/API: Cloudflare Workers
AI: Cloudflare Workers AI
Model: @cf/google/gemma-3-12b-it, wrangler.jsonc의 AI_MODEL로 교체 가능
Deploy: Cloudflare Workers Static Assets
Assets: images/images.json + images/*.jpg 카드 이미지 + images/back.png 카드 뒷면 + vfx/* 연출 이미지
```

## 주요 API

### POST `/api/spread-recommendation`

사용자의 질문과 카테고리를 보고 가장 어울리는 배열법 하나를 추천합니다.

반환:

```json
{
  "spreadId": "relationship-mirror-five",
  "reason": "관계의 흐름과 막고 있는 요소를 함께 보는 것이 어울립니다."
}
```

### POST `/api/reading`

사용자의 질문, 배열법, 카드 위치 의미, 선택된 카드를 바탕으로 AI 타로 리딩을 생성합니다.

### POST `/api/chat`

리딩 이후 후속 질문에 답합니다. 배열법과 카드 위치 의미를 함께 전달해 후속 대화 맥락을 유지합니다.

## 제품 플로우

```txt
인트로 화면
  ↓
질문의 방
  ↓
카테고리/질문 입력
  ↓
AI 추천 배열 표시 또는 직접 배열 선택
  ↓
질문 봉인 연출
  ↓
카드 선택 / 카드 뒤집기
  ↓
카드별 챕터 해석
  ↓
종장 종합 조언
  ↓
점술사와 후속 대화
```

## 주요 문서

```txt
docs/00_DEVELOPMENT_PRINCIPLES.md
docs/01_PRODUCT_PLAN.md
docs/02_TECHNICAL_DIRECTION.md
docs/03_IMPLEMENTATION_ROADMAP.md
docs/04_AI_PROMPT_GUIDE.md
docs/05_CURRENT_STATUS.md
docs/06_READING_FLOW_AND_SPREAD_SYSTEM.md
docs/07_SPREAD_SYSTEM_IMPLEMENTATION_TASKS.md
```

## 개발 명령어

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run deploy
```

## 개발 원칙 요약

1. 기능보다 먼저 분위기를 만든다.
2. 단순 HTML 폼 앱처럼 만들지 않는다.
3. AI는 기능이 아니라 점술사 NPC다.
4. 타로는 예언이 아니라 자기성찰 도구다.
5. 모델은 교체 가능하게 만든다.
6. 데이터, 연출, 프롬프트를 분리한다.
7. 모바일을 처음부터 고려한다.
8. 게임 화면은 viewport 전체를 덮는다.
9. 배열법이 늘어나도 공통 리딩 의식 흐름을 유지한다.
10. 긴 결과는 단계적으로 보여준다.
11. 배포 가능한 상태를 유지한다.

## 다음 작업 후보

```txt
1. npm run typecheck / npm run build로 AI 추천 API 타입 점검
2. 모바일 실기기에서 질문 화면 하단 UI 가림 재확인
3. /api/spread-recommendation 실제 응답 QA
4. 5장 배열 모바일 실기기 QA
5. 5장 리딩 화면 카드명/대화창/종장 레이아웃 미세 조정
6. 정방향/역방향 카드 시스템 설계
7. 카드 이미지/VFX 로딩 최적화
```