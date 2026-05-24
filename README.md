# Arcana Gate / tarrot_service

`tarrot_service`는 신비로운 판타지 게임 속 점술관에 입장해, 사용자가 질문을 봉인하고 직접 타로 카드를 뽑은 뒤 Cloudflare Workers AI 기반 **점술사 NPC**에게 해석을 받는 **웹 게임형 타로 서비스**입니다.

> 질문을 품고, 점술사의 속삭임으로 질문을 다듬고, 카드를 고르고, 별빛의 기록으로 남기는 작은 판타지 의식.

## 현재 상태

현재 MVP 기반은 구현되어 실제 Cloudflare Workers 배포 환경에서 동작합니다.

완료된 것:

- Phaser 3 + TypeScript + Vite 기반 게임 클라이언트
- Cloudflare Worker Static Assets 배포 구조
- Cloudflare Workers AI binding 연결
- Gemma 계열 모델 기반 `/api/question-assist`, `/api/spread-recommendation`, `/api/reading`
- 인트로 → 질문 입력 → 점술사 질문 보조 → 배열 추천 → 질문 봉인 → 카드 선택 → 카드 공개 → 챕터 해석 → 종장 해석 → 요약/공유 화면 플로우
- 모바일 세로 화면 기준 1080p 선명도 설정
- 모바일 화면을 빈 띠 없이 채우는 Phaser `ENVELOP` 스케일 기준
- 터치 영역 개선 및 리딩 화면 전체 터치 진행 처리
- 카드 뒤집기, 확대 공개, 봉인 해제 문구, 발광, 파티클, 챕터 전환, 종장 융합 연출
- `images/images.json` 기반 78장 타로 덱 데이터 로딩
- `images/` 폴더의 실제 카드 앞면 이미지 표시
- `images/back.png` 기반 카드 뒷면 이미지 표시
- 데이터 기반 배열법 시스템
- 1장/3장/5장 배열 지원
- 기존 카테고리 선택 제거 후, 질문 문맥 기반 점술사 보조/추천 흐름으로 전환
- 질문 보조 화면에서 점술사가 추가 질문과 선택지를 제공하고, 사용자는 최대 2회 선택해 질문을 다듬음
- 배열 추천 화면에서 점술사 추천 배열을 먼저 표시한 뒤 다른 배열 버튼과 질문 봉인 버튼을 순차적으로 제공
- 점술사 추천 실패 시 기존 룰 기반 추천으로 fallback
- 카드별 챕터 해석은 점술사가 3문장 이내로 요약 생성
- 종장 해석은 카드 융합 연출 이후 표시
- 마지막 후속 대화 화면 제거 후, 내 질문/선택 카드/요약을 카드 형태로 보여주는 요약·공유 화면으로 전환
- 요약 화면에서 텍스트 복사, 공유하기, 이미지 저장, 새 질문 기능 제공
- 이미지 저장 시 카드 이미지, 질문, 선택 카드, 요약을 포함한 PNG 생성
- 저장 이미지 파일명은 `arcana-reading-summary-YYYYMMDD-HHMMSS.png` 형식으로 매번 다르게 생성
- 인트로 타이틀 이미지는 `public/img/title.png`를 `SCREEN` 블렌드 모드로 표시
- 모든 사용자 노출 문구에서 AI 표현을 점술사 표현으로 정리

현재 개선 중인 것:

- 모바일 기종별 여백과 터치 QA
- 인트로 타이틀/버튼/별가루 연출 미세 조정
- 질문 보조와 배열 추천 응답 품질 확인
- 5장 배열 카드 선택/리딩/종장 화면 QA
- 요약 화면과 저장 이미지의 글래스 효과/여백/폰트 미세 조정
- 카드 공개/리딩 연출의 완성도 강화

## 핵심 방향

- 게임처럼 구성된 타로 카드 경험
- Phaser 기반 카드 선택, 뒤집기, 발광, 파티클, 챕터 연출
- Cloudflare Workers AI 기반 점술사 NPC
- 점술사는 리딩뿐 아니라 질문 보조와 질문 문맥 기반 배열 추천에도 사용
- Gemma 계열 모델을 사용한 타로 해석
- 타로를 확정적 예언이 아닌 자기성찰 도구로 다루는 안전한 UX
- 모바일 우선 세로 화면 설계
- 게임 화면은 viewport를 무조건 덮고, UI를 그 기준에 맞춰 조정
- 배열법이 늘어나도 질문 봉인, 카드 공개, 챕터 해석, 종장 종합의 공통 의식 흐름을 유지
- 점술사는 카드명뿐 아니라 질문 맥락, 배열법, 카드 위치 의미, 카드 간 관계를 함께 해석
- 결과는 긴 대화가 아니라 저장/공유 가능한 요약 카드로 마무리

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

## 질문 보조 방식

현재 질문 보조 흐름:

```txt
질문 입력
  ↓
점술사 질문 보조 화면
  ↓
/api/question-assist 호출
  ↓
점술사가 질문의 기운과 추가 질문, 선택지를 제안
  ↓
사용자는 선택지를 최대 2회 눌러 질문을 구체화
  ↓
배열 추천 화면으로 이동
```

정책:

```txt
- 카테고리 선택은 사용하지 않는다.
- 사용자가 질문을 어떻게 해야 할지 몰라도 점술사가 맥락을 읽고 보조한다.
- 보조 선택은 최대 2회로 제한해 흐름을 빠르게 유지한다.
- 최소 1회 이상 보조 선택 후 배열 추천 화면으로 이동할 수 있다.
```

## 배열 추천 방식

현재 추천 흐름:

```txt
질문 입력 + 질문 보조 완료
  ↓
배열 추천 화면 진입
  ↓
점술사가 질문 전체의 맥락을 읽는 중 표시
  ↓
0.72초 후 /api/spread-recommendation 호출
  ↓
점술사가 질문에 어울리는 배열 선택
  ↓
추천 배열, 읽힌 기운, 다듬은 질문, 위치, 추천 이유 표시
  ↓
추천 배열이 나타난 뒤 다른 배열 버튼 표시
  ↓
그 뒤 질문 봉인 버튼 표시
```

수동 선택 정책:

```txt
사용자가 다른 배열 버튼을 직접 누름
→ 점술사 자동 추천보다 수동 선택 우선
→ 직접 선택한 배열 유지
```

Fallback:

```txt
점술사 추천 실패 또는 응답 이상
→ 기존 룰 기반 추천 사용
```

## 기술 스택

```txt
Frontend/Game: Phaser 3 + TypeScript + Vite
Backend/API: Cloudflare Workers
AI: Cloudflare Workers AI
Model: @cf/google/gemma-3-12b-it, wrangler.jsonc의 AI_MODEL로 교체 가능
Deploy: Cloudflare Workers Static Assets
Assets: images/images.json + images/*.jpg 카드 이미지 + images/back.png 카드 뒷면 + public/img/title.png 인트로 타이틀 + vfx/* 연출 이미지
```

## 주요 API

### POST `/api/question-assist`

사용자의 질문을 읽고 질문을 더 구체화할 수 있는 추가 질문과 선택지를 제공합니다.

반환 예시:

```json
{
  "guidance": "질문에는 관계의 흐름과 상대의 거리감에 대한 기운이 함께 보입니다.",
  "followUpQuestion": "카드가 어떤 방향을 더 비춰주면 좋을까요?",
  "assistOptions": [
    {
      "label": "앞으로의 흐름",
      "appendText": "앞으로 이 관계가 어떤 방향으로 흘러갈지도 알고 싶어."
    }
  ]
}
```

### POST `/api/spread-recommendation`

사용자의 질문을 보고 가장 어울리는 배열법 하나를 추천합니다.

반환 예시:

```json
{
  "spreadId": "relationship-mirror-five",
  "reason": "관계의 흐름과 막고 있는 요소를 함께 보는 것이 어울립니다.",
  "refinedQuestion": "요즘 연락이 뜸한 관계가 앞으로 어떻게 흘러갈지 알고 싶다.",
  "detectedThemes": ["관계", "거리감", "앞으로의 흐름"]
}
```

### POST `/api/reading`

사용자의 질문, 배열법, 카드 위치 의미, 선택된 카드를 바탕으로 점술사 타로 리딩을 생성합니다.

## 제품 플로우

```txt
인트로 화면
  ↓
질문 입력
  ↓
점술사 질문 보조
  ↓
점술사 배열 추천 또는 직접 배열 선택
  ↓
질문 봉인 연출
  ↓
카드 선택 / 카드 뒤집기 / 확대 공개
  ↓
카드별 챕터 해석
  ↓
종장 종합 조언
  ↓
별빛의 기록 요약/공유 화면
```

## 요약/공유 화면

현재 요약 화면은 마지막 결과 화면 역할을 합니다.

```txt
표시 정보:
- 내 질문
- 선택 카드 목록
- 카드별 1문장 요약
- 전체 요약

제공 기능:
- 공유하기
- 이미지 저장
- 텍스트 복사
- 새 질문
```

이미지 저장 규칙:

```txt
- 저장 이미지는 실제 요약 화면의 카드형 디자인과 최대한 맞춘다.
- 글래스 효과, 내부 라인, 금색/보라색 glow를 캔버스에 직접 그린다.
- 큰 제목은 한 줄로 고정하며, 길면 폰트를 줄여 맞춘다.
- 파일명은 arcana-reading-summary-YYYYMMDD-HHMMSS.png 형식으로 생성한다.
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
11. 결과는 저장/공유 가능한 형태로 정리한다.
12. 배포 가능한 상태를 유지한다.

## 다음 작업 후보

```txt
1. npm run typecheck / npm run build로 최근 UI/문구 변경 타입 점검
2. 모바일 실기기에서 인트로 타이틀/버튼/별가루 연출 확인
3. 점술사 질문 보조 응답 품질 QA
4. /api/spread-recommendation 실제 응답 QA
5. 5장 배열 모바일 실기기 QA
6. 요약 화면과 이미지 저장 결과의 레이아웃/글래스 효과 비교 QA
7. 카드 이미지/VFX 로딩 최적화
```
