import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import type { ReadingDraft } from "../state/ReadingDraft";
import { categoryLabels } from "../state/ReadingDraft";
import { drawMysticBackground, drawRoundedPanel } from "../ui/drawPanel";
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
import { drawTarotCards } from "../../tarot/cards";
import type { DrawnCard } from "../../tarot/types";

const positions = ["과거", "현재", "미래"];

type CardView = {
  container: Phaser.GameObjects.Container;
  back: Phaser.GameObjects.Container;
  front: Phaser.GameObjects.Container;
  seal: Phaser.GameObjects.Arc;
  hitZone: Phaser.GameObjects.Zone;
  revealed: boolean;
};

export type ReadingSceneData = {
  draft: ReadingDraft;
  cards: DrawnCard[];
};

export class CardSelectScene extends Phaser.Scene {
  private draft?: ReadingDraft;
  private drawnCards: DrawnCard[] = [];
  private cardViews: CardView[] = [];
  private revealedCount = 0;
  private readingButton?: Phaser.GameObjects.Container;
  private readingButtonZone?: Phaser.GameObjects.Zone;
  private guideText?: Phaser.GameObjects.Text;
  private isStartingReading = false;
  private altarIntroDone = false;

  constructor() {
    super("CardSelectScene");
  }

  init(data: ReadingDraft): void {
    this.draft = data;
    this.drawnCards = drawTarotCards(3).map((card, index) => ({ ...card, position: positions[index] }));
    this.cardViews = [];
    this.revealedCount = 0;
    this.isStartingReading = false;
    this.altarIntroDone = false;
  }

  create(): void {
    drawMysticBackground(this, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(GAME_WIDTH / 2, sy(62), "별빛의 제단", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${ss(34)}px`,
        color: "#f8f0ff",
        stroke: "#2c174f",
        strokeThickness: ss(5),
      })
      .setOrigin(0.5);

    drawRoundedPanel(this, sx(24), sy(112), GAME_WIDTH - sx(48), sy(138), ss(20));

    const category = this.draft ? categoryLabels[this.draft.category] : "자유 질문";
    const question = this.draft?.question ?? "아직 질문이 없습니다.";

    this.add
      .text(sx(46), sy(134), `봉인된 별자리 · ${category}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(14)}px`,
        color: "#f6d365",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);

    this.add
      .text(sx(46), sy(166), question, {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(15)}px`,
        color: "#f8f0ff",
        lineSpacing: ss(6),
        wordWrap: { width: sx(298) },
      })
      .setOrigin(0, 0);

    this.guideText = this.add
      .text(GAME_WIDTH / 2, sy(292), "봉인된 질문이 제단 위에서 세 갈래의 빛으로 나뉩니다...", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(15)}px`,
        color: "#d9c8ff",
        align: "center",
        wordWrap: { width: sx(330) },
      })
      .setOrigin(0.5);

    this.createSealedCards();
    this.createReadingButton();
    this.playAltarIntro();
  }

  private createSealedCards(): void {
    const cardWidth = sx(92);
    const cardHeight = sy(150);
    const touchWidth = sx(122);
    const touchHeight = sy(258);
    const gap = sx(4);
    const totalWidth = touchWidth * 3 + gap * 2;
    const startTouchX = Math.round((GAME_WIDTH - totalWidth) / 2);
    const y = sy(392);

    this.drawnCards.forEach((card, index) => {
      const touchX = startTouchX + index * (touchWidth + gap);
      const x = touchX + Math.round((touchWidth - cardWidth) / 2);
      const container = this.add.container(x, y);
      const seal = this.add.circle(cardWidth / 2, cardHeight / 2, ss(62), 0x6d4aff, 0.12);
      const back = this.createCardBack(cardWidth, cardHeight);
      const front = this.createCardFront(card, cardWidth, cardHeight);
      const positionLabel = this.add
        .text(cardWidth / 2, cardHeight + sy(28), `${index + 1}번째 봉인`, {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${ss(14)}px`,
          color: "#fff6d6",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      front.setVisible(false);
      front.setAlpha(0);
      container.add([seal, back, front, positionLabel]);
      container.setAlpha(0);
      container.setY(y + sy(26));

      const hitZone = this.add.zone(touchX + touchWidth / 2, y + touchHeight / 2 - sy(56), touchWidth, touchHeight).setInteractive({ useHandCursor: true });
      hitZone.disableInteractive();

      const view: CardView = { container, back, front, seal, hitZone, revealed: false };
      this.cardViews.push(view);
      hitZone.on("pointerdown", () => this.revealCard(view, index));

      this.tweens.add({ targets: container, alpha: 0.28, y, delay: index * 150, duration: 520, ease: "Sine.easeOut" });
      this.tweens.add({ targets: seal, alpha: 0.3, scale: 1.18, duration: 1700 + index * 180, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    });
  }

  private playAltarIntro(): void {
    const centerX = GAME_WIDTH / 2;
    const startY = sy(318);
    const targetY = sy(468);
    const veil = this.add.rectangle(centerX, sy(466), GAME_WIDTH, sy(460), 0x03020a, 0.12).setDepth(20);
    const sealGlow = addSoftGlow(this, centerX, startY, 21, 0.82);
    const sealRing = addRuneRing(this, centerX, startY, 22, 0.42);
    const sealRingAlt = addRuneRing(this, centerX, startY, 22, 0.28);
    const sealMark = addSigil(this, centerX, startY, 23, 0.42);

    const beams = this.cardViews.map((view, index) => {
      const cardCenterX = view.container.x + sx(46);
      const cardCenterY = view.container.y + sy(76);
      const tint = index === 0 ? 0xb58cff : index === 1 ? 0xf6d365 : 0x8ee6ff;
      return createMagicBeam(this, centerX, targetY, cardCenterX, cardCenterY, 21, tint);
    });

    this.tweens.add({ targets: [sealMark, sealRing, sealRingAlt], alpha: 0.96, duration: 420, ease: "Sine.easeOut" });
    this.tweens.add({ targets: sealGlow, alpha: 0.45, scale: 1.2, duration: 620, ease: "Sine.easeOut" });
    this.tweens.add({ targets: [sealGlow, sealRing, sealRingAlt, sealMark], y: targetY, delay: 460, duration: 860, ease: "Cubic.easeInOut" });
    this.tweens.add({ targets: sealRing, angle: 210, delay: 460, duration: 1200, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: sealRingAlt, angle: -160, delay: 520, duration: 1280, ease: "Sine.easeInOut" });

    beams.forEach((beam, index) => {
      this.tweens.add({ targets: beam, alpha: 0.85, delay: 1180 + index * 120, duration: 420, yoyo: true, hold: 240, ease: "Sine.easeInOut", onComplete: () => beam.destroy() });
    });

    this.cardViews.forEach((view, index) => {
      this.tweens.add({ targets: view.container, alpha: 1, scale: { from: 0.92, to: 1 }, delay: 1480 + index * 160, duration: 720, ease: "Back.easeOut" });
      this.time.delayedCall(1700 + index * 170, () => {
        const x = view.container.x + sx(46);
        const y = view.container.y + sy(76);
        const glow = addSoftGlow(this, x, y, 18, 0.42);
        this.tweens.add({ targets: glow, alpha: 0.42, scale: 1.35, duration: 420, yoyo: true, ease: "Sine.easeInOut", onComplete: () => glow.destroy() });
        this.spawnRevealSparkles(x, y, index, false);
      });
    });

    fadeDestroy(this, [sealGlow, sealRing, sealRingAlt, sealMark, veil], 1880, 680);

    this.time.delayedCall(2360, () => {
      this.altarIntroDone = true;
      this.guideText?.setText("세 개의 봉인이 질문에 응답하려 합니다. 하나씩 손을 얹어 여세요.");
      this.cardViews.forEach((view) => {
        if (!view.revealed) view.hitZone.setInteractive({ useHandCursor: true });
      });
    });
  }

  private createCardBack(width: number, height: number): Phaser.GameObjects.Container {
    const back = this.add.container(0, 0);
    const frame = this.add.graphics();
    frame.fillStyle(0x160c32, 0.98);
    frame.fillRoundedRect(0, 0, width, height, ss(17));
    frame.lineStyle(ss(3), 0xf6d365, 0.96);
    frame.strokeRoundedRect(0, 0, width, height, ss(17));
    frame.lineStyle(ss(1), 0xb58cff, 0.58);
    frame.strokeRoundedRect(ss(8), ss(8), width - ss(16), height - ss(16), ss(12));
    frame.lineStyle(ss(1), 0xf6d365, 0.36);
    frame.strokeCircle(width / 2, height / 2, ss(29));
    frame.strokeCircle(width / 2, height / 2, ss(42));

    const moon = this.add.text(width / 2, sy(44), "☾", { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${ss(26)}px`, color: "#f6d365" }).setOrigin(0.5);
    const sigil = this.add.text(width / 2, height / 2 + sy(4), "✦", { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${ss(34)}px`, color: "#b58cff" }).setOrigin(0.5);
    const star = this.add.text(width / 2, height - sy(34), "✧", { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${ss(20)}px`, color: "#f6d365" }).setOrigin(0.5);

    back.add([frame, moon, sigil, star]);
    return back;
  }

  private createCardFront(card: DrawnCard, width: number, height: number): Phaser.GameObjects.Container {
    const front = this.add.container(0, 0);
    const koreanName = this.add.text(width / 2, -sy(48), card.koreanName, { fontFamily: "system-ui, sans-serif", fontSize: `${ss(16)}px`, color: "#fff6d6", fontStyle: "bold", align: "center", stroke: "#09071a", strokeThickness: ss(3) }).setOrigin(0.5);
    const englishName = this.add.text(width / 2, -sy(25), card.name, { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${ss(10)}px`, color: "#d9c8ff", align: "center", wordWrap: { width: width + sx(44) }, stroke: "#09071a", strokeThickness: ss(2) }).setOrigin(0.5);
    const frame = this.add.graphics();
    frame.fillStyle(0x07040f, 0.98);
    frame.fillRoundedRect(0, 0, width, height, ss(17));
    frame.lineStyle(ss(3), 0xf6d365, 0.96);
    frame.strokeRoundedRect(0, 0, width, height, ss(17));
    const image = this.add.image(width / 2, height / 2, card.imageKey).setOrigin(0.5);
    image.setDisplaySize(width - ss(12), height - ss(12));
    front.add([koreanName, englishName, frame, image]);
    return front;
  }

  private revealCard(view: CardView, index: number): void {
    if (!this.altarIntroDone || view.revealed) return;
    view.revealed = true;
    this.revealedCount += 1;
    view.hitZone.disableInteractive();

    const revealLines = ["첫 번째 문은 지나간 시간에 닿아 있습니다.", "두 번째 문은 지금 당신의 중심을 비춥니다.", "세 번째 문은 아직 오지 않은 가능성을 품고 있습니다."];
    this.guideText?.setText(revealLines[index] ?? "카드의 문이 열렸습니다.");

    const centerX = view.container.x + sx(46);
    const centerY = view.container.y + sy(76);
    const glow = addSoftGlow(this, centerX, centerY, 30, 0.78);
    const ring = addRuneRing(this, centerX, centerY, 31, 0.32);
    const ringAlt = addRuneRing(this, centerX, centerY, 31, 0.22);

    this.tweens.add({ targets: glow, alpha: 0.42, scale: 1.45, duration: 520, ease: "Sine.easeOut" });
    this.tweens.add({ targets: ring, alpha: 0.72, angle: 220, scale: 0.58, duration: 920, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: ringAlt, alpha: 0.45, angle: -180, scale: 0.42, duration: 960, ease: "Sine.easeInOut" });
    this.spawnRevealSparkles(centerX, centerY, index, true);

    this.tweens.add({
      targets: view.container,
      scaleX: 0.02,
      duration: 520,
      ease: "Sine.easeInOut",
      onComplete: () => {
        view.back.setVisible(false);
        view.front.setVisible(true);
        view.front.setAlpha(0);
        playBurst(this, centerX, centerY, 34, 1.05);
        playSmoke(this, centerX, centerY, 33, 0.9);
        this.tweens.add({ targets: view.container, scaleX: 1, duration: 660, ease: "Cubic.easeOut" });
        this.time.delayedCall(360, () => {
          this.tweens.add({ targets: view.front, alpha: 1, duration: 980, ease: "Sine.easeInOut" });
          this.spawnRevealSparkles(centerX, centerY, index, false);
          fadeDestroy(this, [glow, ring, ringAlt], 760, 820);
        });
      },
    });

    if (this.revealedCount >= this.cardViews.length) {
      this.guideText?.setText("세 개의 봉인이 모두 열렸습니다. 이제 점술사가 별빛을 읽습니다.");
      this.time.delayedCall(1300, () => this.showReadingButton());
    }
  }

  private spawnRevealSparkles(x: number, y: number, index: number, wide: boolean): void {
    const radiusMin = ss(wide ? 36 : 24);
    const radiusMax = ss(wide ? 118 : 84);
    const count = wide ? 30 : 20;
    if (spawnTextureSparkles(this, x, y, 35, count, radiusMin, radiusMax)) return;

    for (let i = 0; i < count; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(radiusMin, radiusMax);
      const sparkle = this.add.text(x, y, i % 3 === 0 ? "✦" : i % 3 === 1 ? "✧" : "·", { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${i % 3 === 2 ? ss(25) : ss(16)}px`, color: i % 2 === 0 ? "#ffffff" : "#f6d365" }).setOrigin(0.5);
      this.tweens.add({ targets: sparkle, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance, alpha: 0, scale: Phaser.Math.FloatBetween(0.65, 1.65), delay: index * 18, duration: Phaser.Math.Between(980, 1480), ease: "Cubic.easeOut", onComplete: () => sparkle.destroy() });
    }
  }

  private createReadingButton(): void {
    const width = sx(310);
    const height = sy(68);
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT - sy(102);
    const container = this.add.container(x, y).setVisible(false).setAlpha(0);
    const panel = this.add.graphics();
    panel.fillStyle(0x1b1238, 0.96);
    panel.fillRoundedRect(-width / 2, -height / 2, width, height, ss(22));
    panel.lineStyle(ss(3), 0xf6d365, 0.92);
    panel.strokeRoundedRect(-width / 2, -height / 2, width, height, ss(22));
    const label = this.add.text(0, 0, "점술사의 해석을 듣는다", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(18)}px`, color: "#fff6d6", fontStyle: "bold" }).setOrigin(0.5);
    container.add([panel, label]);
    this.readingButtonZone = this.add.zone(x, y, width, height).setInteractive({ useHandCursor: true });
    this.readingButtonZone.disableInteractive();
    this.readingButtonZone.on("pointerdown", () => this.startReading());
    this.readingButton = container;
  }

  private showReadingButton(): void {
    if (!this.readingButton || !this.readingButtonZone) return;
    const targetY = GAME_HEIGHT - sy(110);
    this.readingButton.setVisible(true);
    this.readingButtonZone.setInteractive({ useHandCursor: true });
    this.readingButtonZone.setPosition(GAME_WIDTH / 2, targetY);
    this.tweens.add({ targets: this.readingButton, alpha: 1, y: targetY, duration: 720, ease: "Back.easeOut" });
  }

  private startReading(): void {
    if (!this.draft || this.isStartingReading) return;
    this.isStartingReading = true;
    this.readingButtonZone?.disableInteractive();
    const data: ReadingSceneData = { draft: this.draft, cards: this.drawnCards };
    this.cameras.main.fadeOut(480, 9, 7, 26);
    this.time.delayedCall(500, () => this.scene.start("ReadingScene", data));
  }
}
