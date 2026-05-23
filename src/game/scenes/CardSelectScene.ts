import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import type { ReadingDraft } from "../state/ReadingDraft";
import { categoryLabels } from "../state/ReadingDraft";
import { drawMysticBackground, drawRoundedPanel } from "../ui/drawPanel";
import { drawMajorArcana } from "../../tarot/cards";
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

  constructor() {
    super("CardSelectScene");
  }

  init(data: ReadingDraft): void {
    this.draft = data;
    this.drawnCards = drawMajorArcana(3).map((card, index) => ({
      ...card,
      position: positions[index],
    }));
    this.cardViews = [];
    this.revealedCount = 0;
    this.isStartingReading = false;
  }

  create(): void {
    drawMysticBackground(this, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(GAME_WIDTH / 2, sy(62), "카드의 제단", {
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
      .text(sx(46), sy(134), `영역 · ${category}`, {
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
      .text(GAME_WIDTH / 2, sy(292), "카드를 탭하면 봉인이 천천히 열립니다.", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(15)}px`,
        color: "#d9c8ff",
        align: "center",
        wordWrap: { width: sx(330) },
      })
      .setOrigin(0.5);

    this.createSealedCards();
    this.createReadingButton();
  }

  private createSealedCards(): void {
    const cardWidth = sx(92);
    const cardHeight = sy(150);
    const touchWidth = sx(122);
    const touchHeight = sy(226);
    const gap = sx(4);
    const totalWidth = touchWidth * 3 + gap * 2;
    const startTouchX = Math.round((GAME_WIDTH - totalWidth) / 2);
    const y = sy(352);

    this.drawnCards.forEach((card, index) => {
      const touchX = startTouchX + index * (touchWidth + gap);
      const x = touchX + Math.round((touchWidth - cardWidth) / 2);
      const container = this.add.container(x, y);
      const seal = this.add.circle(cardWidth / 2, cardHeight / 2, ss(62), 0x6d4aff, 0.12);
      const back = this.createCardBack(cardWidth, cardHeight);
      const front = this.createCardFront(card, cardWidth, cardHeight);
      const positionLabel = this.add
        .text(cardWidth / 2, cardHeight + sy(30), card.position, {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${ss(16)}px`,
          color: "#fff6d6",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      front.setVisible(false);
      front.setAlpha(0);
      container.add([seal, back, front, positionLabel]);
      container.setAlpha(0);
      container.setY(y + sy(26));

      const hitZone = this.add
        .zone(touchX + touchWidth / 2, y + touchHeight / 2 - sy(12), touchWidth, touchHeight)
        .setInteractive({ useHandCursor: true });

      const view: CardView = { container, back, front, seal, hitZone, revealed: false };
      this.cardViews.push(view);

      hitZone.on("pointerdown", () => this.revealCard(view, index));

      this.tweens.add({
        targets: container,
        alpha: 1,
        y,
        delay: index * 190,
        duration: 560,
        ease: "Back.easeOut",
      });

      this.tweens.add({
        targets: seal,
        alpha: 0.3,
        scale: 1.18,
        duration: 1700 + index * 180,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
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

    const moon = this.add.text(width / 2, sy(44), "☾", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${ss(26)}px`,
      color: "#f6d365",
    }).setOrigin(0.5);

    const sigil = this.add.text(width / 2, height / 2 + sy(4), "✦", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${ss(34)}px`,
      color: "#b58cff",
    }).setOrigin(0.5);

    const star = this.add.text(width / 2, height - sy(34), "✧", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${ss(20)}px`,
      color: "#f6d365",
    }).setOrigin(0.5);

    back.add([frame, moon, sigil, star]);
    return back;
  }

  private createCardFront(card: DrawnCard, width: number, height: number): Phaser.GameObjects.Container {
    const front = this.add.container(0, 0);
    const frame = this.add.graphics();
    frame.fillStyle(0x07040f, 0.98);
    frame.fillRoundedRect(0, 0, width, height, ss(17));
    frame.lineStyle(ss(3), 0xf6d365, 0.96);
    frame.strokeRoundedRect(0, 0, width, height, ss(17));

    const image = this.add.image(width / 2, height / 2, card.imageKey).setOrigin(0.5);
    image.setDisplaySize(width - ss(12), height - ss(12));

    const shade = this.add.graphics();
    shade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.42, 0.42);
    shade.fillRoundedRect(ss(6), height - sy(42), width - ss(12), sy(36), ss(10));

    const name = this.add
      .text(width / 2, height - sy(24), card.displayName, {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(8)}px`,
        color: "#fff6d6",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: width - sx(12) },
      })
      .setOrigin(0.5);

    front.add([frame, image, shade, name]);
    return front;
  }

  private revealCard(view: CardView, index: number): void {
    if (view.revealed) return;
    view.revealed = true;
    this.revealedCount += 1;
    view.hitZone.disableInteractive();

    const centerX = view.container.x + sx(46);
    const centerY = view.container.y + sy(76);
    const whiteBloom = this.add.circle(centerX, centerY, ss(18), 0xffffff, 0);
    const goldBloom = this.add.circle(centerX, centerY, ss(22), 0xfff6d6, 0);
    const wave1 = this.add.circle(centerX, centerY, ss(18), 0xffffff, 0).setStrokeStyle(ss(4), 0xffffff, 0.9);
    const wave2 = this.add.circle(centerX, centerY, ss(32), 0xf6d365, 0).setStrokeStyle(ss(3), 0xf6d365, 0.72);
    const purpleRing = this.add.circle(centerX, centerY, ss(42), 0xb58cff, 0).setStrokeStyle(ss(2), 0xb58cff, 0.62);

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

        whiteBloom.setAlpha(0.96);
        goldBloom.setAlpha(0.62);

        this.tweens.add({
          targets: whiteBloom,
          scale: 5.6,
          alpha: 0.9,
          duration: 500,
          yoyo: true,
          hold: 260,
          ease: "Sine.easeInOut",
        });

        this.tweens.add({
          targets: goldBloom,
          scale: 7.2,
          alpha: 0.12,
          duration: 1300,
          ease: "Sine.easeOut",
          onComplete: () => goldBloom.destroy(),
        });

        this.tweens.add({
          targets: wave1,
          scale: 7.5,
          alpha: 0,
          duration: 1400,
          ease: "Cubic.easeOut",
          onComplete: () => wave1.destroy(),
        });

        this.tweens.add({
          targets: wave2,
          scale: 5.8,
          alpha: 0,
          duration: 1550,
          ease: "Cubic.easeOut",
          onComplete: () => wave2.destroy(),
        });

        this.tweens.add({
          targets: purpleRing,
          scale: 4.2,
          alpha: 0,
          duration: 1700,
          ease: "Cubic.easeOut",
          onComplete: () => purpleRing.destroy(),
        });

        this.tweens.add({
          targets: view.container,
          scaleX: 1,
          duration: 660,
          ease: "Back.easeOut",
        });

        this.time.delayedCall(420, () => {
          this.tweens.add({
            targets: view.front,
            alpha: 1,
            duration: 1060,
            ease: "Sine.easeInOut",
          });
          this.tweens.add({
            targets: whiteBloom,
            scale: 0.9,
            alpha: 0,
            duration: 1080,
            ease: "Sine.easeInOut",
            onComplete: () => whiteBloom.destroy(),
          });
          this.spawnRevealSparkles(centerX, centerY, index, false);
        });
      },
    });

    if (this.revealedCount >= this.cardViews.length) {
      this.guideText?.setText("세 장의 문양이 모두 열렸습니다. 아래 버튼을 탭하세요.");
      this.time.delayedCall(1300, () => this.showReadingButton());
    }
  }

  private spawnRevealSparkles(x: number, y: number, index: number, wide: boolean): void {
    const count = wide ? 30 : 20;
    for (let i = 0; i < count; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(ss(wide ? 36 : 26), ss(wide ? 118 : 82));
      const sparkle = this.add
        .text(x, y, i % 3 === 0 ? "✦" : i % 3 === 1 ? "✧" : "·", {
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: `${i % 3 === 2 ? ss(25) : ss(16)}px`,
          color: i % 2 === 0 ? "#ffffff" : "#f6d365",
        })
        .setOrigin(0.5);

      this.tweens.add({
        targets: sparkle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: Phaser.Math.FloatBetween(0.65, 1.65),
        delay: index * 18,
        duration: Phaser.Math.Between(980, 1480),
        ease: "Cubic.easeOut",
        onComplete: () => sparkle.destroy(),
      });
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

    const label = this.add
      .text(0, 0, "질문 기반 AI 리딩 받기", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(19)}px`,
        color: "#fff6d6",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

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
