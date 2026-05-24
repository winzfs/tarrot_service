# 05. 현재 구현 상태

이 문서는 `tarrot_service`의 현재 구현 상태를 빠르게 파악하기 위한 문서다.

기준 시점: MVP 기반 구현 완료 후 1장/3장/5장 배열법 시스템, AI 기반 배열 추천, 모바일 UI, 리딩 연출, AI 응답 품질을 반복 QA하는 단계.

## 1. 현재 한 줄 상태

**Phaser 기반 게임형 타로 플로우, Cloudflare Workers AI 연동, 실제 78장 카드 이미지와 카드 뒷면/VFX 에셋 표시, 데이터 기반 배열법, AI 기반 배열 추천, 1장/3장/5장 챕터형 리딩과 후속 대화까지 동작하는 MVP 기반이 완성된 상태다.**

## 2. 현재 동작 플로우

```txt
IntroScene
  ↓
QuestionScene
  ↓
질문 카테고리 + 질문 문장 입력
  ↓
즉시 룰 기반 임시 추천
  ↓
/api/spread-recommendation AI 배열 추천
  ↓
사용자 수동 배열 선택 가능
  ↓
CardSelectScene
  ↓
ReadingScene
  ↓
ChatScene
```

## 3. 현재 지원 배열법

배열법 데이터는 다음 파일에서 관리한다.

```txt
src/tarot/spreads.ts
```

현재 지원 배열:

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

추천 방식:

```txt
1. 질문을 입력하면 기존 룰 기반 추천을 즉시 표시한다.
2. 0.72초 뒤 /api/spread-recommendation을 호출한다.
3. Worker AI가 질문과 카테고리를 보고 배열법과 추천 이유를 반환한다.
4. AI 추천이 성공하면 추천 패널을 갱신한다.
5. AI 추천 실패 시 기존 룰 기반 추천을 유지한다.
6. 사용자가 직접 배열 버튼을 누르면 수동 선택이 우선되고 AI 자동 추천은 중단된다.
7. 카테고리를 바꾸면 수동 선택을 해제하고 새 카테고리 기준으로 다시 추천한다.
```

## 4. 씬별 현재 상태

### IntroScene

- 구현 완료
- 실제 카드 뒷면 이미지와 VFX 기반 인트로 연출 유지
- VFX 샘플 갤러리 진입 버튼 제거 완료
- 전체 화면 채움 기준에서 버튼/본문 위치는 모바일 캡처 기준으로 조정 중

### QuestionScene

역할:

- 사용자의 질문 수집
- 질문 카테고리 선택
- 룰 기반 임시 배열 추천
- AI 기반 배열 추천 호출
- 사용자의 수동 배열 선택
- `점술사가 고른 배열` 패널 표시
- 질문 봉인 연출 후 카드 선택으로 이동

현재 상태:

- 구현 완료
- 질문 입력 중 추천 배열 갱신
- 질문 입력 후 0.72초 뒤 AI 추천 호출
- `/api/spread-recommendation` 실패 시 룰 기반 추천 fallback
- 수동 배열 선택 UI 추가: 한 장 / 상황 / 시간 / 관계 / 선택
- 수동 선택 시 AI 자동 추천 중단
- 카테고리 변경 시 수동 선택 해제 후 다시 추천
- 하단 UI 가림 완화를 위해 추천 패널/배열 선택 버튼/봉인 버튼을 압축 배치
- 질문 봉인 시 선택된 배열명/카드 수에 맞는 문구 표시
- 모바일 실기기에서 하단 UI 가림 재확인 필요

### CardSelectScene

현재 상태:

- 전체 78장 덱에서 배열법 카드 수만큼 랜덤 추첨
- 실제 카드 앞면/뒷면 이미지 사용
- 카드 공개 시 중심축 180도 플립처럼 보이도록 scaleX 기반 연출 사용
- 카드 이름은 한글명/영문명을 분리 표시
- 카드 수별 배치 시스템 적용
  - 1장: 중앙 배치
  - 3장: 가로 3장
  - 5장: 위 2장 + 아래 3장
- `spread.positions[].layoutHint`를 카드 배치에 우선 반영
- 5장 배열용 터치 영역과 카드 크기 보정 적용
- 해석 버튼 위치는 모바일 기종별 QA 필요

### ReadingScene

현재 상태:

- `/api/reading` 호출 완료
- 배열법 데이터의 position/chapterTitle/shortMeaning 기반 챕터 표시
- 1장/3장/5장 챕터 진행 지원
- 실제 카드 이미지를 DOM 기반으로 크게 표시
- 카드 아래에 한글명/영문명 분리 표시
- 카드 해석 대화창은 자동 표시 방식
- 챕터/종장 연출 중 터치 잠금
- 대화창 또는 종장 본문 표시 후 3초가 지나야 다음 진행 가능
- 5장 종장 융합용 `fusion-card-4`, `fusion-card-5` 보정 CSS 추가
- 대화창 좌우 폭과 카드/대화창 여백은 모바일 캡처 기준으로 조정 중

### ChatScene

현재 상태:

- `/api/chat` 연동 완료
- 배열법, 카드 위치, 위치 의미, 선택 카드 정보를 후속 대화 프롬프트에 포함
- 1장/3장/5장 모두 후속 대화 맥락 유지 가능
- 일부 화면에서 하단 잘림 QA 필요

## 5. 모바일 화면 기준

현재 기준:

```txt
기본 렌더 가로: 1080
렌더 세로: 기기 viewport 비율 기반 동적 계산
Phaser Scale Mode: ENVELOP
Auto Center: CENTER_BOTH
```

원칙:

- 게임 화면은 viewport를 무조건 덮는다.
- 상단/하단 빈 띠는 허용하지 않는다.
- 화면을 먼저 꽉 채운 뒤, 각 씬 UI를 그 기준에 맞춰 조정한다.
- 화면별 위치 문제를 고치기 위해 `GameConfig.ts`의 스케일 정책을 자주 변경하지 않는다.

주의 이력:

- `FIT` 기반에서는 긴 모바일 화면에서 상단/하단 띠가 생겼다.
- CSS safe-area/fixed/dvh 수정으로 DOM 좌표와 터치가 깨진 이력이 있다.
- 현재는 Phaser `ENVELOP`로 화면을 덮고, UI 배치를 씬/CSS에서 조정하는 방향으로 정리했다.

## 6. 카드 데이터와 이미지

카드 데이터 기준 파일:

```txt
images/images.json
```

이미지 위치:

```txt
images/*.jpg
images/back.png
```

현재 방식:

- `images/images.json`에서 카드 메타데이터를 읽는다.
- Vite `import.meta.glob`으로 `images` 폴더의 이미지 URL을 가져온다.
- `BootScene`에서 Phaser texture로 카드 이미지를 preload한다.
- `CardSelectScene`은 Phaser texture로 카드 이미지를 표시한다.
- `ReadingScene`은 DOM `<img>`로 큰 카드 이미지를 표시한다.
- 카드 뒷면은 `images/back.png`를 사용한다.

## 7. VFX 상태

VFX 에셋 위치:

```txt
vfx/*.png
```

관련 코드:

```txt
src/game/vfx/vfxLibrary.ts
src/game/vfx/vfxEffects.ts
src/fusion-five-layout.css
```

현재 상태:

- VFX 샘플 갤러리 씬은 제거됨
- 실제 게임에서 사용하는 VFX 에셋과 preload는 유지됨
- 인트로, 질문 봉인, 카드 공개, 챕터/종장 연출에 VFX 또는 fallback 그래픽을 사용함
- 5장 배열 종장 융합 연출을 위해 4번째/5번째 카드 애니메이션 override 추가

## 8. API 상태

### POST /api/spread-recommendation

역할:

- 사용자 질문과 카테고리를 받아 가장 어울리는 배열법과 추천 이유를 반환한다.

현재 상태:

- 구현 완료
- `worker/prompts/spread.ts` 사용
- Cloudflare Workers AI `env.AI.run` 사용
- guided_json으로 `spreadId`, `reason` 응답 유도
- 허용된 spreadId만 통과시킴
- 실패 시 `situation-obstacle-advice` fallback 반환

### POST /api/reading

현재 상태:

- 구현 완료
- 질문, 카테고리, 배열법, 카드 위치 의미, 선택 카드 정보를 받아 AI 리딩 생성
- 1장/3장/5장 카드 수별 응답 길이 가이드 적용
- 관계 배열/선택 배열/상황 배열/오늘의 한 장 전용 해석 규칙 적용
- 5장 JSON 응답을 위해 reading `max_tokens`를 2200으로 상향

### POST /api/chat

현재 상태:

- 구현 완료
- 리딩 맥락과 대화 기록을 바탕으로 후속 답변 생성
- 배열법, 카드 위치, positionMeaning, 카드명을 후속 대화 프롬프트에 포함

## 9. 현재 중요한 파일

```txt
src/game/GameConfig.ts
src/game/scenes/QuestionScene.ts
src/game/scenes/CardSelectScene.ts
src/game/scenes/ReadingScene.ts
src/game/scenes/ChatScene.ts
src/tarot/cards.ts
src/tarot/spreads.ts
src/tarot/types.ts
src/api/client.ts
src/api/types.ts
worker/index.ts
worker/prompts/spread.ts
worker/prompts/reading.ts
worker/prompts/chat.ts
worker/response.ts
src/styles.css
src/card-name-layout.css
src/fusion-five-layout.css
src/mobile-viewport-fix.css
images/images.json
images/back.png
vfx/*.png
wrangler.jsonc
```

## 10. 현재 UX 원칙

- 모든 화면은 모바일 세로 화면을 먼저 기준으로 본다.
- 게임 화면은 viewport 전체를 덮는다.
- 터치 영역은 시각 요소보다 넓게 잡는다.
- 배열 추천은 빠른 룰 기반 응답 후 AI 추천으로 보정한다.
- 사용자는 추천 배열을 직접 바꿀 수 있다.
- 카드 공개는 즉시 결과를 보여주지 않고, 기대감을 만든다.
- 해석은 스크롤 긴 글이 아니라 카드별 단계 진행으로 보여준다.
- 챕터/종장 연출 중에는 터치를 잠가 실수로 스킵되지 않게 한다.
- 대화창 또는 본문이 표시된 뒤 3초 후 다음 진행을 허용한다.
- AI는 반드시 사용자의 질문, 배열법, 카드 위치 의미를 중심에 두고 카드 의미를 연결해야 한다.

## 11. 남은 우선 작업

### 1순위: 코드 빌드/타입 점검

- `npm run typecheck`
- `npm run build`
- `/api/spread-recommendation` 실제 응답 확인
- 질문 입력 중 API 404/500이 없는지 확인

### 2순위: 질문 화면 모바일 QA

- 추천 배열 패널이 하단에 가리지 않는지 확인
- 배열 선택 버튼 5개가 모두 보이는지 확인
- 봉인 버튼이 하단 대화창/브라우저 UI에 가리지 않는지 확인
- 키보드가 올라왔을 때 입력창 사용성이 괜찮은지 확인

### 3순위: 5장 배열 모바일 QA

- 5장 카드가 서로 겹치지 않는지 확인
- 5장 카드 터치 영역 확인
- 제4장/제5장 제목과 카드명 겹침 확인
- 5장 종장 융합 연출 확인

### 4순위: AI 품질

- AI 배열 추천이 질문 의도에 맞는지 확인
- 관계 배열에서 상대 마음을 단정하지 않는지 확인
- 선택 배열에서 한쪽을 운명처럼 강요하지 않는지 확인
- 종장 조언이 배열 전체를 종합하는지 확인

## 12. 현재 완료 판단

MVP 기반 완료로 볼 수 있는 항목:

- 앱이 배포 환경에서 열린다.
- 게임 화면이 모바일 viewport를 덮는다.
- 사용자가 질문을 입력할 수 있다.
- AI가 질문에 맞는 배열을 추천할 수 있다.
- 사용자가 배열을 직접 바꿀 수 있다.
- 질문 봉인 연출이 나온다.
- 실제 카드 앞면/뒷면 이미지가 나온다.
- 1장/3장/5장 카드가 공개된다.
- AI 리딩이 생성된다.
- 카드별 해석과 종합 조언이 표시된다.
- 후속 대화가 가능하다.

아직 제품 완성으로 보기 어려운 항목:

- 질문 화면 하단 UI 실기기 QA
- AI 배열 추천 품질 검증
- 5장 배열의 모바일 실기기 QA
- 카드/텍스트 레이아웃 세부 완성도
- 카드 이미지/VFX 로딩 최적화
- 응답 품질 장기 안정성
