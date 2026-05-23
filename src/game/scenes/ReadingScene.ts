import Phaser from "phaser";
import { requestReading } from "../../api/client";
import type { ReadingResponse } from "../../api/types";
import { GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
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
      .text(GAME_WIDTH / 2, sy(54), "점술사의 해석", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${ss(32)}px`,
        color: "#f8f0ff",
        stroke: "#2c174f",
        strokeThickness: ss(5),
      })
      .setOrigin(0.5);

    this.createCardSummary();
    this.createLoadingPanel();
    void this.loadReading();
  }

  private createCardSummary(): void {
    if (!this.dataForReading) return;

    const y = sy(108);
    const cardWidth = sx(104);
    const cardHeight = sy(108);
    const gap = sx(12);
    const totalWidth = cardWidth * 3 + gap * 2;
    const startX = Math.round((GAME_WIDTH - totalWidth) / 2);

    this.dataForReading.cards.forEach((card, index) => {
      const x = startX + index * (cardWidth + gap);
      drawRoundedPanel(this, x, y, cardWidth, cardHeight, ss(14));
      this.add
        .text(x + cardWidth / 2, y + sy(20), card.position, {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${ss(12)}px`,
          color: "#f6d365",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.add
        .text(x + cardWidth / 2, y + sy(52), card.visual.symbol, {
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: `${ss(26)}px`,
          color: "#f8f0ff",
        })
        .setOrigin(0.5);
      this.add
        .text(x + cardWidth / 2, y + sy(84), card.koreanName, {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${ss(12)}px`,
          color: "#fff6d6",
          fontStyle: "bold",
          align: "center",
          wordWrap: { width: cardWidth - sx(14) },
        })
        .setOrigin(0.5);
    });
  }

  private createLoadingPanel(): void {
    drawRoundedPanel(this, sx(24), sy(264), GAME_WIDTH - sx(48), sy(210), ss(22));

    this.add
      .text(GAME_WIDTH / 2, sy(338), "Gemma AI 점술사가 질문과 카드를 연결해 읽고 있습니다...", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(16)}px`,
        color: "#f8f0ff",
        align: "center",
        wordWrap: { width: sx(300) },
      })
      .setOrigin(0.5);

    const orb = this.add.circle(GAME_WIDTH / 2, sy(404), ss(18), 0xb58cff, 0.42);
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
    const drawnCards = this.dataForReading?.cards ?? [];
    const cards =
      reading.cards.length > 0
        ? reading.cards
        : drawnCards.map((card) => ({
            position: card.position,
            name: card.name,
            koreanName: card.koreanName,
            reading: card.description,
          }));

    const shell = document.createElement("section");
    shell.className = "arcana-reading-shell";
    shell.innerHTML = `
      <div class="arcana-reading-panel" data-reading-panel>
        <div class="arcana-ai-badge">Gemma AI 점술사 응답</div>
        <h1 class="arcana-reading-title">${this.escapeHtml(reading.title)}</h1>
        <div class="arcana-reading-question">
          <strong>내 질문 기반 리딩</strong>
          ${this.escapeHtml(question)}
        </div>
        <p class="arcana-reading-summary">${this.escapeHtml(reading.summary)}</p>
        <div class="arcana-reading-stage-title">카드가 하나씩 의미를 드러냅니다</div>
        ${cards
          .slice(0, 3)
          .map((card, index) => {
            const source = drawnCards[index];
            const keywords = source?.keywords?.join(" · ") ?? "";
            const symbol = source?.visual.symbol ?? "✦";
            return `
              <article class="arcana-reading-card" data-reading-step="${index}">
                <div class="arcana-card-head">
                  <div class="arcana-card-orb">${this.escapeHtml(symbol)}</div>
                  <div>
                    <h3>${this.escapeHtml(card.position)} · ${this.escapeHtml(card.koreanName)}</h3>
                    <p class="arcana-card-subtitle">${this.escapeHtml(card.name)}</p>
                  </div>
                </div>
                ${keywords ? `<p class="arcana-card-keywords">상징 키워드 · ${this.escapeHtml(keywords)}</p>` : ""}
                <p>${this.escapeHtml(card.reading)}</p>
              </article>
            `;
          })
          .join("")}
        <article class="arcana-reading-advice" data-reading-step="3">
          <h3>종합 조언</h3>
          <p>${this.escapeHtml(reading.advice)}</p>
        </article>
        <p class="arcana-reading-npc" data-reading-step="4">“${this.escapeHtml(reading.npcLine)}”</p>
      </div>
      <div class="arcana-reading-actions">
        <button class="arcana-button" data-action="chat">더 물어보기</button>
        <button class="arcana-button" data-action="restart">다시 점치기</button>
      </div>
    `;

    this.readingDom = this.add.dom(GAME_WIDTH / 2, sy(512), shell).setOrigin(0.5);
    this.readingDom.setAlpha(0);
    this.tweens.add({ targets: this.readingDom, alpha: 1, y: sy(502), duration: 520, ease: "Sine.easeOut" });
    this.revealReadingSteps(shell);

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

  private revealReadingSteps(shell: HTMLElement): void {
    const panel = shell.querySelector<HTMLElement>("[data-reading-panel]");
    const steps = Array.from(shell.querySelectorAll<HTMLElement>("[data-reading-step]"));

    steps.forEach((step, index) => {
      window.setTimeout(() => {
        step.classList.add("is-visible");
        if (panel) {
          panel.scrollTo({ top: Math.max(step.offsetTop - 90, 0), behavior: "smooth" });
        }
      }, 700 + index * 850);
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
