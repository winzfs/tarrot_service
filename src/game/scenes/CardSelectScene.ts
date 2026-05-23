import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../GameConfig";
import type { ReadingDraft } from "../state/ReadingDraft";
import { categoryLabels } from "../state/ReadingDraft";
import { drawMysticBackground, drawRoundedPanel } from "../ui/drawPanel";

export class CardSelectScene extends Phaser.Scene {
  private draft?: ReadingDraft;

  constructor() {
    super("CardSelectScene");
  }

  init(data: ReadingDraft): void {
    this.draft = data;
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

    this.createPlaceholderCards();

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 112, "다음 Phase에서 실제 카드 선택과 뒤집기 연출을 구현합니다.", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#cdbdff",
        align: "center",
        wordWrap: { width: 310 },
      })
      .setOrigin(0.5);
  }

  private createPlaceholderCards(): void {
    const cardWidth = 88;
    const cardHeight = 142;
    const gap = 20;
    const totalWidth = cardWidth * 3 + gap * 2;
    const startX = (GAME_WIDTH - totalWidth) / 2;
    const y = 362;

    ["과거", "현재", "미래"].forEach((label, index) => {
      const x = startX + index * (cardWidth + gap);
      const card = this.add.graphics();
      card.fillStyle(0x1b1238, 0.96);
      card.fillRoundedRect(x, y, cardWidth, cardHeight, 16);
      card.lineStyle(2, 0xf6d365, 0.86);
      card.strokeRoundedRect(x, y, cardWidth, cardHeight, 16);
      card.lineStyle(1, 0xb58cff, 0.38);
      card.strokeRoundedRect(x + 8, y + 8, cardWidth - 16, cardHeight - 16, 12);

      this.add.text(x + cardWidth / 2, y + 48, "✦", { fontSize: "26px", color: "#f6d365" }).setOrigin(0.5);
      this.add
        .text(x + cardWidth / 2, y + cardHeight + 28, label, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "15px",
          color: "#fff6d6",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
    });
  }
}
