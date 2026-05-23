# 05. 현재 구현 상태

이 문서는 `tarrot_service`의 현재 구현 상태를 빠르게 파악하기 위한 문서다.

기준 시점: MVP 기반 구현 완료 후 카드 이미지/모바일 UI 조정 단계.

## 1. 현재 한 줄 상태

**Phaser 기반 게임형 타로 플로우, Cloudflare Workers AI 연동, 실제 78장 카드 이미지 표시, 후속 대화까지 동작하는 MVP 기반이 완성된 상태다.**

## 2. 현재 동작 플로우

```txt
IntroScene
  ↓
QuestionScene
  ↓
CardSelectScene
  ↓
ReadingScene
  ↓
ChatScene
```

### IntroScene

역할:

- 서비스 진입 화면
- `Arcana Gate` 타이틀 표시
- 신비로운 배경, 마법진, 카드 연출
- `운명의 문 열기` 버튼으로 시작

현재 상태:

- 구현 완료
- 모바일에서 더 크게 보이도록 조정 필요 가능

### QuestionScene

역할:

- 사용자의 질문 수집
- 질문 카테고리 선택
- 점술사 안내 대사 제공

현재 상태:

- 구현 완료
- 모바일 터치 영역 개선 완료
- 질문 입력창 크기 조정 이력 있음
- 화면별 여백 QA 필요

### CardSelectScene

역할:

- 과거/현재/미래 3장 카드 선택 및 공개
- 실제 카드 이미지 표시
- 카드 뒤집기/발광/파티클 연출

현재 상태:

- 전체 78장 덱에서 3장 랜덤 추첨
- `images/images.json` 기반 카드 데이터 사용
- `images/*.jpg` 실제 카드 이미지 사용
- 카드 공개 시 180도 중심축 플립처럼 보이도록 scaleX 기반 연출 사용
- 카드 이름은 한글명/영문명을 분리 표시하도록 조정 중

### ReadingScene

역할:

- AI 리딩 로딩
- 카드별 챕터 해석
- 종합 조언 표시

현재 상태:

- `/api/reading` 호출 완료
- `과거의 카드`, `현재의 카드`, `미래의 카드` 챕터 연출 구현
- 카드 한 장 크게 표시 후 터치하면 점술사 해석 표시
- 세 장 이후 종합 조언 표시
- 실제 카드 이미지를 DOM 기반으로 크게 표시
- 카드 아래에 한글명/영문명을 분리 표시하도록 조정 중

### ChatScene

역할:

- 리딩 이후 후속 질문
- 이전 리딩 맥락 기반 점술사 대화

현재 상태:

- `/api/chat` 연동 완료
- 모바일 하단 입력 영역 조정 이력 있음
- 일부 화면에서 하단 잘림 QA 필요

## 3. 카드 데이터와 이미지

카드 데이터 기준 파일:

```txt
images/images.json
```

이미지 위치:

```txt
images/*.jpg
```

프론트 카드 로딩:

```txt
src/tarot/cards.ts
```

현재 방식:

- `images/images.json`에서 카드 메타데이터를 읽는다.
- Vite `import.meta.glob`으로 `images` 폴더의 이미지 URL을 가져온다.
- 각 카드에 `imageFile`, `imageUrl`, `imageKey`, `displayName`을 부여한다.
- `BootScene`에서 Phaser texture로 카드 이미지를 preload한다.
- `CardSelectScene`은 Phaser texture로 카드 이미지를 표시한다.
- `ReadingScene`은 DOM `<img>`로 큰 카드 이미지를 표시한다.

카드명 표시 원칙:

```txt
한글이름
영어이름
카드 이미지
```

또는 해석 화면에서는:

```txt
카드 이미지
한글이름
영어이름
```

## 4. API 상태

### POST /api/reading

역할:

- 사용자 질문, 카테고리, 스프레드, 선택 카드 정보를 받아 AI 리딩 생성

현재 상태:

- 구현 완료
- Cloudflare Workers AI `env.AI.run` 사용
- JSON 파싱 실패 시 fallback 응답 제공
- 질문 기반 해석을 강제하는 프롬프트 적용

### POST /api/chat

역할:

- 기존 리딩 맥락과 대화 기록을 바탕으로 후속 답변 생성

현재 상태:

- 구현 완료
- 점술사 NPC 말투 유지
- 선택 카드 정보를 한글명 우선으로 프롬프트에 포함

## 5. AI 설정

현재 모델 설정:

```txt
@cf/google/gemma-3-12b-it
```

설정 위치:

```txt
wrangler.jsonc
```

원칙:

- 프론트엔드는 모델명을 모른다.
- Worker만 `AI_MODEL`을 읽는다.
- Gemma2 또는 다른 Gemma 계열 모델로 교체할 때는 `wrangler.jsonc`의 `AI_MODEL`만 변경한다.

## 6. 배포 상태

배포 방식:

```txt
Cloudflare Workers + Static Assets
```

배포 명령:

```bash
npm run deploy
```

GitHub Actions:

```txt
.github/workflows/deploy.yml
```

필요 Secret:

```txt
CLOUDFLARE_API_TOKEN
```

현재 배포 관련 이력:

- 처음에는 lockfile 없음, 토큰 없음, 권한 부족 문제가 있었음
- `CLOUDFLARE_API_TOKEN` 등록 후 배포 진행 가능
- Workers AI binding 및 `AI_MODEL` 설정 완료
- 실제 사이트에서 UI와 AI 연결 확인 완료

## 7. 현재 중요한 파일

```txt
src/game/GameConfig.ts
src/game/scenes/BootScene.ts
src/game/scenes/IntroScene.ts
src/game/scenes/QuestionScene.ts
src/game/scenes/CardSelectScene.ts
src/game/scenes/ReadingScene.ts
src/game/scenes/ChatScene.ts
src/tarot/cards.ts
src/tarot/types.ts
src/api/client.ts
worker/index.ts
worker/prompts/reading.ts
worker/prompts/chat.ts
src/styles.css
src/card-name-layout.css
images/images.json
wrangler.jsonc
```

## 8. 현재 UX 원칙

- 모든 화면은 모바일 세로 화면을 먼저 기준으로 본다.
- 터치 영역은 시각 요소보다 넓게 잡는다.
- 카드 공개는 즉시 결과를 보여주지 않고, 기대감을 만든다.
- 해석은 스크롤 긴 글이 아니라 카드별 단계 진행으로 보여준다.
- 종합 조언은 문장 단위로 천천히 보여준다.
- AI는 반드시 사용자의 질문을 중심에 두고 카드 의미를 연결해야 한다.

## 9. 남은 우선 작업

### 1순위: UI 마감

- 카드 선택 화면 카드명 위치 최종 확인
- 해석 화면 카드명 위치 최종 확인
- 모바일 화면별 여백 확인
- 더 물어보기 화면 하단 입력창 잘림 여부 확인

### 2순위: 연출 마감

- 카드 뒤집기 속도 미세 조정
- 챕터 문구 페이드인/상승 타이밍 조정
- 카드 발광/파티클 강도 조정

### 3순위: AI 품질

- 질문 기반 리딩이 충분히 반영되는지 확인
- 카드 일반 의미만 반복하는 응답 줄이기
- 종합 조언을 더 점술사 대사처럼 만들기
- 너무 긴 응답 방지

### 4순위: 확장

- 카드 도감
- 오늘의 한 장
- 사운드 효과
- 배경음
- 공유 이미지
- 리딩 기록

## 10. 작업 시 주의할 점

- `images/images.json`의 카드명과 이미지 파일명은 `src/tarot/cards.ts` 로딩 구조에 직접 영향을 준다.
- 카드 이미지를 DOM과 Phaser 양쪽에서 사용하므로, `imageUrl`과 `imageKey`를 구분해야 한다.
- CSS override는 `src/card-name-layout.css`가 `styles.css` 뒤에 import되어 적용된다.
- 모바일 UI는 실제 기기 캡처 기준으로 조정한다.
- GitHub Actions 자동 실행이 안 될 때는 Actions 탭에서 수동 실행한다.

## 11. 현재 완료 판단

MVP 기반 완료로 볼 수 있는 항목:

- 앱이 배포 환경에서 열린다.
- 사용자가 질문을 입력할 수 있다.
- 실제 카드 이미지가 나온다.
- 카드가 공개된다.
- AI 리딩이 생성된다.
- 카드별 해석과 종합 조언이 표시된다.
- 후속 대화가 가능하다.

아직 제품 완성으로 보기 어려운 항목:

- 카드/텍스트 레이아웃 세부 완성도
- 모든 모바일 기기에서 안정적인 여백
- 카드 이미지 로딩 최적화
- 사운드/더 풍부한 몰입 연출
- 응답 품질 장기 안정성
