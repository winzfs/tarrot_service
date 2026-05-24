# 05. 현재 구현 상태

이 문서는 `tarrot_service`의 현재 구현 상태를 빠르게 파악하기 위한 문서다.

기준 시점: MVP 기반 구현 완료 후 1장/3장/5장 배열법 시스템, 모바일 UI, 리딩 연출, AI 응답 품질을 반복 QA하는 단계.

## 1. 현재 한 줄 상태

**Phaser 기반 게임형 타로 플로우, Cloudflare Workers AI 연동, 실제 78장 카드 이미지와 카드 뒷면/VFX 에셋 표시, 데이터 기반 배열법, 1장/3장/5장 챕터형 리딩과 후속 대화까지 동작하는 MVP 기반이 완성된 상태다.**

## 2. 현재 동작 플로우

```txt
IntroScene
  ↓
QuestionScene
  ↓
질문 카테고리 + 질문 문장 기반 배열 추천
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

추천 로직:

```txt
연애 / 인간관계 카테고리
→ 관계의 거울 5장

일 / 돈 카테고리
→ 상황과 조언의 세 문

자유 질문
→ 질문 문장을 분석해 오늘의 한 장, 관계의 거울, 선택의 갈림길, 상황과 조언, 시간의 세 문 중 자동 추천
```

## 4. 씬별 현재 상태

### IntroScene

역할:

- 서비스 진입 화면
- `Arcana Gate` 타이틀 표시
- 신비로운 배경, 카드 현현, VFX 연출
- 실제 카드 뒷면 이미지 표시
- `운명의 문에 손을 얹는다` 버튼으로 시작

현재 상태:

- 구현 완료
- VFX 샘플 갤러리 진입 버튼 제거 완료
- 게임 내 실제 VFX 연출은 유지
- 전체 화면 채움 기준에서 버튼/본문 위치를 모바일 캡처 기준으로 조정 중

### QuestionScene

역할:

- 사용자의 질문 수집
- 질문 카테고리 선택
- 질문 문장 기반 추천 배열 계산
- `점술사가 고른 배열` 패널 표시
- 질문 봉인 연출 후 카드 선택으로 이동

현재 상태:

- 구현 완료
- 카테고리 변경 시 추천 배열 갱신
- 질문 입력 중 추천 배열 갱신
- 자유 질문은 질문 문장에 따라 배열을 자동 추천
- 질문 봉인 시 선택된 배열명/카드 수에 맞는 문구 표시
- 모바일 터치 영역 개선 완료
- 질문 봉인 시 암막 배경, 접힘형 연출, VFX 적용
- 봉인 버튼 위치는 모바일 기종별 QA 필요

### CardSelectScene

역할:

- 선택된 배열법에 필요한 카드 수만큼 카드 선택 및 공개
- 실제 카드 앞면/뒷면 이미지 표시
- 카드 뒤집기/발광/파티클 연출

현재 상태:

- 전체 78장 덱에서 배열법 카드 수만큼 랜덤 추첨
- `images/images.json` 기반 카드 데이터 사용
- `images/*.jpg` 실제 카드 앞면 이미지 사용
- `images/back.png` 실제 카드 뒷면 이미지 사용
- 카드 공개 시 중심축 180도 플립처럼 보이도록 scaleX 기반 연출 사용
- 카드 이름은 한글명/영문명을 분리 표시
- 카드 수별 배치 시스템 적용
  - 1장: 중앙 배치
  - 3장: 가로 3장
  - 5장: 위 2장 + 아래 3장
- 5장 배열용 터치 영역과 카드 크기 보정 적용
- 해석 버튼 위치는 모바일 기종별 QA 필요

### ReadingScene

역할:

- AI 리딩 로딩
- 카드별 챕터 해석
- 종장 종합 조언 표시

현재 상태:

- `/api/reading` 호출 완료
- 배열법 데이터의 position/chapterTitle/shortMeaning 기반 챕터 표시
- 1장/3장/5장 챕터 진행 지원
- 실제 카드 이미지를 DOM 기반으로 크게 표시
- 카드 아래에 한글명/영문명 분리 표시
- 카드 해석 대화창은 자동 표시 방식
- 챕터 화면 진입 후 제목/카드 연출 중 터치 잠금
- 대화창 표시 후 3초가 지나야 다음 장으로 이동 가능
- 종장 화면은 카드 융합/본문 문장 페이드인 후 3초가 지나야 후속 대화로 이동 가능
- 리딩 진행 터치는 Phaser 전체 화면 hit zone으로 처리
- 5장 종장 융합용 `fusion-card-4`, `fusion-card-5` 보정 CSS 추가
- 대화창 좌우 폭과 카드/대화창 여백은 모바일 캡처 기준으로 조정 중

### ChatScene

역할:

- 리딩 이후 후속 질문
- 이전 리딩 맥락 기반 점술사 대화

현재 상태:

- `/api/chat` 연동 완료
- 배열법, 카드 위치, 위치 의미, 선택 카드 정보를 후속 대화 프롬프트에 포함
- 1장/3장/5장 모두 후속 대화 맥락 유지 가능
- 모바일 하단 입력 영역 조정 이력 있음
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
- 인트로의 샘플 갤러리 버튼도 제거됨
- 실제 게임에서 사용하는 VFX 에셋과 preload는 유지됨
- 인트로, 질문 봉인, 카드 공개, 챕터/종장 연출에 VFX 또는 fallback 그래픽을 사용함
- 5장 배열 종장 융합 연출을 위해 4번째/5번째 카드 애니메이션 override 추가

## 8. API 상태

### POST /api/reading

역할:

- 사용자 질문, 카테고리, 배열법, 카드 위치 의미, 선택 카드 정보를 받아 AI 리딩 생성

현재 상태:

- 구현 완료
- Cloudflare Workers AI `env.AI.run` 사용
- JSON 파싱 실패 시 fallback 응답 제공
- 질문 기반 해석을 강제하는 프롬프트 적용
- 1장/3장/5장 카드 수별 응답 길이 가이드 적용
- 관계 배열/선택 배열/상황 배열/오늘의 한 장 전용 해석 규칙 적용
- 5장 JSON 응답을 위해 reading `max_tokens`를 2200으로 상향

### POST /api/chat

역할:

- 기존 리딩 맥락과 대화 기록을 바탕으로 후속 답변 생성

현재 상태:

- 구현 완료
- 점술사 NPC 말투 유지
- 배열법, 카드 위치, positionMeaning, 카드명을 후속 대화 프롬프트에 포함
- 관계 배열에서는 상대 마음 단정 금지
- 선택 배열에서는 특정 선택을 운명처럼 강요하지 않도록 지시

## 9. AI 설정

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

## 10. 현재 중요한 파일

```txt
src/game/GameConfig.ts
src/game/scenes/BootScene.ts
src/game/scenes/IntroScene.ts
src/game/scenes/QuestionScene.ts
src/game/scenes/CardSelectScene.ts
src/game/scenes/ReadingScene.ts
src/game/scenes/ChatScene.ts
src/game/vfx/vfxEffects.ts
src/game/vfx/vfxLibrary.ts
src/tarot/cards.ts
src/tarot/spreads.ts
src/tarot/types.ts
src/api/client.ts
src/api/types.ts
worker/index.ts
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

## 11. 현재 UX 원칙

- 모든 화면은 모바일 세로 화면을 먼저 기준으로 본다.
- 게임 화면은 viewport 전체를 덮는다.
- 터치 영역은 시각 요소보다 넓게 잡는다.
- 질문 문장에 맞는 배열법을 먼저 추천한다.
- 카드 공개는 즉시 결과를 보여주지 않고, 기대감을 만든다.
- 해석은 스크롤 긴 글이 아니라 카드별 단계 진행으로 보여준다.
- 챕터/종장 연출 중에는 터치를 잠가 실수로 스킵되지 않게 한다.
- 대화창 또는 본문이 표시된 뒤 3초 후 다음 진행을 허용한다.
- 종합 조언은 문장 단위로 천천히 보여준다.
- AI는 반드시 사용자의 질문, 배열법, 카드 위치 의미를 중심에 두고 카드 의미를 연결해야 한다.

## 12. 남은 우선 작업

### 1순위: 5장 배열 모바일 QA

- 5장 카드가 서로 겹치지 않는지 확인
- 5장 카드 터치 영역 확인
- 5장 공개 후 해석 버튼 위치 확인
- 5장 리딩에서 1/5~5/5 진행 표시 확인
- 제4장/제5장 제목과 카드명 겹침 확인
- 5장 종장 융합 연출 확인

### 2순위: 모바일 UI 마감

- 인트로 버튼/본문 겹침 최종 확인
- 질문 봉인 버튼 위치 최종 확인
- 추천 배열 패널과 입력창/버튼 간격 확인
- 카드 선택 화면 카드명 위치 최종 확인
- 해석 화면 카드명 위치 최종 확인
- 대화창 좌우 폭과 높이 최종 확인
- 더 물어보기 화면 하단 입력창 잘림 여부 확인

### 3순위: AI 품질

- 자유 질문 자동 추천이 적절한지 확인
- 5장 리딩에서 카드 일반 의미만 반복하지 않는지 확인
- 관계 배열에서 상대 마음을 단정하지 않는지 확인
- 선택 배열에서 한쪽을 운명처럼 강요하지 않는지 확인
- 종장 조언이 배열 전체를 종합하는지 확인
- 너무 긴 응답 방지

### 4순위: 확장

- 선택된 배열을 사용자가 직접 바꿀 수 있는 UI
- 정방향/역방향 카드 시스템
- 카드 이미지와 VFX 로딩 최적화
- 사운드 효과
- 배경음
- 카드 도감
- 공유 이미지
- 리딩 기록

## 13. 작업 시 주의할 점

- `images/images.json`의 카드명과 이미지 파일명은 `src/tarot/cards.ts` 로딩 구조에 직접 영향을 준다.
- 카드 이미지를 DOM과 Phaser 양쪽에서 사용하므로, `imageUrl`과 `imageKey`를 구분해야 한다.
- `src/tarot/spreads.ts`는 배열법, 카드 수, 위치 의미, 추천 로직의 중심이다.
- `src/card-name-layout.css`는 `styles.css` 뒤에 import되어 적용된다.
- `src/fusion-five-layout.css`는 5장 종장 융합 연출만 보정한다.
- `src/mobile-viewport-fix.css`는 Phaser DOM 오버레이 터치 보정 역할을 한다.
- `GameConfig.ts`의 `ENVELOP` 스케일은 화면 전체 채움 기준이므로 임의 변경을 피한다.
- 모바일 UI는 실제 기기 캡처 기준으로 조정한다.
- GitHub Actions 자동 실행이 안 될 때는 Actions 탭에서 수동 실행한다.

## 14. 현재 완료 판단

MVP 기반 완료로 볼 수 있는 항목:

- 앱이 배포 환경에서 열린다.
- 게임 화면이 모바일 viewport를 덮는다.
- 사용자가 질문을 입력할 수 있다.
- 질문에 맞는 배열이 자동 추천된다.
- 질문 봉인 연출이 나온다.
- 실제 카드 앞면/뒷면 이미지가 나온다.
- 1장/3장/5장 카드가 공개된다.
- AI 리딩이 생성된다.
- 카드별 해석과 종합 조언이 표시된다.
- 챕터/종장 연출 중 터치 잠금이 동작한다.
- 후속 대화가 가능하다.

아직 제품 완성으로 보기 어려운 항목:

- 5장 배열의 모바일 실기기 QA
- 카드/텍스트 레이아웃 세부 완성도
- 모든 모바일 기기에서 안정적인 여백
- 카드 이미지/VFX 로딩 최적화
- 사운드/더 풍부한 몰입 연출
- 응답 품질 장기 안정성
