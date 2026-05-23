import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../GameConfig";
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
  private guideText?: Phaser.GameObjects.Text;

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
  }

  create(): void {
    drawMysticBackground(this, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(GAME_WIDTH / 2, 62, "카드의 제단", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "34px",
        color: "#f8f0ff",
        stroke: "#2c174f",
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    drawRoundedPanel(this, 24, 112, GAME_WIDTH - 48, 138, 20);

    const category = this.draft ? categoryLabels[this.draft.category] : "자유 질문";
    const question = this.draft?.question ?? "아직 질문이 없습니다.";

    this.add
      .text(46, 134, `영역 · ${category}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#f6d365",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);

    this.add
      .text(46, 166, question, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        color: "#f8f0ff",
        lineSpacing: 6,
        wordWrap: { width: 298 },
      })
      .setOrigin(0, 0);

    this.guideText = this.add
      .text(GAME_WIDTH / 2, 292, "봉인된 카드를 하나씩 눌러 운명의 문양을 여세요.", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#d9c8ff",
        align: "center",
        wordWrap: { width: 320 },
      })
      .setOrigin(0.5);

    this.createSealedCards();
    this.createReadingButton();
  }

  private createSealedCards(): void {
    const cardWidth = 92;
    const cardHeight = 150;
    const gap = 14;
    const totalWidth = cardWidth * 3 + gap * 2;
    const startX = Math.round((GAME_WIDTH - totalWidth) / 2);
    const y = 352;

    this.drawnCards.forEach((card, index) => {
      const x = startX + index * (cardWidth + gap);
      const container = this.add.container(x, y);
      const seal = this.add.circle(cardWidth / 2, cardHeight / 2, 62, 0x6d4aff, 0.12);
      const back = this.createCardBack(cardWidth, cardHeight);
      const front = this.createCardFront(card, cardWidth, cardHeight);
      const positionLabel = this.add
        .text(cardWidth / 2, cardHeight + 28, card.position, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "15px",
          color: "#fff6d6",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      front.setVisible(false);
      container.add([seal, back, front, positionLabel]);
      container.setSize(cardWidth, cardHeight + 42);
      container.setInteractive(new Phaser.Geom.Rectangle(0, 0, cardWidth, cardHeight + 42), Phaser.Geom.Rectangle.Contains);
      container.setAlpha(0);
      container.setY(y + 26);

      const view: CardView = { container, back, front, seal, revealed: false };
      this.cardViews.push(view);

      container.on("pointerover", () => {
        if (!view.revealed) this.tweens.add({ targets: container, y: y - 8, duration: 160, ease: "Sine.easeOut" });
      });

      container.on("pointerout", () => {
        if (!view.revealed) this.tweens.add({ targets: container, y, duration: 160, ease: "Sine.easeOut" });
      });

      container.on("pointerdown", () => this.revealCard(view, index));

      this.tweens.add({
        targets: container,
        alpha: 1,
        y,
        delay: index * 180,
        duration: 420,
        ease: "Back.easeOut",
      });

      this.tweens.add({
        targets: seal,
        alpha: 0.22,
        scale: 1.12,
        duration: 1300 + index * 160,
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
    frame.fillRoundedRect(0, 0, width, height, 17);
    frame.lineStyle(3, 0xf6d365, 0.96);
    frame.strokeRoundedRect(0, 0, width, height, 17);
    frame.lineStyle(1, 0xb58cff, 0.58);
    frame.strokeRoundedRect(8, 8, width - 16, height - 16, 12);
    frame.lineStyle(1, 0xf6d365, 0.36);
    frame.strokeCircle(width / 2, height / 2, 29);
    frame.strokeCircle(width / 2, height / 2, 42);

    const moon = this.add.text(width / 2, 44, "☾", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: "26px",
      color: "#f6d365",
    }).setOrigin(0.5);

    const sigil = this.add.text(width / 2, height / 2 + 4, "✦", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: "34px",
      color: "#b58cff",
    }).setOrigin(0.5);

    const star = this.add.text(width / 2, height - 34, "✧", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: "20px",
      color: "#f6d365",
    }).setOrigin(0.5);

    back.add([frame, moon, sigil, star]);
    return back;
  }

  private createCardFront(card: DrawnCard, width: number, height: number): Phaser.GameObjects.Container {
    const front = this.add.container(0, 0);
    const frame = this.add.graphics();
    frame.fillStyle(0x1b1238, 0.98);
    frame.fillRoundedRect(0, 0, width, height, 17);
    frame.lineStyle(3, 0xf6d365, 0.96);
    frame.strokeRoundedRect(0, 0, width, height, 17);
    frame.lineStyle(1, 0xb58cff, 0.46);
    frame.strokeRoundedRect(8, 8, width - 16, height - 16, 12);

    const roman = this.add.text(width / 2, 20, card.roman, {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: "14px",
      color: "#f6d365",
      fontStyle: "bold",
    }).setOrigin(0.5);

    const symbol = this.add.text(width / 2, 67, card.visual.symbol, {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: "36px",
      color: this.getPaletteColor(card.visual.palette),
    }).setOrigin(0.5);

    const name = this.add.text(width / 2, 108, card.name.replace("Wheel of Fortune", "Wheel"), {
      fontFamily: "system-ui, sans-serif",
      fontSize: "10px",
      color: "#f8f0ff",
      align: "center",
      wordWrap: { width: width - 14 },
    }).setOrigin(0.5);

    const koreanName = this.add.text(width / 2, 130, card.koreanName, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "12px",
      color: "#fff6d6",
      fontStyle: "bold",
    }).setOrigin(0.5);

    front.add([frame, roman, symbol, name, koreanName]);
    return front;
  }

  private revealCard(view: CardView, index: number): void {
    if (view.revealed) return;
    view.revealed = true;
    this.revealedCount += 1;
    view.container.disableInteractive();

    const flash = this.add.circle(view.container.x + 46, view.container.y + 76, 8, 0xf6d365, 0.55);
    const ring = this.add.circle(view.container.x + 46, view.container.y + 76, 10, 0xf6d365, 0).setStrokeStyle(2, 0xf6d365, 0.8);

    this.tweens.add({
      targets: view.container,
      y: view.container.y - 16,
      duration: 260,
      ease: "Sine.easeOut",
    });

    this.tweens.add({
      targets: ring,
      scale: 5.2,
      alpha: 0,
      duration: 680,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });

    this.tweens.add({
      targets: flash,
      scale: 5,
      alpha: 0,
      duration: 520,
      ease: "Cubic.easeOut",
      onComplete: () => flash.destroy(),
    });

    this.time.delayedCall(180, () => {
      this.tweens.add({
        targets: view.container,
        scaleX: 0.08,
        duration: 230,
        ease: "Cubic.easeIn",
        onComplete: () => {
          view.back.setVisible(false);
          view.front.setVisible(true);
          this.tweens.add({
            targets: view.container,
            scaleX: 1,
            y: view.container.y + 8,
            duration: 310,
            ease: "Back.easeOut",
          });
          this.spawnRevealSparkles(view.container.x + 46, view.container.y + 76, index);
        },
      });
    });

    if (this.revealedCount >= this.cardViews.length) {
      this.guideText?.setText("세 장의 문양이 모두 열렸습니다. 이제 점술사에게 해석을 맡기세요.");
      this.time.delayedCall(520, () => this.showReadingButton());
    }
  }

  private spawnRevealSparkles(x: number, y: number, index: number): void {
    for (let i = 0; i < 18; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(24, 72);
      const sparkle = this.add.text(x, y, i % 3 === 0 ? "✦" : "·", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: i % 3 === 0 ? "13px" : "22px",
        color: i % 2 === 0 ? "#f6d365" : "#b58cff",
      }).setOrigin(0.5);

      this.tweens.add({
        targets: sparkle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: Phaser.Math.FloatBetween(0.55, 1.3),
        delay: index * 20,
        duration: Phaser.Math.Between(520, 880),
        ease: "Cubic.easeOut",
        onComplete: () => sparkle.destroy(),
      });
    }
  }

  private createReadingButton(): void {
    const width = 258;
    const height = 58;
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT - 106;

    const container = this.add.container(x, y).setVisible(false).setAlpha(0);
    const panel = this.add.graphics();
    panel.fillStyle(0x1b1238, 0.94);
    panel.fillRoundedRect(-width / 2, -height / 2, width, height, 18);
    panel.lineStyle(2, 0xf6d365, 0.9);
    panel.strokeRoundedRect(-width / 2, -height / 2, width, height, 18);

    const label = this.add.text(0, 0, "점술사에게 해석 맡기기", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "18px",
      color: "#fff6d6",
      fontStyle: "bold",
    }).setOrigin(0.5);

    container.add([panel, label]);
    container.setSize(width, height);
    container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
    container.on("pointerdown", () => {
      if (!this.draft) return;
      const data: ReadingSceneData = { draft: this.draft, cards: this.drawnCards };
      this.cameras.main.fadeOut(320, 9, 7, 26);
      this.time.delayedCall(340, () => this.scene.start("ReadingScene", data));
    });

    this.readingButton = container;
  }

  private showReadingButton(): void {
    if (!this.readingButton) return;
    this.readingButton.setVisible(true);
    this.tweens.add({ targets: this.readingButton, alpha: 1, y: GAME_HEIGHT - 118, duration: 420, ease: "Back.easeOut" });
  }

  private getPaletteColor(palette: DrawnCard["visual"]["palette"]): string {
    switch (palette) {
      case "bright":
        return "#f6d365";
      case "dark":
        return "#b58cff";
      case "danger":
        return "#ff8aa3";
      case "hope":
        return "#8ee6ff";
      default:
        return "#f8f0ff";
    }
  }
}
