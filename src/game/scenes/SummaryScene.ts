import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, sy, ss } from "../GameConfig";
import { drawMysticBackground } from "../ui/drawPanel";
import { exportSummaryImage } from "../utils/summaryImageExport";
import type { ChatSceneData } from "./ReadingScene";

type SummaryCard = {
  position: string;
  name: string;
  koreanName: string;
  reading: string;
  imageUrl?: string;
  imageKey?: string;
};

const SUMMARY_DOM_Y = 1020;
const SUMMARY_DOM_START_Y = 1080;
const CARD_READING_PREVIEW_LENGTH = 46;

export class SummaryScene extends Phaser.Scene {
  private sceneData?: ChatSceneData;
  private shell?: HTMLElement;
  private domElement?: Phaser.GameObjects.DOMElement;
  private shareButton?: HTMLButtonElement;
  private copyButton?: HTMLButtonElement;
  private saveImageButton?: HTMLButtonElement;

  constructor() {
    super("SummaryScene");
  }

  init(data: ChatSceneData): void {
    this.sceneData = data;
  }

  create(): void {
    drawMysticBackground(this, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(GAME_WIDTH / 2, sy(48), "별빛의 기록", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${ss(31)}px`,
        color: "#f8f0ff",
        stroke: "#2c174f",
        strokeThickness: ss(5),
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, sy(84), "내 질문과 카드의 흐름을 한 장의 기록으로 남깁니다.", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(13)}px`,
        color: "#cdbdff",
        align: "center",
      })
      .setOrigin(0.5);

    this.createSummaryDom();
  }

  private createSummaryDom(): void {
    const data = this.sceneData;
    const reading = data?.reading;
    const shell = document.createElement("section");
    shell.className = "arcana-summary-shell";

    if (!data || !reading) {
      shell.innerHTML = `
        <article class="arcana-summary-card">
          <p class="arcana-summary-eyebrow">기록을 불러오지 못했습니다</p>
          <h1 class="arcana-summary-title">흐려진 별빛</h1>
          <p class="arcana-summary-text">리딩 기록을 찾을 수 없습니다. 새 질문으로 다시 시작해주세요.</p>
        </article>
        <div class="arcana-summary-actions">
          <button class="arcana-button arcana-summary-button" type="button" data-new-reading>새 질문</button>
        </div>
      `;
    } else {
      const cards = this.getSummaryCards();
      shell.innerHTML = `
        <article class="arcana-summary-card" data-summary-card>
          <div class="arcana-summary-header">
            <p class="arcana-summary-eyebrow">${this.escapeHtml(data.spread.name)} · ${cards.length}장의 기록</p>
            <h1 class="arcana-summary-title">${this.escapeHtml(reading.title || "별빛의 기록")}</h1>
          </div>

          <section class="arcana-summary-section question-section">
            <h2>내 질문</h2>
            <p>${this.escapeHtml(data.draft.question)}</p>
          </section>

          <section class="arcana-summary-section">
            <h2>선택 카드</h2>
            <div class="arcana-summary-card-list">
              ${cards.map((card) => this.renderCardItem(card)).join("")}
            </div>
          </section>

          <section class="arcana-summary-section summary-only-section">
            <h2>요약</h2>
            <p>${this.escapeHtml(reading.summary)}</p>
          </section>
        </article>

        <div class="arcana-summary-actions">
          <button class="arcana-button arcana-summary-button" type="button" data-share-reading>공유하기</button>
          <button class="arcana-button arcana-summary-button secondary" type="button" data-save-image>이미지 저장</button>
          <button class="arcana-button arcana-summary-button secondary" type="button" data-copy-reading>텍스트 복사</button>
          <button class="arcana-button arcana-summary-button ghost" type="button" data-new-reading>새 질문</button>
        </div>
      `;
    }

    this.shell = shell;
    this.shareButton = shell.querySelector<HTMLButtonElement>("[data-share-reading]") ?? undefined;
    this.copyButton = shell.querySelector<HTMLButtonElement>("[data-copy-reading]") ?? undefined;
    this.saveImageButton = shell.querySelector<HTMLButtonElement>("[data-save-image]") ?? undefined;

    this.shareButton?.addEventListener("click", () => void this.shareReading());
    this.copyButton?.addEventListener("click", () => void this.copyReading());
    this.saveImageButton?.addEventListener("click", () => this.saveSummaryImage());
    shell.querySelector<HTMLButtonElement>("[data-new-reading]")?.addEventListener("click", () => this.restartReading());

    this.domElement = this.add.dom(GAME_WIDTH / 2, SUMMARY_DOM_START_Y, shell).setOrigin(0.5);
    this.domElement.setAlpha(0);
    this.tweens.add({ targets: this.domElement, alpha: 1, y: SUMMARY_DOM_Y, duration: 760, ease: "Sine.easeOut" });
  }

  private getSummaryCards(): SummaryCard[] {
    const data = this.sceneData;
    if (!data) return [];

    return data.cards.map((drawnCard, index) => {
      const readingCard = data.reading.cards[index];
      return {
        position: drawnCard.position,
        name: drawnCard.name,
        koreanName: drawnCard.koreanName,
        reading: readingCard?.reading ?? drawnCard.description,
        imageUrl: drawnCard.imageUrl,
        imageKey: drawnCard.imageKey,
      };
    });
  }

  private renderCardItem(card: SummaryCard): string {
    const image = card.imageUrl
      ? `<img class="arcana-summary-card-image" src="${this.escapeHtml(card.imageUrl)}" alt="${this.escapeHtml(card.koreanName)}" />`
      : `<div class="arcana-summary-card-fallback">✦</div>`;

    return `
      <div class="arcana-summary-card-item">
        ${image}
        <div class="arcana-summary-card-copy">
          <strong>${this.escapeHtml(card.position)}</strong>
          <span>${this.escapeHtml(card.koreanName)} · ${this.escapeHtml(card.name)}</span>
          <p>${this.escapeHtml(this.limitText(this.getFirstSentence(card.reading), CARD_READING_PREVIEW_LENGTH))}</p>
        </div>
      </div>
    `;
  }

  private async shareReading(): Promise<void> {
    const text = this.getShareText();
    if (!text) return;

    if (navigator.share) {
      try {
        await navigator.share({ title: "별빛의 기록", text });
        this.setActionFeedback("공유 창을 열었습니다.");
        return;
      } catch {
        // 사용자가 공유를 취소한 경우도 여기로 들어올 수 있어 복사 fallback을 제공한다.
      }
    }

    await this.copyToClipboard(text);
  }

  private async copyReading(): Promise<void> {
    const text = this.getShareText();
    if (!text) return;
    await this.copyToClipboard(text);
  }

  private async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.setActionFeedback("리딩 요약을 복사했습니다.");
    } catch {
      this.setActionFeedback("복사를 지원하지 않는 환경입니다.");
    }
  }

  private saveSummaryImage(): void {
    if (!this.sceneData) return;
    exportSummaryImage(this, this.sceneData, this.getSummaryCards());
    this.setActionFeedback("이미지를 저장했습니다.");
  }

  private getShareText(): string {
    const data = this.sceneData;
    if (!data) return "";

    const cardLines = this.getSummaryCards()
      .map((card) => `- ${card.position}: ${card.koreanName} (${card.name})`)
      .join("\n");

    return [
      "별빛의 기록",
      `질문: ${data.draft.question}`,
      `배열: ${data.spread.name}`,
      "선택 카드:",
      cardLines,
      `요약: ${data.reading.summary}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  private setActionFeedback(message: string): void {
    const target = this.saveImageButton ?? this.copyButton ?? this.shareButton;
    if (!target) return;
    const original = target.textContent ?? "이미지 저장";
    target.textContent = message;
    window.setTimeout(() => {
      target.textContent = original;
    }, 1300);
  }

  private restartReading(): void {
    this.domElement?.destroy();
    this.scene.start("QuestionScene");
  }

  private getFirstSentence(value: string): string {
    return value.split(/(?<=[.!?。！？]|다\.|요\.)\s+/).map((sentence) => sentence.trim()).filter(Boolean)[0] ?? value;
  }

  private limitText(value: string, maxLength: number): string {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength).trim()}...`;
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
