import Phaser from "phaser";
import { requestReading } from "../../api/client";
import type { ReadingResponse } from "../../api/types";
import { GAME_WIDTH, sx, sy, ss } from "../GameConfig";
import { drawMysticBackground, drawRoundedPanel } from "../ui/drawPanel";
import type { ReadingSceneData } from "./CardSelectScene";

export type ChatSceneData = ReadingSceneData & {
  reading: ReadingResponse;
};

type StepCard = {
  position: string;
  name: string;
  koreanName: string;
  displayName: string;
  reading: string;
  symbol: string;
  roman: string;
  keywords: string;
  imageUrl: string;
};

const chapterTitles = ["제1장. 지나간 문", "제2장. 지금의 불꽃", "제3장. 아직 오지 않은 별"];
const chapterWhispers = [
  "지나간 시간은 사라지지 않고, 조용히 현재의 문턱을 비춥니다.",
  "지금 가장 크게 울리는 별빛은 당신의 선택 가까이에 있습니다.",
  "아직 고정되지 않은 길은 안개 속에서 천천히 모양을 갖춥니다.",
];

export class ReadingScene extends Phaser.Scene {
  private dataForReading?: ReadingSceneData;
  private readingDom?: Phaser.GameObjects.DOMElement;
  private currentStep = 0;
  private latestReading?: ReadingResponse;
  private stepCards: StepCard[] = [];
  private isStepLocked = false;
  private dialogueVisible = false;

  constructor() {
    super("ReadingScene");
  }

  init(data: ReadingSceneData): void {
    this.dataForReading = data;
    this.currentStep = 0;
    this.latestReading = undefined;
    this.stepCards = [];
    this.isStepLocked = false;
    this.dialogueVisible = false;
  }

  create(): void {
    drawMysticBackground(this, GAME_WIDTH, 1920);
    this.createLoadingPanel();
    void this.loadReading();
  }

  private createLoadingPanel(): void {
    drawRoundedPanel(this, sx(24), sy(264), GAME_WIDTH - sx(48), sy(230), ss(24));

    this.add
      .text(GAME_WIDTH / 2, sy(350), "점술사가 세 장의 별빛을 하나씩 읽고 있습니다...", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(17)}px`,
        color: "#f8f0ff",
        align: "center",
        wordWrap: { width: sx(310) },
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, sy(392), "봉인된 질문과 카드의 기억이 서로 맞물리는 중입니다.", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(13)}px`,
        color: "#cdbdff",
        align: "center",
        wordWrap: { width: sx(300) },
      })
      .setOrigin(0.5);

    const orb = this.add.circle(GAME_WIDTH / 2, sy(450), ss(20), 0xb58cff, 0.42);
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
    drawMysticBackground(this, GAME_WIDTH, 1920);

    this.latestReading = reading;
    this.currentStep = 0;
    this.dialogueVisible = false;
    this.stepCards = this.buildStepCards(reading);

    const shell = document.createElement("section");
    shell.className = "arcana-reading-shell tap-mode";
    this.readingDom = this.add.dom(GAME_WIDTH / 2, sy(390), shell).setOrigin(0.5);
    this.readingDom.setAlpha(0);
    this.tweens.add({ targets: this.readingDom, alpha: 1, y: sy(378), duration: 720, ease: "Sine.easeOut" });

    shell.addEventListener("click", () => this.handleTap(shell));
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
      const koreanName = source?.koreanName ?? card.koreanName;
      const name = source?.name ?? card.name;

      return {
        position: card.position,
        name,
        koreanName,
        displayName: source?.displayName ?? `${koreanName} (${name})`,
        reading: card.reading,
        symbol: source?.visual.symbol ?? "✦",
        roman: source?.roman ?? "",
        keywords: source?.keywords?.join(" · ") ?? "",
        imageUrl: source?.imageUrl ?? "",
      };
    });
  }

  private handleTap(shell: HTMLElement): void {
    if (this.isStepLocked || !this.latestReading || !this.dataForReading) return;
    this.isStepLocked = true;

    const isCardStep = this.currentStep < this.stepCards.length;

    if (isCardStep && !this.dialogueVisible) {
      this.dialogueVisible = true;
      this.revealDialogue(shell);
      window.setTimeout(() => {
        this.isStepLocked = false;
      }, 220);
      return;
    }

    if (isCardStep) {
      this.currentStep += 1;
      this.dialogueVisible = false;
      window.setTimeout(() => this.renderCurrentStep(shell), 120);
      return;
    }

    const data: ChatSceneData = { ...this.dataForReading, reading: this.latestReading };
    this.readingDom?.destroy();
    this.scene.start("ChatScene", data);
  }

  private revealDialogue(shell: HTMLElement): void {
    const stage = shell.querySelector<HTMLElement>(".arcana-step-stage.card-only");
    const dialogue = shell.querySelector<HTMLElement>("[data-dialogue]");
    const ghost = shell.querySelector<HTMLElement>("[data-question-ghost]");
    const hint = shell.querySelector<HTMLElement>("[data-tap-hint]");

    stage?.classList.add("has-dialogue");
    dialogue?.classList.add("is-visible");
    ghost?.classList.add("is-hidden");

    if (hint) {
      hint.textContent = this.currentStep === this.stepCards.length - 1 ? "터치하면 세 장의 계시" : "터치하면 다음 장으로";
    }
  }

  private renderCurrentStep(shell: HTMLElement): void {
    if (!this.latestReading) return;

    const question = this.dataForReading?.draft.question ?? "";
    const isCardStep = this.currentStep < this.stepCards.length;
    const card = this.stepCards[this.currentStep];
    const stepLabel = isCardStep ? `☾ ${this.currentStep + 1} / ${this.stepCards.length}` : "종장";
    const hint = isCardStep ? "터치하면 점술사의 해석" : "터치하면 점술사에게 더 묻기";

    shell.innerHTML = `
      <div class="arcana-reading-panel frameless">
        ${isCardStep ? `<div class="arcana-ai-badge floating">${this.escapeHtml(stepLabel)}</div>` : ""}
        ${isCardStep && card ? this.renderCardStep(card, question, this.currentStep) : this.renderAdviceStep(this.latestReading)}
        <div class="arcana-tap-hint" data-tap-hint>${this.escapeHtml(hint)}</div>
      </div>
    `;

    window.setTimeout(() => {
      this.isStepLocked = false;
    }, 300);
  }

  private renderCardStep(card: StepCard, question: string, index: number): string {
    const chapterTitle = chapterTitles[index] ?? `${card.position}의 문`;
    const whisper = chapterWhispers[index] ?? "카드의 빛이 조용히 당신의 질문에 닿습니다.";

    return `
      <div class="arcana-step-stage card-only">
        <div class="arcana-card-title-area">
          <h1 class="arcana-reading-title hero-title chapter-title">${this.escapeHtml(chapterTitle)}</h1>
          <p class="arcana-chapter-whisper">${this.escapeHtml(whisper)}</p>
        </div>
        <div class="arcana-big-card-wrap hero-card-wrap">
          <div class="arcana-reading-card-stack chapter-card">
            <article class="arcana-big-card hero-card image-card">
              ${card.imageUrl ? `<img class="arcana-card-image" src="${this.escapeHtml(card.imageUrl)}" alt="${this.escapeHtml(card.displayName)}" />` : `<div class="arcana-big-card-symbol">${this.escapeHtml(card.symbol)}</div>`}
            </article>
            <div class="arcana-reading-card-caption">
              <div class="arcana-reading-card-name-ko">${this.escapeHtml(card.koreanName)}</div>
              <div class="arcana-reading-card-name-en">${this.escapeHtml(card.name)}</div>
            </div>
          </div>
        </div>
        <div class="arcana-dialogue-slot">
          <div class="arcana-dialogue-box hero-dialogue" data-dialogue>
            <p class="arcana-dialogue-speaker">점술사</p>
            <p class="arcana-dialogue-text">${this.escapeHtml(card.reading)}</p>
          </div>
          <div class="arcana-question-ghost" data-question-ghost>봉인된 질문<br />${this.escapeHtml(question)}</div>
        </div>
      </div>
    `;
  }

  private renderAdviceStep(reading: ReadingResponse): string {
    return `
      <div class="arcana-step-stage advice-step tap-advice">
        <div class="arcana-advice-header">
          <h1 class="arcana-reading-title hero-title advice-title">종장. 세 장의 계시</h1>
          <p class="arcana-chapter-whisper">세 장의 별빛이 하나의 문장으로 모입니다.</p>
        </div>
        <div class="arcana-advice-lines">
          ${this.renderAdviceLines(reading.advice)}
        </div>
      </div>
    `;
  }

  private renderAdviceLines(advice: string): string {
    const sentences = advice
      .split(/(?<=[.!?。！？]|[.?!]|다\.)\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    const lines = sentences.length > 0 ? sentences : [advice];

    return lines
      .map(
        (line, index) =>
          `<p class="arcana-advice-line" style="animation-delay: ${360 + index * 520}ms">${this.escapeHtml(line)}</p>`,
      )
      .join("");
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
