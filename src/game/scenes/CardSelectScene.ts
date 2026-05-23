import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../GameConfig";
import type { ReadingDraft } from "../state/ReadingDraft";
import { categoryLabels } from "../state/ReadingDraft";
import { drawMysticBackground, drawRoundedPanel } from "../ui/drawPanel";
import { drawMajorArcana } from "../../tarot/cards";
import type { DrawnCard } from "../../tarot/types";

const positions = ["과거", "현재", "미래"];

export type ReadingSceneData = {
  draft: ReadingDraft;
  cards: DrawnCard[];
};

export class CardSelectScene extends Phaser.Scene {
  private draft?: ReadingDraft;
  private drawnCards: DrawnCard[] = [];

  constructor() {
    super("CardSelectScene");
  }

  init(data: ReadingDraft): void {
    this.draft = data;
    this.drawnCards = drawMajorArcana(3).map((card, index) => ({
      ...card,
      position: positions[index],
    }));
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

    this.createDrawnCards();
    this.createReadingButton();
  }

  private createDrawnCards(): void {
    const cardWidth = 92;
    const cardHeight = 150;
    const gap = 14;
    const totalWidth = cardWidth * 3 + gap * 2;
    const startX = (GAME_WIDTH - totalWidth) / 2;
    const y = 346;

    this.drawnCards.forEach((card, index) => {
      const x = startX + index * (cardWidth + gap);
      const container = this.add.container(x, y);
      const frame = this.add.graphics();

      frame.fillStyle(0x1b1238, 0.96);
      frame.fillRoundedRect(0, 0, cardWidth, cardHeight, 16);
      frame.lineStyle(2, 0xf6d365, 0.9);
      frame.strokeRoundedRect(0, 0, cardWidth, cardHeight, 16);
      frame.lineStyle(1, 0xb58cff, 0.42);
      frame.strokeRoundedRect(8, 8, cardWidth - 16, cardHeight - 16, 12);

      const roman = this.add
        .text(cardWidth / 2, 20, card.roman, {
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "14px",
          color: "#f6d365",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      const symbol = this.add
        .text(cardWidth / 2, 68, card.visual.symbol, {
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "34px",
          color: this.getPaletteColor(card.visual.palette),
        })
        .setOrigin(0.5);

      const name = this.add
        .text(cardWidth / 2, 108, card.name.replace("Wheel of Fortune", "Wheel"), {
          fontFamily: "system-ui, sans-serif",
          fontSize: "10px",
          color: "#f8f0ff",
          align: "center",
          wordWrap: { width: cardWidth - 14 },
        })
        .setOrigin(0.5);

      const koreanName = this.add
        .text(cardWidth / 2, 130, card.koreanName, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "12px",
          color: "#fff6d6",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      const positionLabel = this.add
        .text(cardWidth / 2, cardHeight + 28, card.position, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "15px",
          color: "#fff6d6",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      container.add([frame, roman, symbol, name, koreanName, positionLabel]);
      container.setAlpha(0);
      container.setY(y + 24);

      this.tweens.add({
        targets: container,
        alpha: 1,
        y,
        delay: index * 180,
        duration: 360,
        ease: "Back.easeOut",
      });
    });
  }

  private createReadingButton(): void {
    const width = 258;
    const height = 58;
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT - 106;

    const panel = this.add.graphics();
    panel.fillStyle(0x1b1238, 0.94);
    panel.fillRoundedRect(x - width / 2, y - height / 2, width, height, 18);
    panel.lineStyle(2, 0xf6d365, 0.9);
    panel.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 18);

    const label = this.add
      .text(x, y, "점술사에게 해석 맡기기", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        color: "#fff6d6",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const hitArea = this.add.zone(x, y, width, height).setInteractive({ useHandCursor: true });

    hitArea.on("pointerdown", () => {
      if (!this.draft) return;
      const data: ReadingSceneData = {
        draft: this.draft,
        cards: this.drawnCards,
      };
      this.cameras.main.fadeOut(280, 9, 7, 26);
      this.time.delayedCall(300, () => this.scene.start("ReadingScene", data));
    });
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
