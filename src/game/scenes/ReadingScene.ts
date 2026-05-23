import Phaser from "phaser";
import { requestReading } from "../../api/client";
import type { ReadingResponse } from "../../api/types";
import { GAME_HEIGHT, GAME_WIDTH } from "../GameConfig";
import { drawMysticBackground, drawRoundedPanel } from "../ui/drawPanel";
import type { ReadingSceneData } from "./CardSelectScene";

export type ChatSceneData = ReadingSceneData & {
  reading: ReadingResponse;
};

export class ReadingScene extends Phaser.Scene {
  private dataForReading?: ReadingSceneData;
  private readingDom?: Phaser.GameObjects.DOMElement;

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
    const startX = Math.round((GAME_WIDTH - totalWidth) / 2);

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

    this.add
      .text(GAME_WIDTH / 2, 338, "Gemma AI 점술사가 질문과 카드를 연결해 읽고 있습니다...", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
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
    this.createCardSummary();

    const question = this.dataForReading?.draft.question ?? "";
    const cards =
      reading.cards.length > 0
        ? reading.cards
        : this.dataForReading?.cards.map((card) => ({
            position: card.position,
            name: card.name,
            koreanName: card.koreanName,
            reading: card.description,
          })) ?? [];

    const shell = document.createElement("section");
    shell.className = "arcana-reading-shell";
    shell.innerHTML = `
      <div class="arcana-reading-panel">
        <div class="arcana-ai-badge">Gemma AI 점술사 응답</div>
        <h1 class="arcana-reading-title">${this.escapeHtml(reading.title)}</h1>
        <div class="arcana-reading-question">
          <strong>내 질문 기반 리딩</strong>
          ${this.escapeHtml(question)}
        </div>
        <p class="arcana-reading-summary">${this.escapeHtml(reading.summary)}</p>
        ${cards
          .slice(0, 3)
          .map(
            (card) => `
              <article class="arcana-reading-card">
                <h3>${this.escapeHtml(card.position)} · ${this.escapeHtml(card.koreanName)}</h3>
                <p>${this.escapeHtml(card.reading)}</p>
              </article>
            `,
          )
          .join("")}
        <article class="arcana-reading-advice">
          <h3>질문에 대한 조언</h3>
          <p>${this.escapeHtml(reading.advice)}</p>
        </article>
        <p class="arcana-reading-npc">“${this.escapeHtml(reading.npcLine)}”</p>
      </div>
      <div class="arcana-reading-actions">
        <button class="arcana-button" data-action="chat">더 물어보기</button>
        <button class="arcana-button" data-action="restart">다시 점치기</button>
      </div>
    `;

    this.readingDom = this.add.dom(GAME_WIDTH / 2, 512, shell).setOrigin(0.5);
    this.readingDom.setAlpha(0);
    this.tweens.add({ targets: this.readingDom, alpha: 1, y: 502, duration: 420, ease: "Sine.easeOut" });

    const chatButton = shell.querySelector<HTMLButtonElement>('[data-action="chat"]');
    const restartButton = shell.querySelector<HTMLButtonElement>('[data-action="restart"]');

    chatButton?.addEventListener("click", () => {
      if (!this.dataForReading) return;
      this.readingDom?.destroy();
      const data: ChatSceneData = { ...this.dataForReading, reading };
      this.scene.start("ChatScene", data);
    });

    restartButton?.addEventListener("click", () => {
      this.readingDom?.destroy();
      this.scene.start("QuestionScene");
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}
