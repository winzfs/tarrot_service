import type Phaser from "phaser";
import type { ChatSceneData } from "../scenes/ReadingScene";

type ExportCard = {
  position: string;
  name: string;
  koreanName: string;
  reading: string;
  imageKey?: string;
};

export function exportSummaryImage(scene: Phaser.Scene, data: ChatSceneData, cards: ExportCard[]): void {
  const width = 1080;
  const measureCanvas = document.createElement("canvas");
  measureCanvas.width = width;
  measureCanvas.height = 2400;
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) return;

  let measuredY = 350;
  measuredY += measureImageSection(measureCtx, data.draft.question, 920, 34, 48) + 42;
  measuredY += measureCardsSection(measureCtx, cards, 888) + 32;
  measuredY += measureImageSection(measureCtx, data.reading.summary, 920, 34, 48);
  const height = Math.max(1420, measuredY + 118);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#281653");
  bg.addColorStop(0.55, "#100827");
  bg.addColorStop(1, "#05020e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(246, 211, 101, 0.86)";
  ctx.lineWidth = 6;
  ctx.strokeRect(54, 54, width - 108, height - 108);
  ctx.strokeStyle = "rgba(255, 246, 214, 0.22)";
  ctx.lineWidth = 2;
  ctx.strokeRect(78, 78, width - 156, height - 156);

  ctx.textAlign = "center";
  ctx.fillStyle = "#f6d365";
  ctx.font = "700 34px system-ui, sans-serif";
  ctx.fillText(`${data.spread.name} · ${cards.length}장의 기록`, width / 2, 150);

  ctx.fillStyle = "#fff6d6";
  drawSingleLineFittedTitle(ctx, data.reading.title || "별빛의 기록", width / 2, 225, 860, 58, 40);

  let y = 350;
  y = drawImageSection(ctx, "내 질문", data.draft.question, y, 920, 34, 48);
  y += 42;
  y = drawCardsSection(scene, ctx, cards, y, 888);
  y += 32;
  drawImageSection(ctx, "요약", data.reading.summary, y, 920, 34, 48);

  const link = document.createElement("a");
  link.download = "arcana-reading-summary.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function measureCardsSection(ctx: CanvasRenderingContext2D, cards: ExportCard[], width: number): number {
  let height = 62;
  cards.forEach((card) => {
    height += measureCardRow(ctx, card, width) + 16;
  });
  return height;
}

function drawCardsSection(scene: Phaser.Scene, ctx: CanvasRenderingContext2D, cards: ExportCard[], y: number, width: number): number {
  drawImageSectionTitle(ctx, "선택 카드", y);
  y += 62;
  cards.forEach((card) => {
    const rowHeight = measureCardRow(ctx, card, width);
    const x = 96;
    drawGlassPanel(ctx, x, y, width, rowHeight);
    drawCardImage(scene, ctx, card, x + 22, y + 12, 72, 96);
    ctx.textAlign = "left";
    ctx.fillStyle = "#f6d365";
    ctx.font = "700 26px system-ui, sans-serif";
    ctx.fillText(card.position, x + 118, y + 36);
    ctx.fillStyle = "#fff6d6";
    ctx.font = "700 30px system-ui, sans-serif";
    const nameLines = getWrappedLines(ctx, `${card.koreanName} · ${card.name}`, width - 150).slice(0, 2);
    nameLines.forEach((line, index) => ctx.fillText(line, x + 118, y + 72 + index * 34));
    ctx.fillStyle = "#d9c8ff";
    ctx.font = "500 22px system-ui, sans-serif";
    const readingLines = getWrappedLines(ctx, getFirstSentence(card.reading), width - 150).slice(0, 2);
    const readingY = y + 78 + nameLines.length * 34;
    readingLines.forEach((line, index) => ctx.fillText(line, x + 118, readingY + index * 28));
    y += rowHeight + 16;
  });
  return y;
}

function measureCardRow(ctx: CanvasRenderingContext2D, card: ExportCard, width: number): number {
  ctx.font = "700 30px system-ui, sans-serif";
  const nameLines = getWrappedLines(ctx, `${card.koreanName} · ${card.name}`, width - 150).slice(0, 2);
  ctx.font = "500 22px system-ui, sans-serif";
  const readingLines = getWrappedLines(ctx, getFirstSentence(card.reading), width - 150).slice(0, 2);
  return Math.max(120, 52 + nameLines.length * 34 + readingLines.length * 28 + 22);
}

function drawCardImage(scene: Phaser.Scene, ctx: CanvasRenderingContext2D, card: ExportCard, x: number, y: number, width: number, height: number): void {
  ctx.fillStyle = "rgba(7, 4, 15, 0.96)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(246, 211, 101, 0.78)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  if (!card.imageKey || !scene.textures.exists(card.imageKey)) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff6d6";
    ctx.font = "700 34px Georgia, serif";
    ctx.fillText("✦", x + width / 2, y + height / 2 + 12);
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
  const lines = getWrappedLines(ctx, body, width - 64);
  return 108 + Math.max(1, lines.length) * lineHeight + 28;
}

function drawImageSection(ctx: CanvasRenderingContext2D, title: string, body: string, y: number, width: number, fontSize: number, lineHeight: number): number {
  const x = 80;
  const padding = 32;
  const bodyTop = 108;
  const bottomPadding = 28;
  ctx.font = `500 ${fontSize}px system-ui, sans-serif`;
  const lines = getWrappedLines(ctx, body, width - padding * 2);
  const height = bodyTop + Math.max(1, lines.length) * lineHeight + bottomPadding;
  drawGlassPanel(ctx, x, y, width, height);
  drawImageSectionTitle(ctx, title, y + 34);
  ctx.textAlign = "left";
  ctx.fillStyle = "#f8f0ff";
  ctx.font = `500 ${fontSize}px system-ui, sans-serif`;
  lines.forEach((line, index) => ctx.fillText(line, x + padding, y + bodyTop + index * lineHeight));
  return y + height;
}

function drawImageSectionTitle(ctx: CanvasRenderingContext2D, title: string, y: number): void {
  ctx.textAlign = "left";
  ctx.fillStyle = "#f6d365";
  ctx.font = "800 32px system-ui, sans-serif";
  ctx.fillText(title, 112, y);
}

function drawSingleLineFittedTitle(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, startFontSize: number, minFontSize: number): void {
  let fontSize = startFontSize;
  while (fontSize > minFontSize) {
    ctx.font = `700 ${fontSize}px Georgia, serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    fontSize -= 1;
  }
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
}

function drawGlassPanel(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  ctx.fillStyle = "rgba(10, 7, 27, 0.62)";
  ctx.fillRect(x, y, width, height);
  const glass = ctx.createLinearGradient(x, y, x, y + height * 0.36);
  glass.addColorStop(0, "rgba(255, 246, 214, 0.13)");
  glass.addColorStop(0.45, "rgba(255, 246, 214, 0.05)");
  glass.addColorStop(1, "rgba(255, 246, 214, 0)");
  ctx.fillStyle = glass;
  ctx.fillRect(x + 10, y + 10, width - 20, Math.max(44, height * 0.26));
  ctx.strokeStyle = "rgba(255, 246, 214, 0.10)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 8, y + 8, width - 16, height - 16);
  ctx.strokeStyle = "rgba(246, 211, 101, 0.38)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
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
