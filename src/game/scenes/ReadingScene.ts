import Phaser from "phaser";
import { requestReading } from "../../api/client";
import type { ReadingResponse } from "../../api/types";
import { GAME_HEIGHT, GAME_WIDTH } from "../GameConfig";
import { drawMysticBackground, drawRoundedPanel } from "../ui/drawPanel";
import type { ReadingSceneData } from "./CardSelectScene";

export class ReadingScene extends Phaser.Scene {
  private dataForReading?: ReadingSceneData;
  private statusText?: Phaser.GameObjects.Text;

  constructor() {
    super("ReadingScene");
  }

  init(data: ReadingSceneData): void {
    this.dataForReading = data;
  }

  create(): void {
    drawMysticBackground(this, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(GAME_WIDTH / 2, 54, "점술사의 해석", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "32px",
        color: "#f8f0ff",
        stroke: "#2c174f",
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.createCardSummary();
    this.createLoadingPanel();
    void this.loadReading();
  }

  private createCardSummary(): void {
    if (!this.dataForReading) return;

    const y = 108;
    const cardWidth = 104;
    const gap = 12;
    const totalWidth = cardWidth * 3 + gap * 2;
    const startX = (GAME_WIDTH - totalWidth) / 2;

    this.dataForReading.cards.forEach((card, index) => {
      const x = startX + index * (cardWidth + gap);
      drawRoundedPanel(this, x, y, cardWidth, 108, 14);
      this.add
        .text(x + cardWidth / 2, y + 20, card.position, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "12px",
          color: "#f6d365",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.add
        .text(x + cardWidth / 2, y + 52, card.visual.symbol, {
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "26px",
          color: "#f8f0ff",
        })
        .setOrigin(0.5);
      this.add
        .text(x + cardWidth / 2, y + 84, card.koreanName, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "12px",
          color: "#fff6d6",
          fontStyle: "bold",
          align: "center",
          wordWrap: { width: cardWidth - 14 },
        })
        .setOrigin(0.5);
    });
  }

  private createLoadingPanel(): void {
    drawRoundedPanel(this, 24, 264, GAME_WIDTH - 48, 210, 22);

    this.statusText = this.add
      .text(GAME_WIDTH / 2, 338, "점술사가 별빛을 읽고 있습니다...", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "17px",
        color: "#f8f0ff",
        align: "center",
        wordWrap: { width: 300 },
      })
      .setOrigin(0.5);

    const orb = this.add.circle(GAME_WIDTH / 2, 404, 18, 0xb58cff, 0.42);
    this.tweens.add({
      targets: orb,
      scale: 1.35,
      alpha: 0.14,
      yoyo: true,
      repeat: -1,
      duration: 820,
      ease: "Sine.easeInOut",
    });
  }

  private async loadReading(): Promise<void> {
    if (!this.dataForReading) return;

    try {
      const reading = await requestReading({
        category: this.dataForReading.draft.category,
        question: this.dataForReading.draft.question,
        spreadId: "past-present-future",
        cards: this.dataForReading.cards,
      });
      this.renderReading(reading);
    } catch {
      this.renderReading({
        title: "흐려진 별빛",
        summary: "지금은 점술사의 목소리를 불러오지 못했습니다.",
        cards: [],
        advice: "잠시 후 다시 시도하거나 질문을 조금 더 짧게 적어보세요.",
        npcLine: "안개가 짙어졌지만, 문은 다시 열릴 것입니다.",
      });
    }
  }

  private renderReading(reading: ReadingResponse): void {
    this.children.removeAll();
    drawMysticBackground(this, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(GAME_WIDTH / 2, 48, reading.title, {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "27px",
        color: "#f8f0ff",
        stroke: "#2c174f",
        strokeThickness: 4,
        align: "center",
        wordWrap: { width: 330 },
      })
      .setOrigin(0.5);

    drawRoundedPanel(this, 22, 92, GAME_WIDTH - 44, 98, 18);
    this.add
      .text(42, 114, reading.summary, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#f8f0ff",
        lineSpacing: 5,
        wordWrap: { width: 306 },
      })
      .setOrigin(0, 0);

    let y = 210;
    const cards = reading.cards.length > 0 ? reading.cards : this.dataForReading?.cards.map((card) => ({
      position: card.position,
      name: card.name,
      koreanName: card.koreanName,
      reading: card.description,
    })) ?? [];

    cards.slice(0, 3).forEach((card) => {
      drawRoundedPanel(this, 22, y, GAME_WIDTH - 44, 112, 18);
      this.add
        .text(42, y + 18, `${card.position} · ${card.koreanName}`, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          color: "#f6d365",
          fontStyle: "bold",
        })
        .setOrigin(0, 0);
      this.add
        .text(42, y + 44, card.reading, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "13px",
          color: "#f8f0ff",
          lineSpacing: 4,
          wordWrap: { width: 306 },
        })
        .setOrigin(0, 0);
      y += 124;
    });

    drawRoundedPanel(this, 22, y, GAME_WIDTH - 44, 126, 18);
    this.add
      .text(42, y + 18, "조언", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#f6d365",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);
    this.add
      .text(42, y + 44, reading.advice, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#f8f0ff",
        lineSpacing: 4,
        wordWrap: { width: 306 },
      })
      .setOrigin(0, 0);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 104, `“${reading.npcLine}”`, {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "16px",
        color: "#fff6d6",
        align: "center",
        wordWrap: { width: 330 },
      })
      .setOrigin(0.5);

    this.createRestartButton();
  }

  private createRestartButton(): void {
    const width = 180;
    const height = 44;
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT - 44;

    const button = this.add.graphics();
    button.fillStyle(0x1b1238, 0.92);
    button.fillRoundedRect(x - width / 2, y - height / 2, width, height, 16);
    button.lineStyle(2, 0xf6d365, 0.84);
    button.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 16);

    this.add
      .text(x, y, "다시 점치기", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#fff6d6",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add.zone(x, y, width, height).setInteractive({ useHandCursor: true }).on("pointerdown", () => {
      this.scene.start("QuestionScene");
    });
  }
}
