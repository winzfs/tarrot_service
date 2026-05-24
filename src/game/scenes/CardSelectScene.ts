import Phaser from "phaser";
import { DESIGN_GAME_HEIGHT, GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import type { ReadingDraft } from "../state/ReadingDraft";
import { categoryLabels } from "../state/ReadingDraft";
import { drawMysticBackground, drawRoundedPanel } from "../ui/drawPanel";
import { addRuneRing, addSoftGlow, fadeDestroy, playBurst, playSmoke, spawnTextureSparkles } from "../vfx/vfxEffects";
import { drawTarotCards } from "../../tarot/cards";
import { getTarotSpread } from "../../tarot/spreads";
import type { DrawnCard, TarotSpread } from "../../tarot/types";

const CARD_BACK_IMAGE_KEY = "tarot-card-back";
const CARD_FRAME_GAP = 6;

type CardLayoutSlot = { x: number; y: number; centerX: number; centerY: number; touchX: number; touchY: number; cardWidth: number; cardHeight: number; touchWidth: number; touchHeight: number };
type CardView = { container: Phaser.GameObjects.Container; back: Phaser.GameObjects.Container; front: Phaser.GameObjects.Container; seal: Phaser.GameObjects.Arc; hitZone: Phaser.GameObjects.Zone; layout: CardLayoutSlot; revealed: boolean };
export type ReadingSceneData = { draft: ReadingDraft; spread: TarotSpread; cards: DrawnCard[] };

function fitTexture(scene: Phaser.Scene, key: string, maxW: number, maxH: number): { width: number; height: number } {
  const source = scene.textures.get(key).getSourceImage() as { width: number; height: number };
  const ratio = source.width / source.height;
  const w = maxH * ratio;
  return w <= maxW ? { width: w, height: maxH } : { width: maxW, height: maxW / ratio };
}

function addOuterCardFrame(scene: Phaser.Scene, imageWidth: number, imageHeight: number, x: number, y: number): Phaser.GameObjects.Graphics {
  const frame = scene.add.graphics();
  const gap = ss(CARD_FRAME_GAP);
  const frameWidth = imageWidth + gap * 2;
  const frameHeight = imageHeight + gap * 2;
  const left = x - frameWidth / 2;
  const top = y - frameHeight / 2;
  frame.lineStyle(ss(2), 0xf6d365, 0.98);
  frame.strokeRect(left, top, frameWidth, frameHeight);
  frame.lineStyle(ss(1), 0xb58cff, 0.56);
  frame.strokeRect(left + ss(4), top + ss(4), frameWidth - ss(8), frameHeight - ss(8));
  return frame;
}

export class CardSelectScene extends Phaser.Scene {
  private draft?: ReadingDraft;
  private spread?: TarotSpread;
  private drawnCards: DrawnCard[] = [];
  private cardViews: CardView[] = [];
  private revealedCount = 0;
  private readingButton?: Phaser.GameObjects.Container;
  private readingButtonZone?: Phaser.GameObjects.Zone;
  private guideText?: Phaser.GameObjects.Text;
  private isStartingReading = false;

  constructor() { super("CardSelectScene"); }

  init(data: ReadingDraft): void {
    this.draft = data;
    this.spread = getTarotSpread(data.spreadId);
    this.drawnCards = drawTarotCards(this.spread.cardsToDraw).map((card, index) => {
      const position = this.spread?.positions[index];
      return {
        ...card,
        position: position?.label ?? `${index + 1}번째 카드`,
        positionId: position?.id ?? `position-${index + 1}`,
        positionMeaning: position?.promptMeaning ?? "이 위치가 질문에서 갖는 의미를 중심으로 해석한다.",
        spreadId: this.spread?.id ?? data.spreadId,
        spreadName: this.spread?.name ?? "타로 배열",
      };
    });
    this.cardViews = [];
    this.revealedCount = 0;
    this.isStartingReading = false;
  }

  create(): void {
    drawMysticBackground(this, GAME_WIDTH, GAME_HEIGHT);
    this.add.text(GAME_WIDTH / 2, sy(62), "별빛의 제단", { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${ss(34)}px`, color: "#f8f0ff", stroke: "#2c174f", strokeThickness: ss(5) }).setOrigin(0.5);
    drawRoundedPanel(this, sx(24), sy(112), GAME_WIDTH - sx(48), sy(138), ss(20));
    const category = this.draft ? categoryLabels[this.draft.category] : "자유 질문";
    const question = this.draft?.question ?? "아직 질문이 없습니다.";
    const spreadName = this.spread?.name ?? "시간의 세 문";
    this.add.text(sx(46), sy(134), `봉인된 별자리 · ${category} · ${spreadName}`, { fontFamily: "system-ui, sans-serif", fontSize: `${ss(14)}px`, color: "#f6d365", fontStyle: "bold" }).setOrigin(0, 0);
    this.add.text(sx(46), sy(166), question, { fontFamily: "system-ui, sans-serif", fontSize: `${ss(15)}px`, color: "#f8f0ff", lineSpacing: ss(6), wordWrap: { width: sx(298) } }).setOrigin(0, 0);
    this.guideText = this.add.text(GAME_WIDTH / 2, sy(292), `${this.spread?.subtitle ?? "과거 · 현재 · 미래"}의 봉인이 질문에 응답하려 합니다. 하나씩 손을 얹어 여세요.`, { fontFamily: "system-ui, sans-serif", fontSize: `${ss(15)}px`, color: "#d9c8ff", align: "center", wordWrap: { width: sx(330) } }).setOrigin(0.5);
    this.createSealedCards();
    this.createReadingButton();
  }

  private getCardLayoutSlots(cardCount: number): CardLayoutSlot[] {
    const compact = cardCount >= 5;
    const cardWidth = compact ? sx(82) : sx(92);
    const cardHeight = compact ? sy(134) : sy(150);
    const touchWidth = compact ? sx(104) : sx(122);
    const touchHeight = compact ? sy(210) : sy(258);

    const makeSlot = (centerX: number, centerY: number): CardLayoutSlot => ({
      x: Math.round(centerX - cardWidth / 2),
      y: Math.round(centerY - cardHeight / 2),
      centerX: Math.round(centerX),
      centerY: Math.round(centerY),
      touchX: Math.round(centerX),
      touchY: Math.round(centerY + sy(18)),
      cardWidth,
      cardHeight,
      touchWidth,
      touchHeight,
    });

    const hintedSlots = this.spread?.positions
      .slice(0, cardCount)
      .map((position) => position.layoutHint)
      .filter((hint): hint is { x: number; y: number } => typeof hint?.x === "number" && typeof hint?.y === "number");

    if (hintedSlots && hintedSlots.length === cardCount) {
      return hintedSlots.map((hint) => makeSlot(GAME_WIDTH * hint.x, DESIGN_GAME_HEIGHT * hint.y));
    }

    if (cardCount === 1) {
      return [makeSlot(GAME_WIDTH / 2, sy(470))];
    }

    if (cardCount === 5) {
      return [
        makeSlot(GAME_WIDTH / 2 - sx(78), sy(390)),
        makeSlot(GAME_WIDTH / 2 + sx(78), sy(390)),
        makeSlot(GAME_WIDTH / 2 - sx(150), sy(590)),
        makeSlot(GAME_WIDTH / 2, sy(590)),
        makeSlot(GAME_WIDTH / 2 + sx(150), sy(590)),
      ];
    }

    const gap = sx(4);
    const totalWidth = touchWidth * cardCount + gap * Math.max(0, cardCount - 1);
    const startTouchX = Math.round((GAME_WIDTH - totalWidth) / 2);
    const centerY = sy(467);

    return Array.from({ length: cardCount }, (_, index) => makeSlot(startTouchX + index * (touchWidth + gap) + touchWidth / 2, centerY));
  }

  private createSealedCards(): void {
    const layouts = this.getCardLayoutSlots(this.drawnCards.length);
    this.drawnCards.forEach((card, index) => {
      const layout = layouts[index];
      if (!layout) return;
      const container = this.add.container(layout.x, layout.y);
      const seal = this.add.circle(layout.cardWidth / 2, layout.cardHeight / 2, ss(62), 0x6d4aff, 0.12);
      const back = this.createCardBack(layout.cardWidth, layout.cardHeight);
      const front = this.createCardFront(card, layout.cardWidth, layout.cardHeight);
      const positionLabel = this.add.text(layout.cardWidth / 2, layout.cardHeight + sy(28), card.position, { fontFamily: "system-ui, sans-serif", fontSize: `${ss(layout.cardWidth < sx(90) ? 12 : 14)}px`, color: "#fff6d6", fontStyle: "bold", align: "center", wordWrap: { width: layout.touchWidth + sx(20) } }).setOrigin(0.5);
      front.setVisible(false);
      front.setAlpha(0);
      container.add([seal, back, front, positionLabel]);
      container.setAlpha(0);
      container.setY(layout.y + sy(20));
      const hitZone = this.add.zone(layout.touchX, layout.touchY, layout.touchWidth, layout.touchHeight).setInteractive({ useHandCursor: true });
      const view: CardView = { container, back, front, seal, hitZone, layout, revealed: false };
      this.cardViews.push(view);
      hitZone.on("pointerdown", () => this.revealCard(view, index));
      this.tweens.add({ targets: container, alpha: 1, y: layout.y, delay: index * 130, duration: 620, ease: "Back.easeOut" });
      this.tweens.add({ targets: seal, alpha: 0.3, scale: 1.18, duration: 1700 + index * 180, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    });
  }

  private createCardBack(width: number, height: number): Phaser.GameObjects.Container {
    const back = this.add.container(0, 0);
    const cx = width / 2;
    const cy = height / 2;
    if (this.textures.exists(CARD_BACK_IMAGE_KEY)) {
      const fitted = fitTexture(this, CARD_BACK_IMAGE_KEY, width - ss(CARD_FRAME_GAP * 2), height - ss(CARD_FRAME_GAP * 2));
      const image = this.add.image(cx, cy, CARD_BACK_IMAGE_KEY).setOrigin(0.5);
      image.setDisplaySize(fitted.width, fitted.height);
      back.add([image, addOuterCardFrame(this, fitted.width, fitted.height, cx, cy)]);
      return back;
    }
    const fallbackW = width - ss(CARD_FRAME_GAP * 2);
    const fallbackH = height - ss(CARD_FRAME_GAP * 2);
    const frame = this.add.graphics();
    frame.fillStyle(0x160c32, 0.98);
    frame.fillRect(cx - fallbackW / 2, cy - fallbackH / 2, fallbackW, fallbackH);
    frame.lineStyle(ss(2), 0xf6d365, 0.96);
    frame.strokeRect(cx - width / 2, cy - height / 2, width, height);
    frame.lineStyle(ss(1), 0xb58cff, 0.58);
    frame.strokeRect(cx - width / 2 + ss(4), cy - height / 2 + ss(4), width - ss(8), height - ss(8));
    const mark = this.add.text(cx, cy, "✦", { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${ss(34)}px`, color: "#b58cff" }).setOrigin(0.5);
    back.add([frame, mark]);
    return back;
  }

  private createCardFront(card: DrawnCard, width: number, height: number): Phaser.GameObjects.Container {
    const front = this.add.container(0, 0);
    const cx = width / 2;
    const cy = height / 2;
    const maxImageWidth = width - ss(CARD_FRAME_GAP * 2);
    const maxImageHeight = height - ss(CARD_FRAME_GAP * 2);
    const fitted = fitTexture(this, card.imageKey, maxImageWidth, maxImageHeight);
    const image = this.add.image(cx, cy, card.imageKey).setOrigin(0.5);
    image.setDisplaySize(fitted.width, fitted.height);
    const frame = addOuterCardFrame(this, fitted.width, fitted.height, cx, cy);
    const koreanName = this.add.text(cx, -sy(48), card.koreanName, { fontFamily: "system-ui, sans-serif", fontSize: `${ss(width < sx(90) ? 13 : 16)}px`, color: "#fff6d6", fontStyle: "bold", align: "center", stroke: "#09071a", strokeThickness: ss(3), wordWrap: { width: width + sx(52) } }).setOrigin(0.5);
    const englishName = this.add.text(cx, -sy(25), card.name, { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${ss(width < sx(90) ? 9 : 10)}px`, color: "#d9c8ff", align: "center", wordWrap: { width: width + sx(44) }, stroke: "#09071a", strokeThickness: ss(2) }).setOrigin(0.5);
    front.add([image, frame, koreanName, englishName]);
    return front;
  }

  private revealCard(view: CardView, index: number): void {
    if (view.revealed) return;
    view.revealed = true;
    this.revealedCount += 1;
    view.hitZone.disableInteractive();
    const card = this.drawnCards[index];
    this.guideText?.setText(card ? `${card.position}의 문이 열렸습니다. ${card.positionMeaning}` : "카드의 문이 열렸습니다.");
    const centerX = view.layout.centerX;
    const centerY = view.container.y + view.layout.cardHeight / 2;
    const glow = addSoftGlow(this, centerX, centerY, 30, 0.82);
    const ring = addRuneRing(this, centerX, centerY, 31, 0.34);
    this.tweens.add({ targets: glow, alpha: 0.52, scale: 1.62, duration: 420, ease: "Sine.easeOut" });
    this.tweens.add({ targets: ring, alpha: 0.72, angle: 160, scale: 0.58, duration: 620, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: view.container, scaleX: 0.02, duration: 500, ease: "Sine.easeInOut", onComplete: () => {
      view.back.setVisible(false);
      view.front.setVisible(true);
      view.front.setAlpha(0);
      playBurst(this, centerX, centerY, 34, 1.12);
      playSmoke(this, centerX, centerY, 33, 0.62);
      spawnTextureSparkles(this, centerX, centerY, 35, 36, ss(36), ss(126));
      this.tweens.add({ targets: view.container, scaleX: 1, duration: 620, ease: "Cubic.easeOut" });
      this.time.delayedCall(280, () => {
        this.tweens.add({ targets: view.front, alpha: 1, duration: 880, ease: "Sine.easeInOut" });
        fadeDestroy(this, [glow, ring], 680, 800);
      });
    }});
    if (this.revealedCount >= this.cardViews.length) {
      this.guideText?.setText(`${this.spread?.name ?? "타로 배열"}의 모든 봉인이 열렸습니다. 이제 점술사가 별빛을 읽습니다.`);
      this.time.delayedCall(1300, () => this.showReadingButton());
    }
  }

  private createReadingButton(): void {
    const width = sx(310), height = sy(68), x = GAME_WIDTH / 2, y = DESIGN_GAME_HEIGHT - sy(102);
    const container = this.add.container(x, y).setVisible(false).setAlpha(0);
    const panel = this.add.graphics();
    panel.fillStyle(0x1b1238, 0.96);
    panel.fillRoundedRect(-width / 2, -height / 2, width, height, ss(22));
    panel.lineStyle(ss(3), 0xf6d365, 0.92);
    panel.strokeRoundedRect(-width / 2, -height / 2, width, height, ss(22));
    const label = this.add.text(0, 0, "점술사의 해석을 듣는다", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(18)}px`, color: "#fff6d6", fontStyle: "bold" }).setOrigin(0.5);
    container.add([panel, label]);
    this.readingButtonZone = this.add.zone(x, y, width, height).setInteractive({ useHandCursor: true });
    this.readingButtonZone.disableInteractive();
    this.readingButtonZone.on("pointerdown", () => this.startReading());
    this.readingButton = container;
  }

  private showReadingButton(): void {
    if (!this.readingButton || !this.readingButtonZone) return;
    const targetY = DESIGN_GAME_HEIGHT - sy(110);
    this.readingButton.setVisible(true);
    this.readingButtonZone.setInteractive({ useHandCursor: true });
    this.readingButtonZone.setPosition(GAME_WIDTH / 2, targetY);
    this.tweens.add({ targets: this.readingButton, alpha: 1, y: targetY, duration: 720, ease: "Back.easeOut" });
  }

  private startReading(): void {
    if (!this.draft || !this.spread || this.isStartingReading) return;
    this.isStartingReading = true;
    this.readingButtonZone?.disableInteractive();
    const data: ReadingSceneData = { draft: this.draft, spread: this.spread, cards: this.drawnCards };
    this.cameras.main.fadeOut(480, 9, 7, 26);
    this.time.delayedCall(500, () => this.scene.start("ReadingScene", data));
  }
}
