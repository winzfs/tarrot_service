import Phaser from "phaser";
import { requestReading } from "../../api/client";
import type { ReadingResponse } from "../../api/types";
import { GAME_HEIGHT, GAME_WIDTH, sx, sy, ss } from "../GameConfig";
import { drawMysticBackground, drawRoundedPanel } from "../ui/drawPanel";
import { getDialogueSizeClass, isLongFinaleAdvice } from "../ui/layoutMetrics";
import { getQualityProfile, withQualityProfile } from "../performance/qualityProfile";
import { scheduleWallClock, type TimerTask } from "../performance/wallClockTimer";
import { TextObjectPool } from "../performance/textPool";
import type { ReadingSceneData } from "./CardSelectScene";

export type ChatSceneData = ReadingSceneData & {
  reading: ReadingResponse;
};

type StepCard = {
  position: string;
  positionId: string;
  positionMeaning: string;
  name: string;
  koreanName: string;
  displayName: string;
  reading: string;
  symbol: string;
  roman: string;
  keywords: string;
  imageUrl: string;
  isReversed: boolean;
};

const CARD_DIALOGUE_AUTO_REVEAL_DELAY_MS = withQualityProfile({ low: 2600, medium: 3200, high: 3600 });
const TAP_UNLOCK_AFTER_REVEAL_MS = 3000;
const ADVICE_LINE_BASE_DELAY_MS = 2850;
const ADVICE_LINE_STEP_DELAY_MS = 1150;
const ADVICE_LINE_FADE_MS = 1300;

export class ReadingScene extends Phaser.Scene {
  private dataForReading?: ReadingSceneData;
  private readingDom?: Phaser.GameObjects.DOMElement;
  private tapZone?: Phaser.GameObjects.Zone;
  private currentStep = 0;
  private latestReading?: ReadingResponse;
  private stepCards: StepCard[] = [];
  private isStepLocked = false;
  private dialogueVisible = false;
  private readonly pendingTimers: TimerTask[] = [];
  private textPool?: TextObjectPool;
  private loadingTitleText?: Phaser.GameObjects.Text;
  private loadingBodyText?: Phaser.GameObjects.Text;

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
    this.tapZone = undefined;
    this.pendingTimers.splice(0).forEach((task) => task.cancel());
    this.textPool ??= new TextObjectPool(this);
  }

  create(): void {
    drawMysticBackground(this, GAME_WIDTH, GAME_HEIGHT);
    this.createLoadingPanel();
    void this.loadReading();
  }

  private createLoadingPanel(): void {
    drawRoundedPanel(this, sx(24), sy(264), GAME_WIDTH - sx(48), sy(230), ss(24));

    this.textPool ??= new TextObjectPool(this);
    this.loadingTitleText = this.textPool.acquire({
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(17)}px`,
      color: "#f8f0ff",
      align: "center",
      wordWrap: { width: sx(310) },
    }).setPosition(GAME_WIDTH / 2, sy(350)).setOrigin(0.5).setText("점술사가 카드의 목소리를 엮고 있습니다...");

    this.loadingBodyText = this.textPool.acquire({
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(13)}px`,
      color: "#cdbdff",
      align: "center",
      wordWrap: { width: sx(300) },
    }).setPosition(GAME_WIDTH / 2, sy(392)).setOrigin(0.5).setText("봉인된 질문과 카드의 위치 의미가 서로 맞물리는 중입니다.");

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
        spreadId: this.dataForReading.spread.id,
        spreadName: this.dataForReading.spread.name,
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
    this.dialogueVisible = false;
    this.stepCards = this.buildStepCards(reading);

    const shell = document.createElement("section");
    shell.className = "arcana-reading-shell tap-mode full-screen-tap";
    this.readingDom = this.add.dom(GAME_WIDTH / 2, GAME_HEIGHT / 2, shell).setOrigin(0.5);
    this.readingDom.setAlpha(0);
    this.tweens.add({ targets: this.readingDom, alpha: 1, duration: 720, ease: "Sine.easeOut" });

    this.renderCurrentStep(shell);
    this.createTapZone(shell);
  }

  private createTapZone(shell: HTMLElement): void {
    this.tapZone?.destroy();
    this.tapZone = this.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT)
      .setDepth(9999)
      .setInteractive({ useHandCursor: true });
    this.tapZone.on("pointerdown", () => this.handleTap(shell));
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

    return cards.slice(0, drawnCards.length || cards.length).map((card, index) => {
      const source = drawnCards[index];
      const position = this.dataForReading?.spread.positions[index];
      const koreanName = source?.koreanName ?? card.koreanName;
      const name = source?.name ?? card.name;

      return {
        position: source?.position ?? card.position,
        positionId: source?.positionId ?? position?.id ?? `position-${index + 1}`,
        positionMeaning: source?.positionMeaning ?? position?.promptMeaning ?? position?.shortMeaning ?? "이 위치의 의미를 중심으로 해석합니다.",
        name,
        koreanName,
        displayName: source?.displayName ?? `${koreanName} (${name})`,
        reading: card.reading,
        symbol: source?.visual.symbol ?? "✦",
        roman: source?.roman ?? "",
        keywords: source?.keywords?.join(" · ") ?? "",
        imageUrl: source?.imageUrl ?? "",
        isReversed: source?.isReversed ?? (koreanName.includes("역방향") || name.includes("역방향")),
      };
    });
  }

  private handleTap(shell: HTMLElement): void {
    if (this.isStepLocked || !this.latestReading || !this.dataForReading) return;
    this.isStepLocked = true;

    const isCardStep = this.currentStep < this.stepCards.length;

    if (isCardStep) {
      this.currentStep += 1;
      this.dialogueVisible = false;
      this.pendingTimers.push(scheduleWallClock(() => this.renderCurrentStep(shell), 120));
      return;
    }

    const data: ChatSceneData = { ...this.dataForReading, reading: this.latestReading };
    this.tapZone?.destroy();
    this.readingDom?.destroy();
    this.scene.start("SummaryScene", data);
  }

  private revealDialogue(shell: HTMLElement): void {
    const stage = shell.querySelector<HTMLElement>(".arcana-step-stage.card-only");
    const dialogue = shell.querySelector<HTMLElement>("[data-dialogue]");
    const ghost = shell.querySelector<HTMLElement>("[data-question-ghost]");
    const hint = shell.querySelector<HTMLElement>("[data-tap-hint]");

    stage?.classList.add("has-dialogue");
    dialogue?.classList.add("is-visible");
    ghost?.classList.add("is-hidden");
    this.dialogueVisible = true;

    if (hint) {
      hint.textContent = this.currentStep === this.stepCards.length - 1 ? "다음 문을 열면 종장이 드러납니다" : "다음 문을 연다";
    }
  }

  private renderCurrentStep(shell: HTMLElement): void {
    if (!this.latestReading) return;

    const question = this.dataForReading?.draft.question ?? "";
    const isCardStep = this.currentStep < this.stepCards.length;
    const card = this.stepCards[this.currentStep];
    const stepLabel = isCardStep ? `${this.currentStep + 1} / ${this.stepCards.length}` : "종장";
    const hint = isCardStep ? "의식 5/5 · 카드의 속삭임을 듣는 중" : "종장의 목소리가 하나로 모이고 있습니다";

    this.isStepLocked = true;

    shell.innerHTML = `
      <div class="arcana-reading-panel frameless">
        ${isCardStep ? `<div class="arcana-ai-badge floating reading-progress-badge">${this.escapeHtml(stepLabel)}</div>` : ""}
        ${isCardStep && card ? this.renderCardStep(card, question, this.currentStep) : this.renderAdviceStep(this.latestReading)}
        <div class="arcana-tap-hint" data-tap-hint>${this.escapeHtml(hint)}</div>
      </div>
    `;

    if (isCardStep) {
      this.pendingTimers.push(scheduleWallClock(() => {
        if (this.currentStep < this.stepCards.length && !this.dialogueVisible) {
          this.revealDialogue(shell);
        }
        this.pendingTimers.push(scheduleWallClock(() => {
          this.isStepLocked = false;
        }, TAP_UNLOCK_AFTER_REVEAL_MS));
      }, CARD_DIALOGUE_AUTO_REVEAL_DELAY_MS));
      return;
    }

    const adviceLineCount = this.getAdviceLineCount(this.latestReading.advice);
    const adviceSettledDelay = ADVICE_LINE_BASE_DELAY_MS + Math.max(0, adviceLineCount - 1) * ADVICE_LINE_STEP_DELAY_MS + ADVICE_LINE_FADE_MS;
    this.pendingTimers.push(scheduleWallClock(() => {
      const hintElement = shell.querySelector<HTMLElement>("[data-tap-hint]");
      if (hintElement) hintElement.textContent = "별빛의 기록을 남긴다";
      this.pendingTimers.push(scheduleWallClock(() => {
        this.isStepLocked = false;
      }, TAP_UNLOCK_AFTER_REVEAL_MS));
    }, adviceSettledDelay));
  }

  private getSentenceParts(text: string): string[] {
    const parts = text
      .split(/(?<=[.!?。！？]|다\.|요\.)\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : [text];
  }

  private getChapterReadingText(text: string): string {
    return this.getSentenceParts(text).slice(0, 3).join(" ");
  }

  private formatDialogueText(text: string): string {
    return this.escapeHtml(this.getChapterReadingText(text))
      .replace(/([.!?。！？]|다\.)\s+/g, "$1<br />")
      .replace(/(요\.)\s+/g, "$1<br />");
  }

  private renderCardStep(card: StepCard, question: string, index: number): string {
    const position = this.dataForReading?.spread.positions[index];
    const chapterTitle = position?.chapterTitle ?? `${card.position}의 문`;
    const whisper = position?.shortMeaning ?? "카드의 빛이 조용히 당신의 질문에 닿습니다.";
    const aura = position?.aura ?? "present-aura";
    const dialogueSizeClass = getDialogueSizeClass(this.getChapterReadingText(card.reading));
    const profile = getQualityProfile();
    const blurClass = profile.enableBlur ? "" : " no-blur";
    const imageClass = card.isReversed ? "arcana-card-image is-reversed" : "arcana-card-image";

    return `
      <div class="arcana-step-stage card-only card-aura-preset ${aura} ${dialogueSizeClass}${blurClass}">
        <div class="arcana-card-title-area">
          <h1 class="arcana-reading-title hero-title chapter-title">${this.escapeHtml(chapterTitle)}</h1>
          <p class="arcana-chapter-whisper">${this.escapeHtml(whisper)}</p>
        </div>
        <div class="arcana-big-card-wrap hero-card-wrap">
          <div class="arcana-reading-card-stack chapter-card aura-card-stack">
            <div class="arcana-card-aura-glow" aria-hidden="true"></div>
            <article class="arcana-big-card hero-card image-card aura-card">
              ${card.imageUrl ? `<img class="${imageClass}" src="${this.escapeHtml(card.imageUrl)}" alt="${this.escapeHtml(card.displayName)}" />` : `<div class="arcana-big-card-symbol">${this.escapeHtml(card.symbol)}</div>`}
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
            <p class="arcana-dialogue-text">${this.formatDialogueText(card.reading)}</p>
          </div>
          <div class="arcana-question-ghost" data-question-ghost>봉인된 질문<br />${this.escapeHtml(question)}</div>
        </div>
      </div>
    `;
  }

  private renderAdviceStep(reading: ReadingResponse): string {
    const spreadName = this.dataForReading?.spread.name ?? "세 장의 계시";
    return `
      <div class="arcana-step-stage advice-only">
        <div class="arcana-card-title-area">
          <h1 class="arcana-reading-title hero-title chapter-title">종장 · ${this.escapeHtml(spreadName)}</h1>
          <p class="arcana-chapter-whisper">여기까지의 흐름이 하나의 목소리로 모입니다.</p>
        </div>
        <div class="arcana-dialogue-slot">
          <div class="arcana-dialogue-box hero-dialogue is-visible">
            <p class="arcana-dialogue-speaker">점술사</p>
            <p class="arcana-dialogue-text">${this.formatDialogueText(reading.advice)}</p>
          </div>
        </div>
      </div>
    `;
  }

  private getAdviceLines(advice: string): string[] {
    return this.getSentenceParts(advice);
  }

  private getAdviceLineCount(advice: string): number {
    return this.getAdviceLines(advice).length;
  }



  shutdown(): void {
    this.pendingTimers.splice(0).forEach((task) => task.cancel());
    if (this.textPool) {
      if (this.loadingTitleText) this.textPool.release(this.loadingTitleText);
      if (this.loadingBodyText) this.textPool.release(this.loadingBodyText);
      this.loadingTitleText = undefined;
      this.loadingBodyText = undefined;
    }
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
