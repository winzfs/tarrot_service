import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, sy, ss } from "../GameConfig";
import { drawMysticBackground } from "../ui/drawPanel";
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
    const data = this.sceneData;
    if (!data) return;

    const cards = this.getSummaryCards();
    const width = 1080;
    const measureCanvas = document.createElement("canvas");
    measureCanvas.width = width;
    measureCanvas.height = 2000;
    const measureCtx = measureCanvas.getContext("2d");
    if (!measureCtx) return;

    let measuredY = 350;
    measuredY += this.measureImageSection(measureCtx, data.draft.question, 920, 34, 48) + 28;
    measuredY += this.measureCardsSection(measureCtx, cards, 888) + 20;
    measuredY += this.measureImageSection(measureCtx, data.reading.summary, 920, 34, 48);
    const height = Math.max(1420, measuredY + 118);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#281653");
    gradient.addColorStop(0.55, "#100827");
    gradient.addColorStop(1, "#05020e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(246, 211, 101, 0.86)";
    ctx.lineWidth = 6;
    ctx.strokeRect(54, 54, canvas.width - 108, canvas.height - 108);
    ctx.strokeStyle = "rgba(255, 246, 214, 0.22)";
    ctx.lineWidth = 2;
    ctx.strokeRect(78, 78, canvas.width - 156, canvas.height - 156);

    ctx.textAlign = "center";
    ctx.fillStyle = "#f6d365";
    ctx.font = "700 34px system-ui, sans-serif";
    ctx.fillText(`${data.spread.name} · ${cards.length}장의 기록`, canvas.width / 2, 150);

    ctx.fillStyle = "#fff6d6";
    ctx.font = "700 58px Georgia, serif";
    this.drawWrappedText(ctx, data.reading.title || "별빛의 기록", canvas.width / 2, 225, 800, 70, "center", 2);

    let y = 350;
    y = this.drawImageSection(ctx, "내 질문", data.draft.question, y, 920, 34, 48);

    y += 28;
    y = this.drawCardsSection(ctx, cards, y, 888);

    y += 20;
    this.drawImageSection(ctx, "요약", data.reading.summary, y, 920, 34, 48);

    const link = document.createElement("a");
    link.download = "arcana-reading-summary.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    this.setActionFeedback("이미지를 저장했습니다.");
  }

  private measureCardsSection(ctx: CanvasRenderingContext2D, cards: SummaryCard[], width: number): number {
    let height = 54;
    cards.forEach((card) => {
      height += this.measureCardRow(ctx, card, width) + 16;
    });
    return height;
  }

  private drawCardsSection(ctx: CanvasRenderingContext2D, cards: SummaryCard[], y: number, width: number): number {
    this.drawImageSectionTitle(ctx, "선택 카드", y);
    y += 54;
    cards.forEach((card) => {
      const rowHeight = this.measureCardRow(ctx, card, width);
      const x = 96;
      ctx.strokeStyle = "rgba(246, 211, 101, 0.34)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, rowHeight);
      ctx.fillStyle = "rgba(22, 12, 50, 0.68)";
      ctx.fillRect(x, y, width, rowHeight);
      this.drawCardImage(ctx, card, x + 22, y + 12, 72, 96);
      ctx.textAlign = "left";
      ctx.fillStyle = "#f6d365";
      ctx.font = "700 26px system-ui, sans-serif";
      ctx.fillText(card.position, x + 118, y + 36);
      ctx.fillStyle = "#fff6d6";
      ctx.font = "700 30px system-ui, sans-serif";
      const nameLines = this.getWrappedLines(ctx, `${card.koreanName} · ${card.name}`, width - 150).slice(0, 2);
      nameLines.forEach((line, index) => ctx.fillText(line, x + 118, y + 72 + index * 34));
      ctx.fillStyle = "#d9c8ff";
      ctx.font = "500 22px system-ui, sans-serif";
      const readingLines = this.getWrappedLines(ctx, this.getFirstSentence(card.reading), width - 150).slice(0, 2);
      const readingY = y + 78 + nameLines.length * 34;
      readingLines.forEach((line, index) => ctx.fillText(line, x + 118, readingY + index * 28));
      y += rowHeight + 16;
    });
    return y;
  }

  private measureCardRow(ctx: CanvasRenderingContext2D, card: SummaryCard, width: number): number {
    ctx.font = "700 30px system-ui, sans-serif";
    const nameLines = this.getWrappedLines(ctx, `${card.koreanName} · ${card.name}`, width - 150).slice(0, 2);
    ctx.font = "500 22px system-ui, sans-serif";
    const readingLines = this.getWrappedLines(ctx, this.getFirstSentence(card.reading), width - 150).slice(0, 2);
    return Math.max(120, 52 + nameLines.length * 34 + readingLines.length * 28 + 22);
  }

  private drawCardImage(ctx: CanvasRenderingContext2D, card: SummaryCard, x: number, y: number, width: number, height: number): void {
    ctx.fillStyle = "rgba(7, 4, 15, 0.96)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "rgba(246, 211, 101, 0.78)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    if (!card.imageKey || !this.textures.exists(card.imageKey)) {
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff6d6";
      ctx.font = "700 34px Georgia, serif";
      ctx.fillText("✦", x + width / 2, y + height / 2 + 12);
      return;
    }

    const source = this.textures.get(card.imageKey).getSourceImage() as CanvasImageSource & { width?: number; height?: number };
    const sourceWidth = source.width ?? width;
    const sourceHeight = source.height ?? height;
    const scale = Math.min(width / sourceWidth, height / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;
    ctx.drawImage(source, drawX, drawY, drawWidth, drawHeight);
  }

  private measureImageSection(ctx: CanvasRenderingContext2D, body: string, width: number, fontSize: number, lineHeight: number): number {
    ctx.font = `500 ${fontSize}px system-ui, sans-serif`;
    const lines = this.getWrappedLines(ctx, body, width - 64);
    return 96 + Math.max(1, lines.length) * lineHeight;
  }

  private drawImageSection(ctx: CanvasRenderingContext2D, title: string, body: string, y: number, width: number, fontSize: number, lineHeight: number): number {
    const x = 80;
    const padding = 32;
    ctx.font = `500 ${fontSize}px system-ui, sans-serif`;
    const lines = this.getWrappedLines(ctx, body, width - padding * 2);
    const height = 96 + Math.max(1, lines.length) * lineHeight;
    ctx.fillStyle = "rgba(10, 7, 27, 0.62)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "rgba(246, 211, 101, 0.38)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    this.drawImageSectionTitle(ctx, title, y + 34);
    ctx.textAlign = "left";
    ctx.fillStyle = "#f8f0ff";
    ctx.font = `500 ${fontSize}px system-ui, sans-serif`;
    lines.forEach((line, index) => ctx.fillText(line, x + padding, y + 88 + index * lineHeight));
    return y + height;
  }

  private drawImageSectionTitle(ctx: CanvasRenderingContext2D, title: string, y: number): void {
    ctx.textAlign = "left";
    ctx.fillStyle = "#f6d365";
    ctx.font = "800 32px system-ui, sans-serif";
    ctx.fillText(title, 112, y);
  }

  private drawWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, align: CanvasTextAlign, maxLines = 3): number {
    const lines = this.getWrappedLines(ctx, text, maxWidth).slice(0, maxLines);
    ctx.textAlign = align;
    lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
    return y + lines.length * lineHeight;
  }

  private getWrappedLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const chars = Array.from(text.replace(/\s+/g, " "));
    const lines: string[] = [];
    let current = "";
    chars.forEach((char) => {
      const candidate = current + char;
      if (ctx.measureText(candidate).width > maxWidth && current.trim().length > 0) {
        lines.push(current.trimEnd());
        current = char.trimStart();
      } else {
        current = candidate;
      }
    });
    if (current.trim().length > 0) lines.push(current.trimEnd());
    return lines.length > 0 ? lines : [text];
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
