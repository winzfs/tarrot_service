import Phaser from "phaser";
import { ensureTarotCardImagesLoaded } from "../assets/lazyLoadAssets";
import { DESIGN_GAME_HEIGHT, GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import type { ReadingDraft } from "../state/ReadingDraft";
import { categoryLabels } from "../state/ReadingDraft";
import { drawMysticBackground, drawRoundedPanel } from "../ui/drawPanel";
import { addRuneRing, addSoftGlow, fadeDestroy, playBurst, playSmoke, spawnTextureSparkles } from "../vfx/vfxEffects";
import { TransitionGuard } from "../core/TransitionGuard";
import { drawTarotCards } from "../../tarot/cards";
import { getTarotSpread } from "../../tarot/spreads";
import type { DrawnCard, TarotSpread } from "../../tarot/types";

const CARD_BACK_IMAGE_KEY = "tarot-card-back";
const CARD_FRAME_GAP = 6;
const SHUFFLE_CARD_COUNT = 18;

type CardLayoutSlot = { x: number; y: number; centerX: number; centerY: number; touchX: number; touchY: number; cardWidth: number; cardHeight: number; touchWidth: number; touchHeight: number };
type CardView = { container: Phaser.GameObjects.Container; back: Phaser.GameObjects.Container; front: Phaser.GameObjects.Container; seal: Phaser.GameObjects.Arc; hitZone: Phaser.GameObjects.Zone; layout: CardLayoutSlot; revealed: boolean };
type QuestionLayout = { panelHeight: number; questionY: number; guideY: number; cardOffsetY: number };
type ShuffledReadingDraft = ReadingDraft & { __fromShuffleScene?: boolean };
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

function cardRotation(card: DrawnCard): number {
  return card.isReversed ? Math.PI : 0;
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
  private cardLayoutOffsetY = 0;
  private revealPreview?: Phaser.GameObjects.Container;
  private fromShuffleScene = false;
  private transitionGuard = new TransitionGuard();

  constructor() { super("CardSelectScene"); }

  init(data: ReadingDraft): void {
    const shuffledData = data as ShuffledReadingDraft;
    this.fromShuffleScene = Boolean(shuffledData.__fromShuffleScene);
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
    this.cardLayoutOffsetY = 0;
    this.revealPreview = undefined;
  }

  create(): void {
    this.cleanupTransitions();
    this.transitionGuard = new TransitionGuard();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupTransitions, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanupTransitions, this);
    if (this.fromShuffleScene) {
      this.createCardSelectionStage();
      return;
    }
    this.playShuffleIntro(() => this.createCardSelectionStage());
  }

  private createCardSelectionStage(): void {
    this.cameras.main.setAlpha(1);
    this.children.removeAll();
    drawMysticBackground(this, GAME_WIDTH, GAME_HEIGHT);
    this.add.text(GAME_WIDTH / 2, sy(62), "별빛의 제단", { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${ss(34)}px`, color: "#f8f0ff", stroke: "#2c174f", strokeThickness: ss(5) }).setOrigin(0.5);

    const loadingPanel = this.createAssetLoadingPanel();
    void this.prepareAndRenderCardSelection(loadingPanel);
  }

  private playShuffleIntro(onComplete: () => void): void {
    this.cameras.main.setAlpha(1);
    this.cameras.main.fadeIn(180, 1, 0, 8);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x010008, 1).setDepth(0);

    const bg = this.add.graphics().setDepth(1);
    bg.fillGradientStyle(0x010008, 0x03020a, 0x100827, 0x03020a, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let i = 0; i < 90; i += 1) {
      const star = this.add.circle(
        Phaser.Math.Between(sx(8), GAME_WIDTH - sx(8)),
        Phaser.Math.Between(sy(8), GAME_HEIGHT - sy(8)),
        Phaser.Math.FloatBetween(ss(0.6), ss(1.7)),
        0xf8f0ff,
        Phaser.Math.FloatBetween(0.1, 0.42),
      ).setDepth(2);
      this.tweens.add({ targets: star, alpha: 0.04, duration: Phaser.Math.Between(720, 1600), yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    const centerX = GAME_WIDTH / 2;
    const centerY = sy(448);
    const glow = addSoftGlow(this, centerX, centerY, 4, 0.72);
    const ring = addRuneRing(this, centerX, centerY, 5, 0.34);
    this.tweens.add({ targets: glow, alpha: 0.32, scale: 1.65, duration: 980, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: ring, angle: 360, duration: 18000, repeat: -1, ease: "Linear" });

    this.add.text(GAME_WIDTH / 2, sy(236), "카드들이 어둠 속에서 섞입니다", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${ss(30)}px`,
      color: "#fff6d6",
      align: "center",
      stroke: "#09071a",
      strokeThickness: ss(5),
    }).setOrigin(0.5).setDepth(10);

    this.add.text(GAME_WIDTH / 2, sy(676), "질문에 닿을 카드들이 하나씩 제단으로 모입니다.", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(15)}px`,
      color: "#d9c8ff",
      align: "center",
      wordWrap: { width: sx(312) },
    }).setOrigin(0.5).setDepth(10).setAlpha(0.88);

    const cards = Array.from({ length: SHUFFLE_CARD_COUNT }, (_, index) => this.createShuffleCard(index));
    cards.forEach((card, index) => {
      const lane = index - (SHUFFLE_CARD_COUNT - 1) / 2;
      const passY = centerY + lane * sy(13) + Phaser.Math.Between(-sy(20), sy(20));
      const midX = centerX + Phaser.Math.Between(-sx(164), sx(164));
      const targetX = centerX + Phaser.Math.Between(-sx(48), sx(48));
      const targetY = centerY + Phaser.Math.Between(-sy(36), sy(36));
      this.time.delayedCall(index * 46, () => {
        this.tweens.add({
          targets: card,
          alpha: 1,
          x: midX,
          y: passY,
          angle: Phaser.Math.Between(-40, 40),
          duration: 340,
          ease: "Cubic.easeOut",
          onComplete: () => {
            this.tweens.add({
              targets: card,
              x: targetX,
              y: targetY,
              angle: Phaser.Math.Between(-10, 10),
              scale: 0.78,
              duration: 430,
              ease: "Cubic.easeInOut",
            });
          },
        });
      });
    });

    this.time.delayedCall(1180, () => {
      playBurst(this, centerX, centerY, 60, 0.78);
      spawnTextureSparkles(this, centerX, centerY, 61, 42, ss(46), ss(210));
    });

    this.time.delayedCall(1750, () => {
      cards.forEach((card, index) => {
        this.tweens.add({
          targets: card,
          alpha: 0,
          scale: 0.36,
          x: centerX,
          y: centerY,
          angle: card.angle + Phaser.Math.Between(-70, 70),
          delay: index * 17,
          duration: 400,
          ease: "Sine.easeIn",
        });
      });
    });

    this.time.delayedCall(2460, () => onComplete());
  }

  private createShuffleCard(index: number): Phaser.GameObjects.Container {
    const width = sx(104);
    const height = sy(166);
    const startLeft = index % 2 === 0;
    const x = startLeft ? -sx(160) : GAME_WIDTH + sx(160);
    const y = sy(448) + Phaser.Math.Between(-sy(250), sy(230));
    const container = this.add.container(x, y).setDepth(20 + index).setAlpha(0);
    container.setAngle(Phaser.Math.Between(-24, 24));

    if (this.textures.exists(CARD_BACK_IMAGE_KEY)) {
      const fitted = fitTexture(this, CARD_BACK_IMAGE_KEY, width, height);
      const image = this.add.image(0, 0, CARD_BACK_IMAGE_KEY).setOrigin(0.5);
      image.setDisplaySize(fitted.width, fitted.height);
      const frame = this.add.graphics();
      frame.lineStyle(ss(2), 0xf6d365, 0.86);
      frame.strokeRect(-fitted.width / 2 - ss(5), -fitted.height / 2 - ss(5), fitted.width + ss(10), fitted.height + ss(10));
      frame.lineStyle(ss(1), 0xb58cff, 0.48);
      frame.strokeRect(-fitted.width / 2, -fitted.height / 2, fitted.width, fitted.height);
      container.add([image, frame]);
      return container;
    }

    const card = this.add.graphics();
    card.fillStyle(0x160c32, 0.98);
    card.fillRect(-width / 2, -height / 2, width, height);
    card.lineStyle(ss(2), 0xf6d365, 0.86);
    card.strokeRect(-width / 2, -height / 2, width, height);
    const mark = this.add.text(0, 0, "✦", { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${ss(34)}px`, color: "#b58cff" }).setOrigin(0.5);
    container.add([card, mark]);
    return container;
  }

  private createAssetLoadingPanel(): Phaser.GameObjects.Container {
    const container = this.add.container(GAME_WIDTH / 2, sy(374));
    const width = sx(316);
    const height = sy(174);
    const panel = this.add.graphics();
    panel.fillStyle(0x1b1238, 0.9);
    panel.fillRoundedRect(-width / 2, -height / 2, width, height, ss(22));
    panel.lineStyle(ss(2), 0xf6d365, 0.72);
    panel.strokeRoundedRect(-width / 2, -height / 2, width, height, ss(22));

    const title = this.add.text(0, -sy(28), "카드가 제단에 놓이는 중입니다...", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(17)}px`,
      color: "#fff6d6",
      align: "center",
      fontStyle: "bold",
    }).setOrigin(0.5);

    const guide = this.add.text(0, sy(20), "이번 리딩에 필요한 카드만 조용히 불러오고 있어요.", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(13)}px`,
      color: "#d9c8ff",
      align: "center",
      wordWrap: { width: sx(260) },
    }).setOrigin(0.5);

    const orb = this.add.circle(0, sy(62), ss(12), 0xb58cff, 0.44);
    this.tweens.add({ targets: orb, alpha: 0.12, scale: 1.8, duration: 920, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    container.add([panel, title, guide, orb]);
    return container;
  }

  private async prepareAndRenderCardSelection(loadingPanel: Phaser.GameObjects.Container): Promise<void> {
    await ensureTarotCardImagesLoaded(this, this.drawnCards);
    loadingPanel.destroy();
    this.renderCardSelection();
  }

  private renderCardSelection(): void {
    const category = this.draft ? categoryLabels[this.draft.category] : "자유 질문";
    const question = this.draft?.question ?? "아직 질문이 없습니다.";
    const spreadName = this.spread?.name ?? "시간의 세 문";
    const questionLayout = this.getQuestionLayout(question);
    this.cardLayoutOffsetY = questionLayout.cardOffsetY;

    drawRoundedPanel(this, sx(24), sy(112), GAME_WIDTH - sx(48), questionLayout.panelHeight, ss(20));
    this.add.text(sx(46), sy(134), `봉인된 별자리 · ${category} · ${spreadName}`, { fontFamily: "system-ui, sans-serif", fontSize: `${ss(14)}px`, color: "#f6d365", fontStyle: "bold" }).setOrigin(0, 0);
    this.add.text(sx(46), questionLayout.questionY, question, { fontFamily: "system-ui, sans-serif", fontSize: `${ss(15)}px`, color: "#f8f0ff", lineSpacing: ss(6), wordWrap: { width: sx(298) } }).setOrigin(0, 0);
    this.guideText = this.add.text(GAME_WIDTH / 2, questionLayout.guideY, `${this.spread?.subtitle ?? "과거 · 현재 · 미래"}의 봉인이 질문에 응답하려 합니다. 하나씩 손을 얹어 여세요.`, { fontFamily: "system-ui, sans-serif", fontSize: `${ss(15)}px`, color: "#d9c8ff", align: "center", wordWrap: { width: sx(330) } }).setOrigin(0.5);
    this.createSealedCards();
    this.createReadingButton();
  }

  private getQuestionLayout(question: string): QuestionLayout {
    const estimatedLines = Math.max(2, Math.ceil(question.length / 27));
    const extraLines = Math.min(4, Math.max(0, estimatedLines - 2));
    const extraHeight = sy(extraLines * 26);
    return {
      panelHeight: sy(138) + extraHeight,
      questionY: sy(166),
      guideY: sy(292) + extraHeight,
      cardOffsetY: sy(extraLines * 26),
    };
  }

  private getCardLayoutSlots(cardCount: number): CardLayoutSlot[] {
    const isThreeCardSpread = cardCount === 3;
    const compact = cardCount >= 5;
    const cardWidth = compact ? sx(82) : isThreeCardSpread ? sx(104) : sx(92);
    const cardHeight = compact ? sy(134) : isThreeCardSpread ? sy(168) : sy(150);
    const touchWidth = compact ? sx(104) : isThreeCardSpread ? sx(132) : sx(122);
    const touchHeight = compact ? sy(210) : isThreeCardSpread ? sy(278) : sy(258);
    const layoutOffsetY = this.cardLayoutOffsetY;

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

    if (hintedSlots && hintedSlots.length === cardCount && !isThreeCardSpread) {
      return hintedSlots.map((hint) => {
        const rowGapOffset = cardCount === 5 ? (hint.y < 0.5 ? sy(22) : sy(64)) : 0;
        return makeSlot(GAME_WIDTH * hint.x, DESIGN_GAME_HEIGHT * hint.y + sy(54) + layoutOffsetY + rowGapOffset);
      });
    }

    if (cardCount === 1) return [makeSlot(GAME_WIDTH / 2, sy(530) + layoutOffsetY)];

    if (cardCount === 3) {
      return [
        makeSlot(GAME_WIDTH / 2 - sx(128), sy(526) + layoutOffsetY),
        makeSlot(GAME_WIDTH / 2, sy(526) + layoutOffsetY),
        makeSlot(GAME_WIDTH / 2 + sx(128), sy(526) + layoutOffsetY),
      ];
    }

    if (cardCount === 5) {
      return [
        makeSlot(GAME_WIDTH / 2 - sx(78), sy(412) + layoutOffsetY),
        makeSlot(GAME_WIDTH / 2 + sx(78), sy(412) + layoutOffsetY),
        makeSlot(GAME_WIDTH / 2 - sx(150), sy(648) + layoutOffsetY),
        makeSlot(GAME_WIDTH / 2, sy(648) + layoutOffsetY),
        makeSlot(GAME_WIDTH / 2 + sx(150), sy(648) + layoutOffsetY),
      ];
    }

    const gap = sx(4);
    const totalWidth = touchWidth * cardCount + gap * Math.max(0, cardCount - 1);
    const startTouchX = Math.round((GAME_WIDTH - totalWidth) / 2);
    const centerY = sy(525) + layoutOffsetY;
    return Array.from({ length: cardCount }, (_, index) => makeSlot(startTouchX + index * (touchWidth + gap) + touchWidth / 2, centerY));
  }

  private shouldHidePositionLabel(label: string): boolean {
    return /^선택\s*[AB]$/i.test(label.trim());
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
      const positionLabel = this.add.text(layout.cardWidth / 2, layout.cardHeight + sy(28), card.position, { fontFamily: "system-ui, sans-serif", fontSize: `${ss(layout.cardWidth < sx(90) ? 12 : 14)}px`, color: "#fff6d6", fontStyle: "bold", align: "center", wordWrap: { width: layout.touchWidth + sx(20) } }).setOrigin(0.5).setVisible(!this.shouldHidePositionLabel(card.position));
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

    if (!this.textures.exists(card.imageKey)) {
      const fallbackW = width - ss(CARD_FRAME_GAP * 2);
      const fallbackH = height - ss(CARD_FRAME_GAP * 2);
      const frame = this.add.graphics();
      frame.fillStyle(0x26184f, 0.98);
      frame.fillRect(cx - fallbackW / 2, cy - fallbackH / 2, fallbackW, fallbackH);
      frame.lineStyle(ss(2), 0xf6d365, 0.96);
      frame.strokeRect(cx - width / 2, cy - height / 2, width, height);
      const symbol = this.add.text(cx, cy, card.visual.symbol, { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${ss(34)}px`, color: "#fff6d6" }).setOrigin(0.5);
      symbol.setRotation(cardRotation(card));
      front.add([frame, symbol]);
      return front;
    }

    const maxImageWidth = width - ss(CARD_FRAME_GAP * 2);
    const maxImageHeight = height - ss(CARD_FRAME_GAP * 2);
    const fitted = fitTexture(this, card.imageKey, maxImageWidth, maxImageHeight);
    const image = this.add.image(cx, cy, card.imageKey).setOrigin(0.5);
    image.setDisplaySize(fitted.width, fitted.height);
    image.setRotation(cardRotation(card));
    const frame = addOuterCardFrame(this, fitted.width, fitted.height, cx, cy);
    const koreanName = this.add.text(cx, -sy(43), card.koreanName, { fontFamily: "system-ui, sans-serif", fontSize: `${ss(width < sx(90) ? 13 : 16)}px`, color: "#fff6d6", fontStyle: "bold", align: "center", stroke: "#09071a", strokeThickness: ss(3), wordWrap: { width: width + sx(52) } }).setOrigin(0.5);
    const englishName = this.add.text(cx, -sy(25), card.name, { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${ss(width < sx(90) ? 9 : 10)}px`, color: "#d9c8ff", align: "center", wordWrap: { width: width + sx(44) }, stroke: "#09071a", strokeThickness: ss(2) }).setOrigin(0.5);
    front.add([image, frame, koreanName, englishName]);
    return front;
  }

  private showRevealPreview(card: DrawnCard, startX: number, startY: number, startWidth: number, startHeight: number): void {
    if (!this.textures.exists(card.imageKey)) return;
    this.revealPreview?.destroy();

    const targetWidth = sx(178);
    const targetHeight = sy(270);
    const targetX = GAME_WIDTH / 2;
    const targetY = sy(406);
    const preview = this.add.container(0, 0).setDepth(80).setAlpha(1);
    const veil = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x03020a, 0.72).setAlpha(0);
    const cardContainer = this.add.container(startX, startY);
    const fittedStart = fitTexture(this, card.imageKey, startWidth - ss(CARD_FRAME_GAP * 2), startHeight - ss(CARD_FRAME_GAP * 2));
    const image = this.add.image(0, 0, card.imageKey).setOrigin(0.5);
    image.setDisplaySize(fittedStart.width, fittedStart.height);
    image.setRotation(cardRotation(card));
    const frame = addOuterCardFrame(this, fittedStart.width, fittedStart.height, 0, 0);
    const koreanName = this.add.text(0, startHeight / 2 + sy(38), card.koreanName, { fontFamily: "system-ui, sans-serif", fontSize: `${ss(18)}px`, color: "#fff6d6", fontStyle: "bold", align: "center", stroke: "#09071a", strokeThickness: ss(4), wordWrap: { width: sx(300) } }).setOrigin(0.5).setAlpha(0);
    const englishName = this.add.text(0, startHeight / 2 + sy(62), card.name, { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${ss(12)}px`, color: "#d9c8ff", align: "center", stroke: "#09071a", strokeThickness: ss(3), wordWrap: { width: sx(300) } }).setOrigin(0.5).setAlpha(0);
    cardContainer.add([image, frame, koreanName, englishName]);
    preview.add([veil, cardContainer]);
    this.revealPreview = preview;

    const scale = Math.min(targetWidth / Math.max(1, fittedStart.width), targetHeight / Math.max(1, fittedStart.height));
    this.tweens.add({ targets: veil, alpha: 1, duration: 220, ease: "Sine.easeOut" });
    this.tweens.add({ targets: cardContainer, x: targetX, y: targetY, scale, duration: 540, ease: "Cubic.easeInOut" });
    this.tweens.add({ targets: [koreanName, englishName], alpha: 1, delay: 430, duration: 320, ease: "Sine.easeOut" });
    this.time.delayedCall(2050, () => {
      this.tweens.add({
        targets: preview,
        alpha: 0,
        duration: 420,
        ease: "Sine.easeIn",
        onComplete: () => {
          if (this.revealPreview === preview) this.revealPreview = undefined;
          preview.destroy();
        },
      });
    });
  }

  private showAllSealsOpenedNotice(): void {
    const veil = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x010008, 0.68)
      .setDepth(89)
      .setAlpha(0);
    const notice = this.add.text(GAME_WIDTH / 2, sy(360), "모든 봉인이\n열렸습니다", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${ss(30)}px`,
      color: "#fff6d6",
      align: "center",
      lineSpacing: ss(6),
      stroke: "#09071a",
      strokeThickness: ss(5),
    }).setOrigin(0.5).setDepth(90).setAlpha(0).setScale(0.72);

    this.tweens.add({ targets: veil, alpha: 1, duration: 300, ease: "Sine.easeOut" });
    this.tweens.add({ targets: notice, alpha: 1, scale: 1, duration: 420, ease: "Back.easeOut" });
    this.time.delayedCall(1180, () => {
      this.tweens.add({ targets: veil, alpha: 0, duration: 560, ease: "Sine.easeIn", onComplete: () => veil.destroy() });
      this.tweens.add({
        targets: notice,
        alpha: 0,
        scale: 1.12,
        y: sy(342),
        duration: 520,
        ease: "Sine.easeIn",
        onComplete: () => notice.destroy(),
      });
    });
  }

  private revealCard(view: CardView, index: number): void {
    if (view.revealed) return;
    view.revealed = true;
    this.revealedCount += 1;
    view.hitZone.disableInteractive();
    const card = this.drawnCards[index];
    this.guideText?.setText(card ? `${card.position}의 문이 열렸습니다.` : "카드의 문이 열렸습니다.");
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
        if (card) this.showRevealPreview(card, centerX, centerY, view.layout.cardWidth, view.layout.cardHeight);
        fadeDestroy(this, [glow, ring], 680, 800);
      });
    }});
    if (this.revealedCount >= this.cardViews.length) {
      this.guideText?.setText("");
      this.time.delayedCall(780, () => this.showAllSealsOpenedNotice());
      this.time.delayedCall(2550, () => this.showReadingButton());
    }
  }

  private createReadingButton(): void {
    const width = sx(310), height = sy(64), x = GAME_WIDTH / 2, y = DESIGN_GAME_HEIGHT - sy(58);
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
    const targetY = DESIGN_GAME_HEIGHT - sy(58);
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
    const startReading = () => this.transitionGuard.runOnce("select-to-reading", () => {
      console.log("[Transition] CardSelectScene -> ReadingScene start");
      this.cleanupTransitions();
      this.scene.start("ReadingScene", data);
    });
    this.transitionGuard.registerTimer(this.time.delayedCall(500, startReading));
    this.transitionGuard.scheduleHardTimeout("select-to-reading", 1700, startReading);
  }

  private cleanupTransitions(): void {
    this.transitionGuard.cancel();
  }
}
