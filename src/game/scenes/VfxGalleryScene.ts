import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import { drawMysticBackground } from "../ui/drawPanel";
import {
  addRuneRing,
  addSigil,
  addSoftGlow,
  createMagicBeam,
  fadeDestroy,
  playBurst,
  playSmoke,
  spawnTextureSparkles,
} from "../vfx/vfxEffects";
import { allVfxAssets, getVfxAssetsByCategory } from "../vfx/vfxLibrary";

type SampleCategory = "intro" | "question" | "altar" | "reveal" | "chapter" | "finale" | "chat";

type VfxSample = {
  id: string;
  category: SampleCategory;
  title: string;
  description: string;
  play: () => void;
};

type ButtonView = {
  bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
};

const categoryLabels: Record<SampleCategory, string> = {
  intro: "인트로",
  question: "질문 봉인",
  altar: "카드 선택",
  reveal: "카드 공개",
  chapter: "챕터",
  finale: "종장",
  chat: "대화",
};

export class VfxGalleryScene extends Phaser.Scene {
  private selectedCategory: SampleCategory = "intro";
  private samples: VfxSample[] = [];
  private sampleButtons: ButtonView[] = [];
  private categoryButtons: Partial<Record<SampleCategory, ButtonView>> = {};
  private previewObjects: Phaser.GameObjects.GameObject[] = [];
  private previewTitle?: Phaser.GameObjects.Text;
  private previewDesc?: Phaser.GameObjects.Text;
  private vfxInfo?: Phaser.GameObjects.Text;
  private replayButton?: ButtonView;
  private selectedSample?: VfxSample;

  constructor() {
    super("VfxGalleryScene");
  }

  create(): void {
    drawMysticBackground(this, GAME_WIDTH, GAME_HEIGHT);
    this.samples = this.createSamples();
    this.createHeader();
    this.createCategoryMenu();
    this.createPreviewArea();
    this.renderSampleButtons();
    this.selectSample(this.filteredSamples()[0]);
  }

  private createHeader(): void {
    this.add
      .text(GAME_WIDTH / 2, sy(46), "연출 샘플 갤러리", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${ss(30)}px`,
        color: "#f8f0ff",
        stroke: "#2c174f",
        strokeThickness: ss(5),
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, sy(82), "종류를 고르고 샘플을 누르면 바로 재생됩니다.", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(13)}px`,
        color: "#cdbdff",
      })
      .setOrigin(0.5);

    this.createTextButton(sx(28), sy(28), sx(116), sy(46), "← 인트로", () => this.scene.start("IntroScene"), ss(13));

    this.vfxInfo = this.add
      .text(
        GAME_WIDTH / 2,
        sy(118),
        `로드된 VFX: ${allVfxAssets.length}개 · glow ${getVfxAssetsByCategory("glow").length} / ring ${getVfxAssetsByCategory("ring").length} / beam ${getVfxAssetsByCategory("beam").length}`,
        {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${ss(11)}px`,
          color: "#8f7cc8",
          align: "center",
        },
      )
      .setOrigin(0.5);
  }

  private createCategoryMenu(): void {
    const categories: SampleCategory[] = ["intro", "question", "altar", "reveal", "chapter", "finale", "chat"];
    const startX = sx(28);
    const startY = sy(146);
    const width = sx(96);
    const height = sy(48);
    const gap = sx(8);

    categories.forEach((category, index) => {
      const x = startX + index * (width + gap);
      const button = this.createTextButton(x, startY, width, height, categoryLabels[category], () => {
        this.selectedCategory = category;
        this.refreshCategoryButtons();
        this.renderSampleButtons();
        this.selectSample(this.filteredSamples()[0]);
      }, ss(12));
      this.categoryButtons[category] = button;
    });

    this.refreshCategoryButtons();
  }

  private createPreviewArea(): void {
    const frame = this.add.graphics();
    frame.fillStyle(0x09071a, 0.38);
    frame.fillRoundedRect(sx(34), sy(300), GAME_WIDTH - sx(68), sy(860), ss(34));
    frame.lineStyle(ss(3), 0xf6d365, 0.32);
    frame.strokeRoundedRect(sx(34), sy(300), GAME_WIDTH - sx(68), sy(860), ss(34));

    this.previewTitle = this.add
      .text(GAME_WIDTH / 2, sy(330), "", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${ss(24)}px`,
        color: "#fff6d6",
        align: "center",
      })
      .setOrigin(0.5);

    this.previewDesc = this.add
      .text(GAME_WIDTH / 2, sy(368), "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(13)}px`,
        color: "#d9c8ff",
        align: "center",
        wordWrap: { width: sx(330) },
      })
      .setOrigin(0.5);

    this.replayButton = this.createTextButton(GAME_WIDTH / 2 - sx(92), sy(1192), sx(184), sy(54), "다시 재생", () => {
      this.selectedSample?.play();
    }, ss(14));
  }

  private renderSampleButtons(): void {
    this.sampleButtons.forEach((button) => {
      button.bg.destroy();
      button.label.destroy();
    });
    this.sampleButtons = [];

    const samples = this.filteredSamples();
    const startX = sx(42);
    const startY = sy(1268);
    const width = sx(306);
    const height = sy(54);
    const gapY = sy(12);

    samples.forEach((sample, index) => {
      const y = startY + index * (height + gapY);
      const button = this.createTextButton(startX, y, width, height, sample.title, () => this.selectSample(sample), ss(13));
      this.sampleButtons.push(button);
    });
  }

  private filteredSamples(): VfxSample[] {
    return this.samples.filter((sample) => sample.category === this.selectedCategory);
  }

  private selectSample(sample?: VfxSample): void {
    if (!sample) return;
    this.selectedSample = sample;
    this.previewTitle?.setText(sample.title);
    this.previewDesc?.setText(sample.description);
    sample.play();
  }

  private refreshCategoryButtons(): void {
    Object.entries(this.categoryButtons).forEach(([category, button]) => {
      if (!button) return;
      const selected = category === this.selectedCategory;
      this.paintButton(button.bg, button.label.x - button.bg.x, 0, 0, 0, selected);
      button.label.setColor(selected ? "#fff6d6" : "#f8f0ff");
    });
  }

  private createTextButton(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    onClick: () => void,
    fontSize: number,
  ): ButtonView {
    const bg = this.add.graphics();
    bg.setPosition(x, y);
    const label = this.add
      .text(x + width / 2, y + height / 2, text, {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${fontSize}px`,
        color: "#f8f0ff",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5);

    this.paintButton(bg, width, height, 0, 0, false);
    const zone = this.add.zone(x + width / 2, y + height / 2, width + sx(14), height + sy(12)).setInteractive({ useHandCursor: true });
    zone.on("pointerdown", onClick);

    return { bg, label };
  }

  private paintButton(bg: Phaser.GameObjects.Graphics, width: number, height: number, _x: number, _y: number, selected: boolean): void {
    bg.clear();
    bg.fillStyle(selected ? 0x6d4aff : 0x1b1238, selected ? 0.88 : 0.76);
    bg.fillRoundedRect(0, 0, width, height, ss(15));
    bg.lineStyle(ss(2), selected ? 0xf6d365 : 0x6d4aff, selected ? 0.92 : 0.46);
    bg.strokeRoundedRect(0, 0, width, height, ss(15));
  }

  private clearPreview(): void {
    this.tweens.killAll();
    this.previewObjects.forEach((object) => object.destroy());
    this.previewObjects = [];
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.previewObjects.push(object);
    return object;
  }

  private createSamples(): VfxSample[] {
    return [
      { id: "int-star", category: "intro", title: "INT-01 별빛 점등형", description: "별먼지가 켜지고 중심 로고가 부드럽게 떠오르는 인트로.", play: () => this.playIntroStars() },
      { id: "int-door", category: "intro", title: "INT-02 문 열림형", description: "룬 링이 열리며 운명의 문이 열리는 느낌.", play: () => this.playIntroDoor() },
      { id: "int-card", category: "intro", title: "INT-03 카드 현현형", description: "어둠 속에서 카드 한 장이 빛으로 현현하는 시작 연출.", play: () => this.playIntroCard() },

      { id: "q-seal", category: "question", title: "QST-01 별빛 봉인형", description: "질문 문장이 작아져 봉인 문양에 흡수되는 연출.", play: () => this.playQuestionSeal() },
      { id: "q-ink", category: "question", title: "QST-02 잉크 봉인형", description: "안개와 먹빛처럼 질문이 흐려지며 봉인되는 연출.", play: () => this.playQuestionInk() },
      { id: "q-pulse", category: "question", title: "QST-03 맥동 봉인형", description: "봉인 문양이 심장처럼 맥동한 뒤 전환되는 간단한 연출.", play: () => this.playQuestionPulse() },

      { id: "a-beam", category: "altar", title: "ALT-01 세 갈래 분화형", description: "중앙 봉인이 세 장의 카드로 빛을 나누어 보내는 연출.", play: () => this.playAltarBeams() },
      { id: "a-mist", category: "altar", title: "ALT-02 안개 속 제단형", description: "카드들이 안개 속에서 천천히 떠오르는 제단 연출.", play: () => this.playAltarMist() },
      { id: "a-orbs", category: "altar", title: "ALT-03 봉인 부유형", description: "각 카드 위에 작은 봉인 구체가 부유하며 대기하는 연출.", play: () => this.playAltarOrbs() },

      { id: "r-burst", category: "reveal", title: "REV-01 빛 폭발형", description: "카드가 뒤집히는 순간 폭발광과 잔광이 퍼지는 연출.", play: () => this.playRevealBurst() },
      { id: "r-smoke", category: "reveal", title: "REV-02 안개 걷힘형", description: "안개가 걷히며 카드의 앞면이 서서히 드러나는 연출.", play: () => this.playRevealSmoke() },
      { id: "r-rune", category: "reveal", title: "REV-03 룬 해제형", description: "카드 표면의 룬 링이 깨지듯 사라지는 봉인 해제 연출.", play: () => this.playRevealRune() },

      { id: "c-title", category: "chapter", title: "CHP-01 챕터 문구 소환형", description: "챕터 제목이 빛 속에서 나타나 위로 올라가며 카드가 등장.", play: () => this.playChapterTitle() },
      { id: "c-dust", category: "chapter", title: "CHP-02 별가루 조립형", description: "별먼지가 중앙으로 모여 챕터 문구를 조립하는 느낌.", play: () => this.playChapterDust() },
      { id: "c-door", category: "chapter", title: "CHP-03 문 열림형", description: "빛의 문이 열리고 카드가 나타나는 챕터 전환.", play: () => this.playChapterDoor() },

      { id: "f-beams", category: "finale", title: "FIN-01 세 줄기 계시형", description: "세 줄기 빛이 중앙 계시핵으로 모이는 종장 연출.", play: () => this.playFinaleBeams() },
      { id: "f-orb", category: "finale", title: "FIN-02 계시 구체형", description: "중앙 구체와 룬 링이 조언 문장을 감싸는 연출.", play: () => this.playFinaleOrb() },
      { id: "f-fusion", category: "finale", title: "FIN-03 카드 융합형", description: "세 카드가 빛으로 분해되어 하나로 합쳐지는 컷신형 연출.", play: () => this.playFinaleFusion() },

      { id: "chat-candle", category: "chat", title: "CHAT-01 점술사 촛불형", description: "대화창 뒤에서 촛불처럼 은은한 빛이 호흡하는 연출.", play: () => this.playChatCandle() },
      { id: "chat-memory", category: "chat", title: "CHAT-02 카드 기억형", description: "이전 카드의 기억이 배경에 희미하게 남아 반짝이는 연출.", play: () => this.playChatMemory() },
    ];
  }

  private previewCenter(): { x: number; y: number } {
    return { x: GAME_WIDTH / 2, y: sy(730) };
  }

  private addSampleCard(x: number, y: number, scale = 1): Phaser.GameObjects.Container {
    const container = this.track(this.add.container(x, y));
    const card = this.add.graphics();
    card.fillStyle(0x160c32, 0.96);
    card.fillRoundedRect(-sx(72) * scale, -sy(108) * scale, sx(144) * scale, sy(216) * scale, ss(18) * scale);
    card.lineStyle(ss(3) * scale, 0xf6d365, 0.9);
    card.strokeRoundedRect(-sx(72) * scale, -sy(108) * scale, sx(144) * scale, sy(216) * scale, ss(18) * scale);
    const sigil = this.add.text(0, 0, "✦", { fontFamily: "Georgia, serif", fontSize: `${ss(42 * scale)}px`, color: "#fff6d6" }).setOrigin(0.5);
    container.add([card, sigil]);
    return container;
  }

  private playIntroStars(): void {
    this.clearPreview();
    const { x, y } = this.previewCenter();
    const glow = this.track(addSoftGlow(this, x, y, 5, 1.2));
    this.tweens.add({ targets: glow, alpha: 0.45, scale: 1.8, duration: 1100, yoyo: true, repeat: 1, ease: "Sine.easeInOut" });
    this.track(this.add.text(x, y, "ARCANA\nGATE", { fontFamily: "Georgia, serif", fontSize: `${ss(44)}px`, color: "#fff6d6", align: "center", stroke: "#2c174f", strokeThickness: ss(5) }).setOrigin(0.5).setAlpha(0));
    this.tweens.add({ targets: this.previewObjects[this.previewObjects.length - 1], alpha: 1, y: y - sy(10), delay: 480, duration: 900, ease: "Sine.easeOut" });
    spawnTextureSparkles(this, x, y, 10, 42, ss(40), ss(230));
  }

  private playIntroDoor(): void {
    this.clearPreview();
    const { x, y } = this.previewCenter();
    const glow = this.track(addSoftGlow(this, x, y, 5, 1));
    const ring = this.track(addRuneRing(this, x, y, 6, 0.65));
    const sigil = this.track(addSigil(this, x, y, 7, 0.7));
    this.tweens.add({ targets: glow, alpha: 0.55, scale: 1.7, duration: 700, ease: "Sine.easeOut" });
    this.tweens.add({ targets: ring, alpha: 0.95, angle: 360, scale: 1.05, duration: 1600, ease: "Cubic.easeInOut" });
    this.tweens.add({ targets: sigil, alpha: 1, scale: 1.2, duration: 600, yoyo: true, hold: 280, ease: "Sine.easeInOut" });
    playBurst(this, x, y, 9, 1.1);
  }

  private playIntroCard(): void {
    this.clearPreview();
    const { x, y } = this.previewCenter();
    const card = this.addSampleCard(x, y + sy(40), 1.15).setAlpha(0).setScale(0.7);
    const glow = this.track(addSoftGlow(this, x, y, 4, 1.1));
    this.tweens.add({ targets: glow, alpha: 0.42, scale: 1.6, duration: 900, ease: "Sine.easeOut" });
    this.tweens.add({ targets: card, alpha: 1, y, scale: 1, duration: 900, delay: 240, ease: "Back.easeOut" });
    spawnTextureSparkles(this, x, y, 10, 30, ss(30), ss(180));
  }

  private playQuestionSeal(): void {
    this.clearPreview();
    const { x, y } = this.previewCenter();
    const question = this.track(this.add.text(x, y - sy(150), "“내 길은 어디로 향할까?”", { fontFamily: "system-ui", fontSize: `${ss(22)}px`, color: "#f8f0ff" }).setOrigin(0.5));
    const glow = this.track(addSoftGlow(this, x, y, 4, 1));
    const ring = this.track(addRuneRing(this, x, y, 5, 0.5));
    const sigil = this.track(addSigil(this, x, y, 6, 0.58));
    this.tweens.add({ targets: [glow, ring, sigil], alpha: 1, duration: 520, ease: "Sine.easeOut" });
    this.tweens.add({ targets: ring, angle: 220, duration: 1100, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: question, y, scale: 0.12, alpha: 0, delay: 600, duration: 850, ease: "Cubic.easeInOut" });
    this.time.delayedCall(1180, () => spawnTextureSparkles(this, x, y, 10, 36, ss(30), ss(180)));
  }

  private playQuestionInk(): void {
    this.clearPreview();
    const { x, y } = this.previewCenter();
    const text = this.track(this.add.text(x, y - sy(60), "질문이 안개 속으로 스며듭니다", { fontFamily: "system-ui", fontSize: `${ss(21)}px`, color: "#f8f0ff" }).setOrigin(0.5));
    playSmoke(this, x, y, 7, 1.4);
    const sigil = this.track(addSigil(this, x, y + sy(30), 8, 0.55));
    this.tweens.add({ targets: text, alpha: 0.2, y: y - sy(10), duration: 950, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: sigil, alpha: 1, scale: 0.95, delay: 460, duration: 700, ease: "Sine.easeOut" });
  }

  private playQuestionPulse(): void {
    this.clearPreview();
    const { x, y } = this.previewCenter();
    const glow = this.track(addSoftGlow(this, x, y, 4, 0.9));
    const sigil = this.track(addSigil(this, x, y, 5, 0.72));
    this.tweens.add({ targets: glow, alpha: 0.42, scale: 1.5, duration: 620, yoyo: true, repeat: 2, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: sigil, alpha: 1, scale: 1.16, duration: 620, yoyo: true, repeat: 2, ease: "Sine.easeInOut" });
  }

  private playAltarBeams(): void {
    this.clearPreview();
    const { x, y } = this.previewCenter();
    const points = [x - sx(260), x, x + sx(260)].map((cardX) => ({ x: cardX, y: y + sy(190) }));
    const sigil = this.track(addSigil(this, x, y - sy(120), 8, 0.56));
    const ring = this.track(addRuneRing(this, x, y - sy(120), 7, 0.45));
    this.tweens.add({ targets: [sigil, ring], alpha: 1, duration: 420 });
    points.forEach((point, index) => {
      this.addSampleCard(point.x, point.y, 0.68).setAlpha(0.28);
      const beam = this.track(createMagicBeam(this, x, y - sy(60), point.x, point.y, 6, index === 0 ? 0xb58cff : index === 1 ? 0xf6d365 : 0x8ee6ff));
      this.tweens.add({ targets: beam, alpha: 0.85, delay: 480 + index * 160, duration: 420, yoyo: true, hold: 260, onComplete: () => beam.destroy() });
    });
  }

  private playAltarMist(): void {
    this.clearPreview();
    const { x, y } = this.previewCenter();
    playSmoke(this, x, y + sy(130), 5, 1.8);
    [-1, 0, 1].forEach((offset, index) => {
      const card = this.addSampleCard(x + sx(210 * offset), y + sy(110), 0.72).setAlpha(0).setY(y + sy(160));
      this.tweens.add({ targets: card, alpha: 1, y: y + sy(100), delay: 260 + index * 220, duration: 760, ease: "Sine.easeOut" });
    });
  }

  private playAltarOrbs(): void {
    this.clearPreview();
    const { x, y } = this.previewCenter();
    [-1, 0, 1].forEach((offset, index) => {
      const cx = x + sx(210 * offset);
      this.addSampleCard(cx, y + sy(120), 0.7).setAlpha(0.88);
      const orb = this.track(addSoftGlow(this, cx, y - sy(40), 8, 0.34));
      const sigil = this.track(addSigil(this, cx, y - sy(40), 9, 0.22));
      this.tweens.add({ targets: [orb, sigil], alpha: 0.8, y: "-=10", delay: index * 120, duration: 760, yoyo: true, repeat: 1, ease: "Sine.easeInOut" });
    });
  }

  private playRevealBurst(): void {
    this.clearPreview();
    const { x, y } = this.previewCenter();
    const card = this.addSampleCard(x, y, 1.1);
    this.tweens.add({ targets: card, scaleX: 0.02, duration: 450, ease: "Sine.easeInOut", onComplete: () => {
      playBurst(this, x, y, 10, 1.25);
      card.setScale(0.02, 1);
      this.tweens.add({ targets: card, scaleX: 1, duration: 620, ease: "Cubic.easeOut" });
      spawnTextureSparkles(this, x, y, 11, 36, ss(40), ss(220));
    } });
  }

  private playRevealSmoke(): void {
    this.clearPreview();
    const { x, y } = this.previewCenter();
    const card = this.addSampleCard(x, y, 1.1).setAlpha(0.25);
    const glow = this.track(addSoftGlow(this, x, y, 4, 1));
    this.tweens.add({ targets: glow, alpha: 0.42, scale: 1.5, duration: 600 });
    playSmoke(this, x, y, 10, 1.45);
    this.tweens.add({ targets: card, alpha: 1, delay: 620, duration: 980, ease: "Sine.easeInOut" });
  }

  private playRevealRune(): void {
    this.clearPreview();
    const { x, y } = this.previewCenter();
    this.addSampleCard(x, y, 1.1);
    const ring = this.track(addRuneRing(this, x, y, 8, 0.6));
    this.tweens.add({ targets: ring, alpha: 1, angle: 360, scale: 0.95, duration: 920, ease: "Cubic.easeInOut", onComplete: () => {
      playBurst(this, x, y, 10, 0.9);
      spawnTextureSparkles(this, x, y, 11, 42, ss(30), ss(210));
      fadeDestroy(this, ring, 0, 240);
    } });
  }

  private playChapterTitle(): void {
    this.clearPreview();
    const { x, y } = this.previewCenter();
    const glow = this.track(addSoftGlow(this, x, y - sy(90), 4, 0.9));
    const title = this.track(this.add.text(x, y - sy(90), "제1장. 지나간 문", { fontFamily: "Georgia, serif", fontSize: `${ss(34)}px`, color: "#fff6d6", stroke: "#2c174f", strokeThickness: ss(4) }).setOrigin(0.5).setAlpha(0));
    const card = this.addSampleCard(x, y + sy(130), 0.92).setAlpha(0).setY(y + sy(190));
    this.tweens.add({ targets: [glow, title], alpha: 1, duration: 700, ease: "Sine.easeOut" });
    this.tweens.add({ targets: title, y: y - sy(160), delay: 900, duration: 700, ease: "Cubic.easeInOut" });
    this.tweens.add({ targets: card, alpha: 1, y: y + sy(110), delay: 1180, duration: 720, ease: "Back.easeOut" });
  }

  private playChapterDust(): void {
    this.clearPreview();
    const { x, y } = this.previewCenter();
    spawnTextureSparkles(this, x, y - sy(90), 10, 58, ss(180), ss(260));
    const title = this.track(this.add.text(x, y - sy(90), "제2장. 지금의 불꽃", { fontFamily: "Georgia, serif", fontSize: `${ss(33)}px`, color: "#fff6d6", stroke: "#2c174f", strokeThickness: ss(4) }).setOrigin(0.5).setAlpha(0));
    this.tweens.add({ targets: title, alpha: 1, delay: 520, duration: 900, ease: "Sine.easeOut" });
  }

  private playChapterDoor(): void {
    this.clearPreview();
    const { x, y } = this.previewCenter();
    const left = this.track(createMagicBeam(this, x, y, x - sx(240), y, 6, 0xf6d365));
    const right = this.track(createMagicBeam(this, x, y, x + sx(240), y, 6, 0xf6d365));
    this.tweens.add({ targets: [left, right], alpha: 0.85, duration: 420, yoyo: true, hold: 500 });
    const card = this.addSampleCard(x, y + sy(70), 0.98).setAlpha(0).setScale(0.72);
    this.tweens.add({ targets: card, alpha: 1, scale: 1, delay: 520, duration: 820, ease: "Back.easeOut" });
  }

  private playFinaleBeams(): void {
    this.clearPreview();
    const { x, y } = this.previewCenter();
    const from = [{ x: x - sx(300), y: y + sy(120) }, { x, y: y - sy(250) }, { x: x + sx(300), y: y + sy(120) }];
    from.forEach((point, index) => {
      const beam = this.track(createMagicBeam(this, point.x, point.y, x, y, 6, index === 0 ? 0xb58cff : index === 1 ? 0xf6d365 : 0x8ee6ff));
      this.tweens.add({ targets: beam, alpha: 0.86, delay: index * 140, duration: 620, yoyo: true, hold: 300, onComplete: () => beam.destroy() });
    });
    const core = this.track(addSoftGlow(this, x, y, 8, 0.8));
    const ring = this.track(addRuneRing(this, x, y, 9, 0.52));
    this.tweens.add({ targets: [core, ring], alpha: 1, scale: 1.24, delay: 420, duration: 900, ease: "Sine.easeOut" });
    this.tweens.add({ targets: ring, angle: 360, duration: 2800, repeat: -1, ease: "Linear" });
  }

  private playFinaleOrb(): void {
    this.clearPreview();
    const { x, y } = this.previewCenter();
    const core = this.track(addSoftGlow(this, x, y, 5, 1.05));
    const sigil = this.track(addSigil(this, x, y, 7, 0.68));
    const ring = this.track(addRuneRing(this, x, y, 6, 0.72));
    this.tweens.add({ targets: core, alpha: 0.58, scale: 1.65, duration: 900, yoyo: true, repeat: 1 });
    this.tweens.add({ targets: [sigil, ring], alpha: 1, duration: 700 });
    this.tweens.add({ targets: ring, angle: -360, duration: 3200, repeat: -1, ease: "Linear" });
  }

  private playFinaleFusion(): void {
    this.clearPreview();
    const { x, y } = this.previewCenter();
    [-1, 0, 1].forEach((offset, index) => {
      const card = this.addSampleCard(x + sx(230 * offset), y + sy(60), 0.66);
      this.tweens.add({ targets: card, x, y, alpha: 0, scale: 0.22, delay: 300 + index * 160, duration: 900, ease: "Cubic.easeInOut" });
    });
    this.time.delayedCall(1050, () => {
      playBurst(this, x, y, 10, 1.4);
      spawnTextureSparkles(this, x, y, 11, 52, ss(30), ss(260));
    });
  }

  private playChatCandle(): void {
    this.clearPreview();
    const { x, y } = this.previewCenter();
    const panel = this.track(this.add.rectangle(x, y, sx(620), sy(250), 0x100b26, 0.78).setStrokeStyle(ss(3), 0xf6d365, 0.36));
    const glow = this.track(addSoftGlow(this, x, y, 4, 1));
    const text = this.track(this.add.text(x, y, "점술사\n별빛은 아직 꺼지지 않았습니다.", { fontFamily: "system-ui", fontSize: `${ss(22)}px`, color: "#f8f0ff", align: "center", lineSpacing: ss(10) }).setOrigin(0.5));
    this.tweens.add({ targets: glow, alpha: 0.36, scale: 1.5, duration: 1100, yoyo: true, repeat: 2, ease: "Sine.easeInOut" });
    panel.setDepth(5);
    text.setDepth(7);
  }

  private playChatMemory(): void {
    this.clearPreview();
    const { x, y } = this.previewCenter();
    [-1, 0, 1].forEach((offset, index) => {
      const card = this.addSampleCard(x + sx(150 * offset), y - sy(80), 0.45).setAlpha(0.18);
      this.tweens.add({ targets: card, alpha: 0.38, y: "-=8", delay: index * 160, duration: 800, yoyo: true, repeat: 1, ease: "Sine.easeInOut" });
    });
    const text = this.track(this.add.text(x, y + sy(150), "이전 카드의 기억이 대화 뒤에 남아 있습니다.", { fontFamily: "system-ui", fontSize: `${ss(20)}px`, color: "#d9c8ff", align: "center" }).setOrigin(0.5));
    spawnTextureSparkles(this, x, y, 9, 26, ss(60), ss(220));
  }
}
