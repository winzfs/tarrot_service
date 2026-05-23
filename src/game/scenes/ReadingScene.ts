import Phaser from "phaser";
import { requestReading } from "../../api/client";
import type { ReadingResponse } from "../../api/types";
import { GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import { drawMysticBackground, drawRoundedPanel } from "../ui/drawPanel";
import type { ReadingSceneData } from "./CardSelectScene";

export type ChatSceneData = ReadingSceneData & {
  reading: ReadingResponse;
};

type StepCard = {
  position: string;
  name: string;
  koreanName: string;
  reading: string;
  symbol: string;
  roman: string;
  keywords: string;
};

export class ReadingScene extends Phaser.Scene {
  private dataForReading?: ReadingSceneData;
  private readingDom?: Phaser.GameObjects.DOMElement;
  private currentStep = 0;
  private latestReading?: ReadingResponse;
  private stepCards: StepCard[] = [];
  private isStepLocked = false;

  constructor() {
    super("ReadingScene");
  }

  init(data: ReadingSceneData): void {
    this.dataForReading = data;
    this.currentStep = 0;
    this.latestReading = undefined;
    this.stepCards = [];
    this.isStepLocked = false;
  }

  create(): void {
    drawMysticBackground(this, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(GAME_WIDTH / 2, sy(68), "점술사의 해석", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${ss(34)}px`,
        color: "#f8f0ff",
        stroke: "#2c174f",
        strokeThickness: ss(5),
      })
      .setOrigin(0.5);

    this.createLoadingPanel();
    void this.loadReading();
  }

  private createLoadingPanel(): void {
    drawRoundedPanel(this, sx(24), sy(264), GAME_WIDTH - sx(48), sy(230), ss(24));

    this.add
      .text(GAME_WIDTH / 2, sy(350), "Gemma AI 점술사가 질문과 카드를 연결해 읽고 있습니다...", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(17)}px`,
        color: "#f8f0ff",
        align: "center",
        wordWrap: { width: sx(310) },
      })
      .setOrigin(0.5);

    const orb = this.add.circle(GAME_WIDTH / 2, sy(430), ss(20), 0xb58cff, 0.42);
    this.tweens.add({
      targets: orb,
      scale: 1.42,
      alpha: 0.14,
      yoyo: true,
      repeat: -1,
      duration: 1100,
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

    this.latestReading = reading;
    this.currentStep = 0;
    this.stepCards = this.buildStepCards(reading);

    const shell = document.createElement("section");
    shell.className = "arcana-reading-shell";
    this.readingDom = this.add.dom(GAME_WIDTH / 2, sy(500), shell).setOrigin(0.5);
    this.readingDom.setAlpha(0);
    this.tweens.add({ targets: this.readingDom, alpha: 1, y: sy(492), duration: 620, ease: "Sine.easeOut" });

    this.renderCurrentStep(shell);
  }

  private buildStepCards(reading: ReadingResponse): StepCard[] {
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

    return cards.slice(0, 3).map((card, index) => {
      const source = drawnCards[index];
      return {
        position: card.position,
        name: card.name,
        koreanName: card.koreanName,
        reading: card.reading,
        symbol: source?.visual.symbol ?? "✦",
        roman: source?.roman ?? "",
        keywords: source?.keywords?.join(" · ") ?? "",
      };
    });
  }

  private renderCurrentStep(shell: HTMLElement): void {
    if (!this.latestReading) return;

    const question = this.dataForReading?.draft.question ?? "";
    const isCardStep = this.currentStep < this.stepCards.length;
    const card = this.stepCards[this.currentStep];
    const stepLabel = isCardStep ? `${this.currentStep + 1} / ${this.stepCards.length}` : "종합 조언";
    const nextLabel = isCardStep
      ? this.currentStep === this.stepCards.length - 1
        ? "종합 조언 보기"
        : "다음 카드 보기"
      : "더 물어보기";

    shell.innerHTML = `
      <div class="arcana-reading-panel">
        <div class="arcana-ai-badge">Gemma AI 점술사 응답 · ${this.escapeHtml(stepLabel)}</div>
        ${isCardStep && card ? this.renderCardStep(card, question) : this.renderAdviceStep(this.latestReading)}
      </div>
      <div class="arcana-step-actions">
        <button class="arcana-button" data-action="next">${this.escapeHtml(nextLabel)}</button>
        <button class="arcana-button" data-action="restart">다시 점치기</button>
      </div>
    `;

    this.isStepLocked = false;

    shell.querySelector<HTMLButtonElement>('[data-action="next"]')?.addEventListener("click", () => {
      if (this.isStepLocked || !this.latestReading || !this.dataForReading) return;
      this.isStepLocked = true;

      if (this.currentStep < this.stepCards.length) {
        this.currentStep += 1;
        shell.classList.add("is-changing-step");
        window.setTimeout(() => this.renderCurrentStep(shell), 260);
        return;
      }

      const data: ChatSceneData = { ...this.dataForReading, reading: this.latestReading };
      this.readingDom?.destroy();
      this.scene.start("ChatScene", data);
    });

    shell.querySelector<HTMLButtonElement>('[data-action="restart"]')?.addEventListener("click", () => {
      if (this.isStepLocked) return;
      this.isStepLocked = true;
      this.readingDom?.destroy();
      this.scene.start("QuestionScene");
    });
  }

  private renderCardStep(card: StepCard, question: string): string {
    return `
      <div class="arcana-step-stage">
        <div>
          <h1 class="arcana-reading-title">${this.escapeHtml(card.position)}의 카드</h1>
          <div class="arcana-reading-question compact">
            <strong>내 질문</strong>
            ${this.escapeHtml(question)}
          </div>
        </div>
        <div class="arcana-big-card-wrap">
          <article class="arcana-big-card">
            <div class="arcana-big-card-position">${this.escapeHtml(card.position)} · ${this.escapeHtml(card.roman)}</div>
            <div class="arcana-big-card-symbol">${this.escapeHtml(card.symbol)}</div>
            <div class="arcana-big-card-name">${this.escapeHtml(card.koreanName)}</div>
            <div class="arcana-big-card-keywords">${this.escapeHtml(card.keywords || card.name)}</div>
          </article>
        </div>
        <div class="arcana-dialogue-box">
          <p class="arcana-dialogue-speaker">점술사</p>
          <p class="arcana-dialogue-text">${this.escapeHtml(card.reading)}</p>
        </div>
      </div>
    `;
  }

  private renderAdviceStep(reading: ReadingResponse): string {
    return `
      <div class="arcana-step-stage advice-step">
        <div>
          <h1 class="arcana-reading-title">${this.escapeHtml(reading.title)}</h1>
          <p class="arcana-reading-summary">${this.escapeHtml(reading.summary)}</p>
        </div>
        <div class="arcana-advice-card">
          <div>
            <h3>종합 조언</h3>
            <p>${this.escapeHtml(reading.advice)}</p>
          </div>
        </div>
        <div class="arcana-dialogue-box">
          <p class="arcana-dialogue-speaker">점술사</p>
          <p class="arcana-dialogue-text">“${this.escapeHtml(reading.npcLine)}”</p>
        </div>
      </div>
    `;
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
