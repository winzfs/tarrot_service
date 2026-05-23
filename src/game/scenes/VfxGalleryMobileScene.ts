import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import { drawMysticBackground } from "../ui/drawPanel";
import {
  addRuneRing,
  addSigil,
  addSoftGlow,
  createMagicBeam,
  playBurst,
  playSmoke,
  spawnTextureSparkles,
} from "../vfx/vfxEffects";
import { allVfxAssets, getVfxAssetsByCategory } from "../vfx/vfxLibrary";

type Category = "intro" | "question" | "altar" | "reveal" | "chapter" | "finale" | "chat";
type Kind =
  | "stars"
  | "door"
  | "card"
  | "seal"
  | "ink"
  | "pulse"
  | "runes"
  | "beams"
  | "mist"
  | "orbs"
  | "constellation"
  | "burst"
  | "smoke"
  | "rune"
  | "glow"
  | "chapter"
  | "dust"
  | "gate"
  | "aura"
  | "finale"
  | "orb"
  | "fusion"
  | "chat"
  | "memory";

type Sample = {
  id: string;
  category: Category;
  title: string;
  description: string;
  kind: Kind;
  tone: number;
  speed: number;
};

const categoryLabels: Record<Category, string> = {
  intro: "인트로",
  question: "질문 봉인",
  altar: "카드 선택",
  reveal: "카드 공개",
  chapter: "챕터",
  finale: "종장",
  chat: "대화",
};

const tones = {
  violet: 0xb58cff,
  gold: 0xf6d365,
  blue: 0x8ee6ff,
  white: 0xffffff,
  dark: 0x6d4aff,
};

export class VfxGalleryMobileScene extends Phaser.Scene {
  private category: Category = "intro";
  private samples: Sample[] = [];
  private selected?: Sample;
  private dom?: Phaser.GameObjects.DOMElement;
  private root?: HTMLElement;
  private previewItems: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super("VfxGalleryScene");
  }

  create(): void {
    drawMysticBackground(this, GAME_WIDTH, GAME_HEIGHT);
    this.samples = this.makeSamples();
    this.createDomUi();
    this.renderDom();
    this.pick(this.filtered()[0]);
  }

  private createDomUi(): void {
    const root = document.createElement("section");
    root.className = "vfx-gallery-mobile";
    root.innerHTML = this.template();
    this.root = root;
    this.dom = this.add.dom(GAME_WIDTH / 2, GAME_HEIGHT / 2, root).setOrigin(0.5);

    root.addEventListener("click", (event) => {
      const target = event.target as HTMLElement | null;
      const categoryButton = target?.closest<HTMLElement>("[data-category]");
      const sampleButton = target?.closest<HTMLElement>("[data-sample]");
      const actionButton = target?.closest<HTMLElement>("[data-action]");

      if (categoryButton) {
        this.category = categoryButton.dataset.category as Category;
        this.renderDom();
        this.pick(this.filtered()[0]);
        return;
      }

      if (sampleButton) {
        const sample = this.samples.find((item) => item.id === sampleButton.dataset.sample);
        this.pick(sample);
        return;
      }

      if (actionButton?.dataset.action === "back") {
        this.scene.start("IntroScene");
        return;
      }

      if (actionButton?.dataset.action === "replay") {
        if (this.selected) this.play(this.selected);
      }
    });
  }

  private template(): string {
    return `
      <style>
        .vfx-gallery-mobile {
          width: ${GAME_WIDTH}px;
          height: ${GAME_HEIGHT}px;
          box-sizing: border-box;
          padding: ${sy(22)}px ${sx(18)}px ${sy(22)}px;
          color: #f8f0ff;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          pointer-events: auto;
          user-select: none;
          -webkit-user-select: none;
          touch-action: manipulation;
        }
        .vfx-top {
          position: relative;
          display: grid;
          justify-items: center;
          gap: ${sy(7)}px;
        }
        .vfx-back {
          position: absolute;
          left: 0;
          top: 0;
          width: ${sx(86)}px;
          height: ${sy(38)}px;
        }
        .vfx-title {
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: ${ss(27)}px;
          line-height: 1.05;
          color: #f8f0ff;
          text-shadow: 0 ${ss(3)}px ${ss(10)}px rgba(44, 23, 79, 0.95);
        }
        .vfx-subtitle {
          margin: 0;
          color: #cdbdff;
          font-size: ${ss(12)}px;
        }
        .vfx-meta {
          color: #8f7cc8;
          font-size: ${ss(10)}px;
        }
        .vfx-categories {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: ${sy(8)}px ${sx(8)}px;
          margin-top: ${sy(12)}px;
        }
        .vfx-button,
        .vfx-category,
        .vfx-sample,
        .vfx-replay {
          border: ${ss(2)}px solid rgba(109, 74, 255, 0.54);
          background: rgba(27, 18, 56, 0.78);
          color: #f8f0ff;
          border-radius: ${ss(13)}px;
          font-weight: 800;
          text-align: center;
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }
        .vfx-button,
        .vfx-category {
          min-height: ${sy(34)}px;
          font-size: ${ss(10)}px;
        }
        .vfx-category.is-active {
          border-color: rgba(246, 211, 101, 0.92);
          background: rgba(109, 74, 255, 0.88);
          color: #fff6d6;
        }
        .vfx-preview-card {
          position: relative;
          margin-top: ${sy(14)}px;
          height: ${sy(315)}px;
          border-radius: ${ss(24)}px;
          border: ${ss(2)}px solid rgba(246, 211, 101, 0.32);
          background: rgba(9, 7, 26, 0.36);
          box-sizing: border-box;
          pointer-events: none;
        }
        .vfx-preview-title {
          position: absolute;
          left: ${sx(14)}px;
          right: ${sx(14)}px;
          top: ${sy(18)}px;
          text-align: center;
          font-family: Georgia, "Times New Roman", serif;
          font-size: ${ss(20)}px;
          color: #fff6d6;
          line-height: 1.15;
        }
        .vfx-preview-desc {
          position: absolute;
          left: ${sx(18)}px;
          right: ${sx(18)}px;
          top: ${sy(49)}px;
          text-align: center;
          color: #d9c8ff;
          font-size: ${ss(11)}px;
          line-height: 1.32;
        }
        .vfx-replay {
          position: absolute;
          left: 50%;
          bottom: ${sy(14)}px;
          transform: translateX(-50%);
          width: ${sx(150)}px;
          min-height: ${sy(36)}px;
          font-size: ${ss(12)}px;
          pointer-events: auto;
        }
        .vfx-list-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: ${sy(13)}px ${sx(2)}px ${sy(6)}px;
          color: #f6d365;
          font-size: ${ss(13)}px;
          font-weight: 900;
        }
        .vfx-scroll-hint {
          color: #8f7cc8;
          font-size: ${ss(10)}px;
          font-weight: 700;
        }
        .vfx-list {
          height: ${sy(285)}px;
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
          border-radius: ${ss(18)}px;
          border: ${ss(2)}px solid rgba(109, 74, 255, 0.36);
          background: rgba(9, 7, 26, 0.24);
          padding: ${sy(10)}px ${sx(10)}px ${sy(16)}px;
          box-sizing: border-box;
        }
        .vfx-sample {
          display: block;
          width: 100%;
          min-height: ${sy(48)}px;
          margin-bottom: ${sy(10)}px;
          padding: ${sy(8)}px ${sx(12)}px;
          font-size: ${ss(12)}px;
          line-height: 1.2;
        }
        .vfx-sample.is-active {
          border-color: rgba(246, 211, 101, 0.92);
          background: rgba(109, 74, 255, 0.82);
          color: #fff6d6;
        }
      </style>
      <div class="vfx-top">
        <button class="vfx-button vfx-back" data-action="back">← 인트로</button>
        <h1 class="vfx-title">연출 샘플 갤러리</h1>
        <p class="vfx-subtitle">목록을 손가락으로 드래그해서 스크롤하세요.</p>
        <div class="vfx-meta">VFX ${allVfxAssets.length}개 · glow ${getVfxAssetsByCategory("glow").length} / ring ${getVfxAssetsByCategory("ring").length} / beam ${getVfxAssetsByCategory("beam").length}</div>
      </div>
      <div class="vfx-categories" data-categories></div>
      <div class="vfx-preview-card">
        <div class="vfx-preview-title" data-title></div>
        <div class="vfx-preview-desc" data-desc></div>
        <button class="vfx-replay" data-action="replay">다시 재생</button>
      </div>
      <div class="vfx-list-title">
        <span>샘플 목록</span>
        <span class="vfx-scroll-hint">상하 스크롤</span>
      </div>
      <div class="vfx-list" data-list></div>
    `;
  }

  private renderDom(): void {
    if (!this.root) return;

    const categories = this.root.querySelector<HTMLElement>("[data-categories]");
    const list = this.root.querySelector<HTMLElement>("[data-list]");

    if (categories) {
      categories.innerHTML = (Object.keys(categoryLabels) as Category[])
        .map((category) => `<button class="vfx-category ${category === this.category ? "is-active" : ""}" data-category="${category}">${categoryLabels[category]}</button>`)
        .join("");
    }

    if (list) {
      list.innerHTML = this.filtered()
        .map((sample) => `<button class="vfx-sample ${sample.id === this.selected?.id ? "is-active" : ""}" data-sample="${sample.id}">${sample.title}</button>`)
        .join("");
      list.scrollTop = 0;
    }
  }

  private filtered(): Sample[] {
    return this.samples.filter((sample) => sample.category === this.category);
  }

  private pick(sample?: Sample): void {
    if (!sample || !this.root) return;
    this.selected = sample;
    const title = this.root.querySelector<HTMLElement>("[data-title]");
    const desc = this.root.querySelector<HTMLElement>("[data-desc]");
    if (title) title.textContent = sample.title;
    if (desc) desc.textContent = sample.description;
    this.renderDom();
    this.play(sample);
  }

  private clearPreview(): void {
    this.tweens.killAll();
    this.previewItems.forEach((item) => item.destroy());
    this.previewItems = [];
  }

  private track<T extends Phaser.GameObjects.GameObject>(item: T): T {
    this.previewItems.push(item);
    return item;
  }

  private center(): { x: number; y: number } {
    return { x: GAME_WIDTH / 2, y: sy(355) };
  }

  private card(x: number, y: number, scale = 1): Phaser.GameObjects.Container {
    const container = this.track(this.add.container(x, y));
    const card = this.add.graphics();
    card.fillStyle(0x160c32, 0.96);
    card.fillRoundedRect(-sx(42) * scale, -sy(64) * scale, sx(84) * scale, sy(128) * scale, ss(12) * scale);
    card.lineStyle(ss(2) * scale, 0xf6d365, 0.9);
    card.strokeRoundedRect(-sx(42) * scale, -sy(64) * scale, sx(84) * scale, sy(128) * scale, ss(12) * scale);
    const sigil = this.add.text(0, 0, "✦", {
      fontFamily: "Georgia, serif",
      fontSize: `${ss(30 * scale)}px`,
      color: "#fff6d6",
    }).setOrigin(0.5);
    container.add([card, sigil]);
    return container;
  }

  private makeSamples(): Sample[] {
    return [
      ...this.group("intro", "INT", [["별빛 점등형", "별먼지가 켜지고 중심 로고가 떠오름", "stars", tones.violet], ["문 열림형", "룬 링이 열리며 운명의 문이 열림", "door", tones.gold], ["카드 현현형", "카드 한 장이 빛으로 나타남", "card", tones.violet], ["달빛 프롤로그", "푸른 달빛과 안개가 깔리는 시작", "stars", tones.blue], ["황금 마법진", "금빛 링이 타이틀을 소환", "door", tones.gold], ["검은 거울", "어두운 핵에서 빛이 번짐", "pulse", tones.dark], ["별문 균열", "sigil이 갈라지며 빛이 새어 나옴", "door", tones.white], ["카드 낙하", "카드가 위에서 내려와 정지", "card", tones.gold], ["보랏빛 심연", "보라 안개 속 UI 등장", "stars", tones.violet], ["프롤로그 컷신", "문구와 카드가 순서대로 등장", "card", tones.blue]]),
      ...this.group("question", "QST", [["별빛 봉인형", "질문이 봉인 문양에 흡수됨", "seal", tones.gold], ["잉크 봉인형", "문장이 안개처럼 번지며 봉인", "ink", tones.dark], ["맥동 봉인형", "봉인이 심장처럼 맥동", "pulse", tones.violet], ["룬 각인형", "질문이 룬 조각으로 흩어짐", "runes", tones.gold], ["달빛 흡수형", "푸른 빛이 질문을 감싸며 흡수", "seal", tones.blue], ["금빛 도장형", "도장 찍듯 sigil이 남음", "pulse", tones.gold], ["안개 소거형", "질문이 안개에 가려졌다 사라짐", "ink", tones.violet], ["별가루 분해형", "글자가 별가루처럼 흩어짐", "runes", tones.white], ["심연 낙인형", "어두운 핵에서 봉인 표식", "pulse", tones.dark], ["기도문 접힘형", "문장이 접혀 중심으로 들어감", "seal", tones.violet], ["은빛 봉투형", "질문이 빛 봉투처럼 접힘", "seal", tones.white], ["삼중 봉인형", "링 세 겹이 순서대로 닫힘", "runes", tones.blue]]),
      ...this.group("altar", "ALT", [["세 갈래 분화형", "중앙 봉인이 세 카드로 빛을 나눔", "beams", tones.gold], ["안개 속 제단형", "카드들이 안개 속에서 떠오름", "mist", tones.violet], ["봉인 부유형", "각 카드 위 작은 봉인 구체", "orbs", tones.blue], ["별자리 연결형", "세 카드가 별자리 선으로 연결", "constellation", tones.white], ["황금 제단형", "금빛 중심에서 카드 점화", "beams", tones.gold], ["청색 예언형", "푸른 빛줄기가 미래감 강조", "beams", tones.blue], ["보라 안개형", "제단 아래 보라 안개", "mist", tones.violet], ["삼중 오브형", "세 오브가 카드 위 회전", "orbs", tones.gold], ["심연 제단형", "어두운 빛이 카드를 깨움", "mist", tones.dark], ["별점 배치형", "카드 주변 별점이 먼저 찍힘", "constellation", tones.blue], ["빛의 길형", "카드까지 이어지는 beam", "beams", tones.white], ["봉인 대기형", "카드가 닫힌 봉인처럼 호흡", "orbs", tones.violet]]),
      ...this.group("reveal", "REV", [["빛 폭발형", "뒤집는 순간 폭발광과 파편", "burst", tones.gold], ["안개 걷힘형", "안개가 걷히며 카드가 드러남", "smoke", tones.violet], ["룬 해제형", "카드 표면 룬 링 해제", "rune", tones.gold], ["잔광 유지형", "카드 공개 후 후광 유지", "glow", tones.blue], ["백색 섬광형", "하얗게 빛난 뒤 등장", "burst", tones.white], ["보라 파동형", "보라 링이 퍼지며 공개", "rune", tones.violet], ["금빛 파편형", "금빛 조각이 튐", "burst", tones.gold], ["연기 현현형", "카드가 연기 뒤에서 나타남", "smoke", tones.dark], ["푸른 예지형", "푸른 잔광의 미래감", "glow", tones.blue], ["작은 폭발형", "짧고 빠른 공개용", "burst", tones.white], ["느린 현현형", "천천히 드러나는 공개", "smoke", tones.violet], ["봉인 균열형", "룬이 회전하다 부서짐", "rune", tones.dark], ["성스러운 공개형", "금색과 흰색 중심 공개", "glow", tones.gold], ["심연 공개형", "어둡게 눌렀다가 강한 빛", "burst", tones.dark]]),
      ...this.group("chapter", "CHP", [["챕터 문구 소환형", "챕터 제목이 빛 속에서 등장", "chapter", tones.gold], ["별가루 조립형", "별먼지가 문구를 조립", "dust", tones.white], ["문 열림형", "빛의 문 사이에서 카드 등장", "gate", tones.gold], ["카드 후광형", "카드 뒤에 챕터 후광 유지", "aura", tones.violet], ["과거 잔상형", "보라 잔광과 느린 이동", "aura", tones.dark], ["현재 점화형", "금빛 중심광이 강하게 켜짐", "chapter", tones.gold], ["미래 별안개형", "청색 안개와 별가루", "dust", tones.blue], ["고요한 장면형", "연출을 줄여 대화 집중", "aura", tones.white], ["룬 장막형", "링 뒤에서 제목 등장", "gate", tones.violet], ["수직 상승형", "문구가 아래에서 위로", "chapter", tones.blue], ["장면 전환형", "beam으로 화면을 가름", "gate", tones.white], ["속삭임형", "작은 빛과 문구만 표시", "aura", tones.gold]]),
      ...this.group("finale", "FIN", [["세 줄기 계시형", "세 방향 빛이 중앙으로 모임", "finale", tones.gold], ["계시 구체형", "중앙 구체와 링", "orb", tones.violet], ["카드 융합형", "세 카드가 빛으로 합쳐짐", "fusion", tones.white], ["황금 종장형", "금빛 ring과 core", "orb", tones.gold], ["청색 별핵형", "푸른 코어가 맥동", "finale", tones.blue], ["심연 계시형", "어두운 중심에서 조언", "orb", tones.dark], ["파편 수렴형", "파편들이 중앙으로 모임", "fusion", tones.gold], ["은빛 마무리형", "흰빛이 부드럽게 모임", "finale", tones.white], ["느린 계시형", "느린 중심광", "orb", tones.violet], ["컷신 종장형", "세 카드가 사라지고 섬광", "fusion", tones.blue]]),
      ...this.group("chat", "CHAT", [["점술사 촛불형", "대화창 뒤 빛이 호흡", "chat", tones.gold], ["카드 기억형", "카드 잔상이 배경에 남음", "memory", tones.violet], ["푸른 수정구형", "푸른 코어가 대화창 뒤 맥동", "chat", tones.blue], ["별먼지 응답형", "답변 등장 시 별먼지", "memory", tones.white], ["어두운 상담실", "낮은 조도와 보라 glow", "chat", tones.dark], ["금빛 속삭임", "메시지 뒤 금빛 pulse", "chat", tones.gold], ["기억의 잔상", "카드 실루엣이 흔들림", "memory", tones.blue], ["고요한 재질문", "절제한 후속 대화용", "chat", tones.white]]),
    ];
  }

  private group(category: Category, prefix: string, rows: Array<[string, string, Kind, number]>): Sample[] {
    return rows.map(([name, description, kind, tone], index) => ({
      id: `${prefix}-${index + 1}`,
      category,
      title: `${prefix}-${String(index + 1).padStart(2, "0")} ${name}`,
      description,
      kind,
      tone,
      speed: 1 + (index % 3) * 0.1,
    }));
  }

  private play(sample: Sample): void {
    this.clearPreview();
    const { x, y } = this.center();

    switch (sample.kind) {
      case "stars": {
        const glow = this.track(addSoftGlow(this, x, y, 5, 0.85));
        const title = this.track(this.add.text(x, y, "ARCANA\nGATE", { fontFamily: "Georgia, serif", fontSize: `${ss(32)}px`, color: "#fff6d6", align: "center", stroke: "#2c174f", strokeThickness: ss(4) }).setOrigin(0.5).setAlpha(0));
        this.tweens.add({ targets: glow, alpha: 0.45, scale: 1.55, duration: 900 * sample.speed, yoyo: true, repeat: 1 });
        this.tweens.add({ targets: title, alpha: 1, y: y - sy(8), delay: 260, duration: 720 * sample.speed });
        spawnTextureSparkles(this, x, y, 10, 32, ss(30), ss(130));
        break;
      }
      case "door": {
        const glow = this.track(addSoftGlow(this, x, y, 5, 0.8));
        const ring = this.track(addRuneRing(this, x, y, 6, 0.45));
        const sigil = this.track(addSigil(this, x, y, 7, 0.48));
        this.tweens.add({ targets: glow, alpha: 0.55, scale: 1.5, duration: 650 * sample.speed });
        this.tweens.add({ targets: ring, alpha: 0.95, angle: 360, scale: 0.85, duration: 1200 * sample.speed });
        this.tweens.add({ targets: sigil, alpha: 1, scale: 0.88, duration: 560 * sample.speed, yoyo: true });
        playBurst(this, x, y, 9, 0.85);
        break;
      }
      case "card": {
        const card = this.card(x, y + sy(28), 1).setAlpha(0).setScale(0.72);
        const glow = this.track(addSoftGlow(this, x, y, 4, 0.82));
        this.tweens.add({ targets: glow, alpha: 0.42, scale: 1.4, duration: 760 * sample.speed });
        this.tweens.add({ targets: card, alpha: 1, y, scale: 1, duration: 760 * sample.speed, delay: 180 });
        spawnTextureSparkles(this, x, y, 10, 24, ss(24), ss(110));
        break;
      }
      case "seal": {
        const question = this.track(this.add.text(x, y - sy(80), "“내 길은 어디로 향할까?”", { fontFamily: "system-ui", fontSize: `${ss(16)}px`, color: "#f8f0ff" }).setOrigin(0.5));
        const ring = this.track(addRuneRing(this, x, y, 5, 0.42));
        const sigil = this.track(addSigil(this, x, y, 6, 0.45));
        this.tweens.add({ targets: [ring, sigil], alpha: 1, duration: 480 * sample.speed });
        this.tweens.add({ targets: question, y, scale: 0.1, alpha: 0, delay: 420, duration: 700 * sample.speed });
        this.time.delayedCall(980, () => spawnTextureSparkles(this, x, y, 10, 28, ss(24), ss(120)));
        break;
      }
      case "ink":
      case "smoke":
      case "mist": {
        if (sample.kind === "mist") {
          [-1, 0, 1].forEach((offset, index) => this.tweens.add({ targets: this.card(x + sx(75 * offset), y + sy(42), 0.58).setAlpha(0), alpha: 1, y: y + sy(20), delay: 180 + index * 180, duration: 700 * sample.speed }));
        } else {
          this.tweens.add({ targets: this.card(x, y, 1).setAlpha(0.25), alpha: 1, delay: 520, duration: 850 * sample.speed });
        }
        playSmoke(this, x, y + sy(24), 10, 1.0);
        break;
      }
      case "pulse": {
        const glow = this.track(addSoftGlow(this, x, y, 4, 0.78));
        const sigil = this.track(addSigil(this, x, y, 5, 0.52));
        this.tweens.add({ targets: glow, alpha: 0.46, scale: 1.35, duration: 560 * sample.speed, yoyo: true, repeat: 2 });
        this.tweens.add({ targets: sigil, alpha: 1, scale: 0.96, duration: 560 * sample.speed, yoyo: true, repeat: 2 });
        break;
      }
      case "runes":
      case "rune": {
        this.card(x, y, 0.92);
        const ring = this.track(addRuneRing(this, x, y, 8, 0.46));
        this.tweens.add({ targets: ring, alpha: 1, angle: 360, scale: 0.78, duration: 900 * sample.speed, onComplete: () => { playBurst(this, x, y, 10, 0.75); spawnTextureSparkles(this, x, y, 11, 30, ss(24), ss(130)); } });
        break;
      }
      case "beams":
      case "finale": {
        const points = [{ x: x - sx(115), y: y + sy(70) }, { x, y: y - sy(85) }, { x: x + sx(115), y: y + sy(70) }];
        points.forEach((point, index) => {
          const beam = this.track(createMagicBeam(this, point.x, point.y, x, y, 6, index === 1 ? sample.tone : 0xb58cff));
          this.tweens.add({ targets: beam, alpha: 0.86, delay: index * 120, duration: 520 * sample.speed, yoyo: true, hold: 220, onComplete: () => beam.destroy() });
        });
        const core = this.track(addSoftGlow(this, x, y, 8, 0.65));
        this.tweens.add({ targets: core, alpha: 1, scale: 1.2, delay: 360, duration: 760 * sample.speed });
        break;
      }
      case "orbs": {
        [-1, 0, 1].forEach((offset, index) => {
          const cx = x + sx(78 * offset);
          this.card(cx, y + sy(40), 0.54).setAlpha(0.9);
          const orb = this.track(addSoftGlow(this, cx, y - sy(45), 8, 0.26));
          this.tweens.add({ targets: orb, alpha: 0.8, y: "-=8", delay: index * 110, duration: 700 * sample.speed, yoyo: true, repeat: 1 });
        });
        break;
      }
      case "constellation": {
        const points = [{ x: x - sx(105), y: y + sy(55) }, { x, y: y - sy(55) }, { x: x + sx(105), y: y + sy(55) }];
        points.forEach((point) => this.tweens.add({ targets: this.track(addSoftGlow(this, point.x, point.y, 6, 0.2)), alpha: 0.55, scale: 0.7, duration: 520 * sample.speed, yoyo: true }));
        for (let index = 0; index < 2; index += 1) {
          this.tweens.add({ targets: this.track(createMagicBeam(this, points[index].x, points[index].y, points[index + 1].x, points[index + 1].y, 5, sample.tone)), alpha: 0.75, delay: 240 + index * 200, duration: 480 * sample.speed, yoyo: true, hold: 420 });
        }
        break;
      }
      case "burst": {
        const card = this.card(x, y, 1);
        this.tweens.add({ targets: card, scaleX: 0.02, duration: 390 * sample.speed, onComplete: () => { playBurst(this, x, y, 10, 0.95); card.setScale(0.02, 1); this.tweens.add({ targets: card, scaleX: 1, duration: 560 * sample.speed }); spawnTextureSparkles(this, x, y, 11, 32, ss(28), ss(130)); } });
        break;
      }
      case "glow":
      case "aura":
      case "orb":
      case "chat": {
        if (sample.kind !== "chat") this.card(x, y, 0.9);
        const glow = this.track(addSoftGlow(this, x, y, 5, 0.82));
        const ring = sample.kind === "orb" ? this.track(addRuneRing(this, x, y, 6, 0.42)) : undefined;
        this.tweens.add({ targets: [glow, ring].filter(Boolean), alpha: 0.55, scale: 1.35, duration: 820 * sample.speed, yoyo: true, repeat: 2 });
        if (sample.kind === "chat") {
          this.track(this.add.rectangle(x, y, sx(235), sy(120), 0x100b26, 0.78).setStrokeStyle(ss(2), sample.tone, 0.4));
          this.track(this.add.text(x, y, "점술사\n별빛은 아직 꺼지지 않았습니다.", { fontFamily: "system-ui", fontSize: `${ss(16)}px`, color: "#f8f0ff", align: "center", lineSpacing: ss(8) }).setOrigin(0.5).setDepth(7));
        }
        break;
      }
      case "chapter":
      case "dust":
      case "gate": {
        if (sample.kind === "dust") spawnTextureSparkles(this, x, y - sy(60), 10, 46, ss(90), ss(150));
        if (sample.kind === "gate") this.tweens.add({ targets: [this.track(createMagicBeam(this, x, y, x - sx(125), y, 6, sample.tone)), this.track(createMagicBeam(this, x, y, x + sx(125), y, 6, sample.tone))], alpha: 0.85, duration: 420 * sample.speed, yoyo: true, hold: 420 });
        const title = this.track(this.add.text(x, y - sy(60), sample.tone === tones.blue ? "제3장. 아직 오지 않은 별" : "제1장. 지나간 문", { fontFamily: "Georgia, serif", fontSize: `${ss(22)}px`, color: "#fff6d6", stroke: "#2c174f", strokeThickness: ss(3) }).setOrigin(0.5).setAlpha(0));
        const card = this.card(x, y + sy(54), 0.72).setAlpha(0).setY(y + sy(88));
        this.tweens.add({ targets: title, alpha: 1, duration: 580 * sample.speed });
        this.tweens.add({ targets: card, alpha: 1, y: y + sy(44), delay: 700, duration: 620 * sample.speed });
        break;
      }
      case "fusion": {
        [-1, 0, 1].forEach((offset, index) => this.tweens.add({ targets: this.card(x + sx(85 * offset), y + sy(40), 0.48), x, y, alpha: 0, scale: 0.2, delay: 220 + index * 140, duration: 780 * sample.speed }));
        this.time.delayedCall(880, () => { playBurst(this, x, y, 10, 1.05); spawnTextureSparkles(this, x, y, 11, 42, ss(26), ss(150)); });
        break;
      }
      case "memory": {
        [-1, 0, 1].forEach((offset, index) => this.tweens.add({ targets: this.card(x + sx(62 * offset), y - sy(30), 0.36).setAlpha(0.18), alpha: 0.38, y: "-=7", delay: index * 130, duration: 680 * sample.speed, yoyo: true, repeat: 1 }));
        this.track(this.add.text(x, y + sy(88), "이전 카드의 기억이 대화 뒤에 남아 있습니다.", { fontFamily: "system-ui", fontSize: `${ss(15)}px`, color: "#d9c8ff", align: "center", wordWrap: { width: sx(300) } }).setOrigin(0.5));
        spawnTextureSparkles(this, x, y, 9, 24, ss(45), ss(130));
        break;
      }
    }
  }
}
