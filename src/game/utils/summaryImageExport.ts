import type Phaser from "phaser";
import type { ChatSceneData } from "../scenes/ReadingScene";

type ExportCard = {
  position: string;
  name: string;
  koreanName: string;
  reading: string;
  imageKey?: string;
};

const EXPORT_WIDTH = 1080;
const CARD_X = 70;
const CARD_WIDTH = 940;
const CARD_PADDING = 50;
const SECTION_X = CARD_X + CARD_PADDING;
const SECTION_WIDTH = CARD_WIDTH - CARD_PADDING * 2;
const CARD_INNER_X = CARD_X + 22;
const CARD_INNER_WIDTH = CARD_WIDTH - 44;
const SECTION_GAP = 42;

export function exportSummaryImage(scene: Phaser.Scene, data: ChatSceneData, cards: ExportCard[]): void {
  const measureCanvas = document.createElement("canvas");
  measureCanvas.width = EXPORT_WIDTH;
  measureCanvas.height = 2600;
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) return;

  let contentY = 54 + CARD_PADDING;
  contentY += measureHeader(measureCtx, data.reading.title || "별빛의 기록") + 36;
  contentY += measureImageSection(measureCtx, data.draft.question, SECTION_WIDTH, 34, 48) + 28;
  contentY += measureCardsSection(measureCtx, cards, SECTION_WIDTH) + 28;
  contentY += measureImageSection(measureCtx, data.reading.summary, SECTION_WIDTH, 34, 48);
  contentY += CARD_PADDING;

  const cardHeight = Math.max(1260, contentY - 54);
  const height = cardHeight + 108;
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  drawPageBackground(ctx, height);
  drawMainCard(ctx, CARD_X, 54, CARD_WIDTH, cardHeight);

  let y = 54 + CARD_PADDING;
  y = drawHeader(ctx, data.spread.name, cards.length, data.reading.title || "별빛의 기록", y);
  y += 36;
  y = drawImageSection(ctx, "내 질문", data.draft.question, y, SECTION_WIDTH, 34, 48);
  y += SECTION_GAP;
  y = drawCardsSection(scene, ctx, cards, y, SECTION_WIDTH);
  y += SECTION_GAP - 10;
  drawImageSection(ctx, "요약", data.reading.summary, y, SECTION_WIDTH, 34, 48);

  const link = document.createElement("a");
  link.download = "arcana-reading-summary.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function drawPageBackground(ctx: CanvasRenderingContext2D, height: number): void {
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#21104f");
  bg.addColorStop(0.56, "#100827");
  bg.addColorStop(1, "#05020e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, EXPORT_WIDTH, height);
}

function drawMainCard(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  const bg = ctx.createLinearGradient(x, y, x, y + height);
  bg.addColorStop(0, "rgba(38, 22, 82, 0.98)");
  bg.addColorStop(0.54, "rgba(14, 8, 34, 0.99)");
  bg.addColorStop(1, "rgba(7, 4, 18, 1)");
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, width, height);

  const topGlow = ctx.createRadialGradient(x + width / 2, y - height * 0.08, 0, x + width / 2, y - height * 0.08, width * 0.5);
  topGlow.addColorStop(0, "rgba(255, 246, 214, 0.20)");
  topGlow.addColorStop(1, "rgba(255, 246, 214, 0)");
  ctx.fillStyle = topGlow;
  ctx.fillRect(x, y, width, Math.min(260, height * 0.24));

  ctx.strokeStyle = "rgba(246, 211, 101, 0.74)";
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, width, height);
  ctx.strokeStyle = "rgba(255, 246, 214, 0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 22, y + 22, width - 44, height - 44);

  const glass = ctx.createLinearGradient(x, y + 30, x, y + 134);
  glass.addColorStop(0, "rgba(255, 246, 214, 0.10)");
  glass.addColorStop(1, "rgba(255, 246, 214, 0)");
  ctx.fillStyle = glass;
  ctx.fillRect(x + 54, y + 30, width - 108, 104);
}

function measureHeader(ctx: CanvasRenderingContext2D, title: string): number {
  ctx.font = "700 54px Georgia, serif";
  const titleLines = getWrappedLines(ctx, title, CARD_WIDTH - CARD_PADDING * 2).slice(0, 2);
  return 44 + 16 + titleLines.length * 62;
}

function drawHeader(ctx: CanvasRenderingContext2D, spreadName: string, cardCount: number, title: string, y: number): number {
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(7, 4, 18, 0.36)";
  ctx.fillRect(EXPORT_WIDTH / 2 - 250, y, 500, 44);
  ctx.strokeStyle = "rgba(246, 211, 101, 0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(EXPORT_WIDTH / 2 - 250, y, 500, 44);
  ctx.fillStyle = "#f6d365";
  ctx.font = "900 24px system-ui, sans-serif";
  ctx.fillText(`${spreadName} · ${cardCount}장의 기록`, EXPORT_WIDTH / 2, y + 30);

  ctx.fillStyle = "#fff6d6";
  ctx.font = "700 54px Georgia, serif";
  const lines = getWrappedLines(ctx, title, CARD_WIDTH - CARD_PADDING * 2).slice(0, 2);
  lines.forEach((line, index) => ctx.fillText(line, EXPORT_WIDTH / 2, y + 112 + index * 62));
  return y + 44 + 16 + lines.length * 62;
}

function measureCardsSection(ctx: CanvasRenderingContext2D, cards: ExportCard[], width: number): number {
  let height = 45 + 16;
  cards.forEach((card) => {
    height += measureCardRow(ctx, card, width) + 18;
  });
  return height;
}

function drawCardsSection(scene: Phaser.Scene, ctx: CanvasRenderingContext2D, cards: ExportCard[], y: number, width: number): number {
  drawImageSectionTitle(ctx, "선택 카드", y);
  y += 61;
  cards.forEach((card) => {
    const rowHeight = measureCardRow(ctx, card, width);
    drawGlassPanel(ctx, SECTION_X, y, width, rowHeight, "card");
    drawCardImage(scene, ctx, card, SECTION_X + 20, y + 20, 96, 118);
    ctx.textAlign = "left";
    ctx.fillStyle = "#f6d365";
    ctx.font = "950 24px system-ui, sans-serif";
    ctx.fillText(card.position, SECTION_X + 140, y + 40);
    ctx.fillStyle = "#fff6d6";
    ctx.font = "850 25px system-ui, sans-serif";
    const nameLines = getWrappedLines(ctx, `${card.koreanName} · ${card.name}`, width - 174).slice(0, 2);
    nameLines.forEach((line, index) => ctx.fillText(line, SECTION_X + 140, y + 75 + index * 33));
    ctx.fillStyle = "#d9c8ff";
    ctx.font = "500 20px system-ui, sans-serif";
    const readingLines = getWrappedLines(ctx, getFirstSentence(card.reading), width - 174).slice(0, 2);
    const readingY = y + 85 + nameLines.length * 33;
    readingLines.forEach((line, index) => ctx.fillText(line, SECTION_X + 140, readingY + index * 29));
    y += rowHeight + 18;
  });
  return y;
}

function measureCardRow(ctx: CanvasRenderingContext2D, card: ExportCard, width: number): number {
  ctx.font = "850 25px system-ui, sans-serif";
  const nameLines = getWrappedLines(ctx, `${card.koreanName} · ${card.name}`, width - 174).slice(0, 2);
  ctx.font = "500 20px system-ui, sans-serif";
  const readingLines = getWrappedLines(ctx, getFirstSentence(card.reading), width - 174).slice(0, 2);
  return Math.max(158, 58 + nameLines.length * 33 + readingLines.length * 29 + 28);
}

function drawCardImage(scene: Phaser.Scene, ctx: CanvasRenderingContext2D, card: ExportCard, x: number, y: number, width: number, height: number): void {
  ctx.fillStyle = "rgba(7, 4, 15, 0.98)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(246, 211, 101, 0.78)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  if (!card.imageKey || !scene.textures.exists(card.imageKey)) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff6d6";
    ctx.font = "700 40px Georgia, serif";
    ctx.fillText("✦", x + width / 2, y + height / 2 + 14);
    return;
  }
  const source = scene.textures.get(card.imageKey).getSourceImage() as CanvasImageSource & { width?: number; height?: number };
  const sourceWidth = source.width ?? width;
  const sourceHeight = source.height ?? height;
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  ctx.drawImage(source, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function measureImageSection(ctx: CanvasRenderingContext2D, body: string, width: number, fontSize: number, lineHeight: number): number {
  ctx.font = `500 ${fontSize}px system-ui, sans-serif`;
  const lines = getWrappedLines(ctx, body, width - 68);
  return 30 + 45 + 16 + Math.max(1, lines.length) * lineHeight + 34;
}

function drawImageSection(ctx: CanvasRenderingContext2D, title: string, body: string, y: number, width: number, fontSize: number, lineHeight: number): number {
  ctx.font = `500 ${fontSize}px system-ui, sans-serif`;
  const lines = getWrappedLines(ctx, body, width - 68);
  const height = 30 + 45 + 16 + Math.max(1, lines.length) * lineHeight + 34;
  drawGlassPanel(ctx, SECTION_X, y, width, height, title === "요약" ? "summary" : "section");
  drawImageSectionTitle(ctx, title, y + 45);
  ctx.textAlign = "left";
  ctx.fillStyle = "#f8f0ff";
  ctx.font = `500 ${fontSize}px system-ui, sans-serif`;
  lines.forEach((line, index) => ctx.fillText(line, SECTION_X + 34, y + 91 + index * lineHeight));
  return y + height;
}

function drawImageSectionTitle(ctx: CanvasRenderingContext2D, title: string, y: number): void {
  ctx.textAlign = "left";
  ctx.fillStyle = "#f6d365";
  ctx.font = "950 29px system-ui, sans-serif";
  ctx.fillText(title, SECTION_X + 34, y);
}

function drawGlassPanel(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, variant: "section" | "summary" | "card"): void {
  const bg = ctx.createLinearGradient(x, y, x, y + height);
  bg.addColorStop(0, variant === "card" ? "rgba(255,246,214,0.055)" : "rgba(255,255,255,0.035)");
  bg.addColorStop(1, "rgba(10,7,27,0.56)");
  ctx.fillStyle = variant === "card" ? "rgba(22, 12, 50, 0.64)" : "rgba(10, 7, 27, 0.56)";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, width, height);

  if (variant === "summary") {
    const glow = ctx.createRadialGradient(x + width / 2, y, 0, x + width / 2, y, width * 0.36);
    glow.addColorStop(0, "rgba(246, 211, 101, 0.08)");
    glow.addColorStop(1, "rgba(246, 211, 101, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x, y, width, Math.min(height, 180));
  }

  ctx.strokeStyle = variant === "summary" ? "rgba(246, 211, 101, 0.52)" : variant === "card" ? "rgba(246, 211, 101, 0.28)" : "rgba(181, 140, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  ctx.strokeStyle = "rgba(255, 246, 214, 0.08)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 10, y + 10, width - 20, height - 20);
}

function getWrappedLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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

function getFirstSentence(value: string): string {
  return value.split(/(?<=[.!?。！？]|다\.|요\.)\s+/).map((sentence) => sentence.trim()).filter(Boolean)[0] ?? value;
}
