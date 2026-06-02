# 03. 구현 로드맵

이 문서는 `tarrot_service`의 구현 단계와 현재 진행 상태를 정의한다.

원칙은 다음과 같다.

> 먼저 작동하게 만들고, 그다음 분위기를 강화하고, 마지막으로 확장한다.

## 현재 상태 요약

현재 프로젝트는 **MVP 기반 구현 완료 후 모바일 UI, 연출 타이밍, AI 품질, SummaryScene 결과 기록을 다듬는 단계**다.

현재 기본 플로우:

```txt
BootScene
  ↓
IntroScene
  ↓
QuestionScene
  ↓
CardSelectScene
  ↓
ReadingScene
  ↓
SummaryScene
```

완료된 큰 범위:

- Phaser + Vite + TypeScript 프로젝트 세팅
- Cloudflare Workers Static Assets 배포 구조
- Cloudflare Workers AI 연결 구조
- 인트로, 질문, 질문 봉인, 카드 선택, 리딩, 결과 요약 씬 구현
- 78장 카드 이미지 기반 덱 구현
- 실제 카드 앞면/뒷면 이미지 적용
- VFX 에셋 기반 연출 적용
- 1장/3장/5장 배열법 시스템 구현
- AI 기반 배열 추천 API 구현
- SummaryScene 공유/이미지 저장/텍스트 복사 구현

현재 보류/제거된 범위:

- `ChatScene`
- `/api/chat`
- `requestChat`
- `ChatMessage`
- chat prompt 기반 후속 대화

후속 질문 기능은 현재 로드맵의 완료 기능이 아니라 **추후 확장 후보**다.

현재 집중할 범위:

- `npm run typecheck` / `npm run build` 통과 확인
- 모바일 전체 화면 채움 기준에서 화면별 UI 배치 마감
- QuestionScene RPG 대화창/배열 프리뷰 QA
- CardSelectScene 1장/3장/5장 배치 QA
- ReadingScene 챕터/종장 연출 타이밍과 터치 잠금 QA
- SummaryScene 공유/이미지 저장/텍스트 복사 QA
- AI 응답 품질 및 Workers AI 상태 점검

## Phase 0. 문서와 기준 확정

상태: 완료, 현재 문서 최신화 진행 중.

작업:

- `00_DEVELOPMENT_PRINCIPLES.md`
- `01_PRODUCT_PLAN.md`
- `02_TECHNICAL_DIRECTION.md`
- `03_IMPLEMENTATION_ROADMAP.md`
- `04_AI_PROMPT_GUIDE.md`
- `05_CURRENT_STATUS.md`
- `06_READING_FLOW_AND_SPREAD_SYSTEM.md`
- `07_SPREAD_SYSTEM_IMPLEMENTATION_TASKS.md`

완료 기준:

- 프로젝트 정체성이 문서로 명확히 설명되어 있다.
- 개발 원칙, 제품 방향, 기술 구조, AI 톤이 정리되어 있다.
- 현재 구현 상태와 다음 작업이 문서화되어 있다.
- 문서의 최종 플로우가 실제 코드의 `SummaryScene` 기준과 일치한다.

## Phase 1. 프로젝트 기본 세팅

상태: 완료.

완료된 작업:

- `package.json`
- `tsconfig.json`
- `wrangler.jsonc`
- `index.html`
- `src/main.ts`
- Phaser 게임 생성
- Vite 개발 서버
- Cloudflare Workers Static Assets 구조
- `npm run build`
- `npm run deploy`

완료 기준:

- 브라우저에서 Phaser 앱이 뜬다.
- Cloudflare Workers로 배포 가능하다.

## Phase 2. 기본 게임 씬 구성

상태: 완료, SummaryScene 기준으로 정리 완료.

현재 구현된 씬:

```txt
BootScene
IntroScene
CardGalleryScene
QuestionScene
CardShuffleScene
CardSelectScene
ReadingScene
SummaryScene
```

현재 제거된 씬:

```txt
ChatScene
```

### BootScene

- 카드 뒷면 이미지 preload
- 전체 타로 카드 이미지 preload
- 게임 내 VFX 이미지 preload
- 이후 IntroScene으로 전환

### IntroScene

- `Arcana Gate` 인트로
- 신비로운 배경과 카드 현현 연출
- 실제 카드 뒷면 이미지 표시
- 시작 버튼
- VFX 샘플 갤러리 버튼은 제거됨

### QuestionScene

- 점술사 NPC 안내
- 질문 입력
- 질문 보조
- 배열 추천
- 사용자의 수동 배열 선택
- 질문 봉인 연출
- 카드 선택 단계로 이동

### CardShuffleScene / CardSelectScene

- 배열법에 맞는 카드 수만큼 카드 선택
- 1장/3장/5장 배열 지원
- 카드 뒷면과 실제 카드 앞면
- 카드 중심축 180도 플립 느낌의 공개 연출
- 발광, 파동, 파티클 연출
- 전체 78장 덱에서 카드 추첨

### ReadingScene

- AI 리딩 로딩
- 카드별 챕터 연출
- 카드 한 장씩 크게 보여주기
- 대화창 자동 표시
- 챕터/종장 연출 중 터치 잠금
- 대화창 또는 종장 본문 표시 후 3초 뒤 터치 진행 가능
- 마지막 종장 종합 조언 표시
- 종장 이후 SummaryScene으로 이동

### SummaryScene

- 별빛의 기록 요약 표시
- 원래 질문, 배열명, 선택 카드, 리딩 요약 표시
- 공유
- 이미지 저장
- 텍스트 복사

## Phase 3. 타로 데이터와 카드 이미지 구현

상태: 완료, 레이아웃 조정 중.

현재 구조:

```txt
images/images.json
images/back.png
images/*.jpg
src/tarot/types.ts
src/tarot/cards.ts
src/tarot/spreads.ts
```

현재 카드 범위:

- 메이저 아르카나 22장
- 마이너 아르카나 56장
- 총 78장

현재 카드 타입 핵심 필드:

```ts
export type TarotCard = {
  id: string;
  arcana: "major" | "minor";
  number: number;
  roman: string;
  name: string;
  koreanName: string;
  displayName: string;
  keywords: string[];
  description: string;
  imageFile: string;
  imageUrl: string;
  imageKey: string;
  suit?: "cups" | "swords" | "wands" | "pentacles";
  visual: {
    symbol: string;
    palette: "neutral" | "bright" | "dark" | "danger" | "hope";
  };
};
```

완료 기준:

- `images/images.json` 기반으로 전체 덱이 구성된다.
- 카드 추첨 로직이 UI와 분리되어 있다.
- Phaser texture와 DOM 이미지 양쪽에서 카드 이미지를 사용할 수 있다.
- 카드 뒷면 이미지는 `images/back.png`로 통일된다.

## Phase 4. 카드 선택과 공개 연출

상태: 구현 완료, 연출 미세 조정 중.

완료된 작업:

- 실제 카드 뒷면 이미지 표시
- 실제 카드 앞면 이미지 표시
- 카드 터치 영역 확대
- 1장/3장/5장 배치 지원
- spread.positions[].layoutHint 기반 배치 지원
- 카드 중심축 기준 180도 플립 느낌의 공개 연출
- 공개 시 흰 빛, 금빛 파동, 보라색 링, 파티클
- 카드명 한글/영문 분리 표시

현재 조정 중:

- 5장 카드 선택 화면 모바일 배치
- 카드 선택 화면에서 카드명 위치
- 카드 이미지 주변 여백
- 공개 연출 속도
- 카드명 가독성
- 하단 해석 버튼 위치

완료 기준:

- 사용자가 카드를 직접 공개하는 의식적 느낌을 받는다.
- 카드 이름과 이미지가 겹치지 않는다.
- 모바일에서 터치가 정확하다.
- 1장/3장/5장 배열 모두 자연스럽게 진행된다.

## Phase 5. Worker API 구현

상태: 완료, AI/배포 QA 필요.

구현 파일:

```txt
worker/entry.ts
worker/index.ts
worker/aiDiagnostics.ts
worker/prompts/questionAssist.ts
worker/prompts/spread.ts
worker/prompts/reading.ts
worker/response.ts
src/api/client.ts
src/api/types.ts
```

구현된 API:

```txt
GET /api/health
GET /api/ai-diagnostics
POST /api/question-assist
POST /api/spread-recommendation
POST /api/reading
```

현재 구현하지 않는 API:

```txt
POST /api/chat
```

API 원칙:

- Worker에서만 AI를 호출한다.
- 요청 body를 검증한다.
- 입력 길이를 제한한다.
- AI 응답 파싱 실패 시 fallback을 반환한다.
- 프론트엔드는 fallback도 렌더링 가능해야 한다.
- 후속 대화 API는 현재 범위에서 제외한다.

완료 기준:

- `/api/question-assist`가 구조화된 JSON을 반환한다.
- `/api/spread-recommendation`이 허용된 spreadId를 반환한다.
- `/api/reading`이 구조화된 JSON을 반환한다.
- `/api/ai-diagnostics`로 Workers AI 상태를 확인할 수 있다.

## Phase 6. Workers AI 연결

상태: 구현 완료, 실제 계정/쿼터/모델 QA 필요.

설정:

```txt
wrangler.jsonc
main: worker/entry.ts
AI binding: AI
AI_MODEL: @cf/google/gemma-4-26b-a4b-it
```

완료된 작업:

- `env.AI.run()` 호출
- `AI_MODEL` 설정값 사용
- 모델 fallback 후보 설정
- `/api/ai-diagnostics` 진단 라우트 추가

완료 기준:

- 실제 AI 응답으로 질문 보조/배열 추천/리딩 결과가 생성된다.
- 모델명 교체가 쉬운 구조다.
- AI 실패 시에도 fallback으로 플로우가 막히지 않는다.

## Phase 7. 리딩 결과 UI 구현

상태: 완료, 레이아웃과 타이밍 조정 중.

현재 방식:

- 긴 결과를 한 화면 스크롤로 보여주지 않는다.
- 카드 한 장을 크게 보여준다.
- 챕터 제목과 카드가 연출로 등장한다.
- 대화창은 연출 후 자동으로 표시된다.
- 대화창 표시 후 3초가 지나야 다음 카드로 넘어갈 수 있다.
- 모든 카드 챕터 이후 종장 화면에서 카드 융합 연출과 종합 조언을 보여준다.
- 종장 본문 표시 후 3초가 지나야 SummaryScene으로 이동할 수 있다.

현재 조정 중:

- 카드 아래 한글명/영문명 배치
- 대화창 좌우 폭과 카드 사이 여백
- 종합 조언 문장 단위 페이드인
- 모바일 화면 하단 힌트 위치
- SummaryScene 진입 직전 마무리 체감

## Phase 8. 결과 요약 / 공유 / 이미지 저장 구현

상태: 완료, 화면 QA 필요.

구현 씬:

```txt
SummaryScene
```

완료된 작업:

- 별빛의 기록 요약 UI
- 원래 질문 표시
- 배열명 표시
- 선택 카드 목록 표시
- 리딩 요약 표시
- 공유 기능
- 텍스트 복사 기능
- 이미지 저장 기능
- 새 질문으로 돌아가기 흐름

현재 조정 중:

- 모바일 버튼 하단 가림 여부
- 공유 미지원 환경의 복사 fallback
- 이미지 저장 시 카드 이미지/텍스트 누락 여부
- 5장 배열 결과가 너무 빽빽하지 않은지 확인

## Phase 9. 모바일 최적화

상태: 진행 중.

완료된 작업:

- 세로 화면 기준 1080p 선명도 설정
- 접속 기기 비율 기반 동적 게임 높이 계산
- Phaser `ENVELOP` 기반 전체 화면 채움
- 터치 영역 확대
- 질문 입력 터치 개선
- 카드 터치 반응 개선
- 리딩 화면 전체 터치 진행
- QuestionScene 하단 RPG 대화창 스킨
- 의식 3/5 카드 프리뷰 보강

남은 작업:

- 다양한 모바일 브라우저에서 여백 확인
- 인트로 화면 버튼/본문 겹침 최종 확인
- 질문창과 선택지 위치 최종 확인
- CardSelectScene 5장 배열 배치 확인
- 카드 해석 화면에서 카드/대화창 겹침 방지
- SummaryScene 하단 버튼 잘림 방지

## Phase 10. VFX와 연출 정리

상태: 진행 중.

완료된 작업:

- `vfx` 폴더 이미지 에셋 추가
- `vfxLibrary.ts`와 `vfxEffects.ts` 기반 연출 함수 구성
- 인트로, 질문 봉인, 카드 공개, 챕터/종장 연출에 VFX 사용
- 연출 샘플 갤러리 씬 및 인트로 진입 버튼 제거
- 실제 게임 VFX preload는 유지

남은 작업:

- 연출별 속도와 강도 QA
- 모바일 성능 확인
- 초기 로딩 최적화 검토

## Phase 11. 배포와 QA

상태: 배포 구조 완료, 반복 QA 중.

배포 방식:

```txt
Cloudflare Workers + Static Assets
GitHub Actions deploy.yml
wrangler.jsonc main: worker/entry.ts
```

이슈 이력:

- lockfile 누락
- Cloudflare token 누락
- API token 권한 부족
- `CLOUDFLARE_ACCOUNT_ID` 관련 인증 문제
- `allTarotCards`, `drawTarotCards` export 누락 빌드 실패
- 모바일 safe-area/CSS 수정으로 DOM 좌표와 터치가 깨진 이력
- 레터박스 제거를 위해 Phaser scale 기준을 `ENVELOP`로 정리
- 미완성 ChatScene 잔재가 typecheck를 깨뜨릴 수 있었던 이력

현재:

- 위 문제들은 정리됨
- 새 변경 후 Actions 결과는 항상 확인해야 함
- 직접 확인 우선순위는 `npm run typecheck` → `npm run build` → 배포 확인

QA 체크리스트:

- 첫 화면이 빈 띠 없이 뜨는가?
- 질문 입력이 되는가?
- 질문 봉인 흐름이 정상 진행되는가?
- 카드 선택이 되는가?
- 실제 카드 이미지와 뒷면 이미지가 표시되는가?
- 카드 공개가 되는가?
- AI 결과 또는 fallback 결과가 질문 기반으로 표시되는가?
- 카드별 해석 단계가 자연스러운가?
- 챕터/종장 연출 중 터치 스킵이 막히는가?
- 대화창/본문 표시 후 3초 뒤 진행 가능한가?
- 종합 조언이 잘 표시되는가?
- SummaryScene으로 정상 이동하는가?
- 공유/텍스트 복사/이미지 저장이 되는가?
- API 실패 시 fallback이 보이는가?
- 모바일에서 화면이 깨지지 않는가?

## Phase 12. 확장 기능

MVP 이후 후보:

### 콘텐츠 확장

- 정방향/역방향 카드 시스템
- 내면의 나침반 5장
- 월간 흐름 7장
- 켈틱 크로스 10장
- 카드 도감

### 몰입감 확장

- 배경음
- 효과음
- 점술사 캐릭터 일러스트
- 더 풍부한 파티클
- 카드별 고유 연출

### 서비스 확장

- 공유 링크
- 리딩 기록
- 로그인
- 유료 프리미엄 스프레드
- 후속 질문용 ChatScene + /api/chat 재도입

## 다음 우선순위

```txt
1. npm run typecheck / npm run build
2. GitHub Actions 배포 결과 확인
3. /api/health, /api/ai-diagnostics 확인
4. IntroScene → QuestionScene → CardSelectScene → ReadingScene → SummaryScene 전체 플로우 QA
5. QuestionScene RPG 대화창/의식 3/5 카드 프리뷰 모바일 QA
6. 5장 배열 CardSelectScene/ReadingScene/SummaryScene QA
7. SummaryScene 공유/텍스트 복사/이미지 저장 QA
8. AI 응답 품질 개선
9. 카드 이미지와 VFX 로딩 최적화
10. 사운드 효과 또는 카드 도감 확장 검토
```

절대 잊지 말 것:

> 기능보다 먼저 분위기다. 이 프로젝트의 첫 번째 품질 기준은 “게임 속 신비한 점술관에 들어온 느낌”이다.
