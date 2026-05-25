import Phaser from "phaser";
import { allTarotCards } from "../../tarot/cards";
import type { TarotCard } from "../../tarot/types";
import { GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";

const BASE_CARD_W = 250;
const BASE_CARD_H = 425;
const CENTER_SCALE = 1.18;
const SIDE_SCALE = 0.78;
const SPACING = 330;
const CARD_Y = 850;
const MAX_VISIBLE_DISTANCE = 2.4;

type GalleryItem = {
  card: TarotCard;
  index: number;
  objects: Phaser.GameObjects.GameObject[];
  x: number;
  scale: number;
};

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function pointerX(pointer: Phaser.Input.Pointer): number {
  const direct = finite(pointer.x, Number.NaN);
  if (Number.isFinite(direct)) return direct;
  const positionX = finite(pointer.position?.x ?? Number.NaN, Number.NaN);
  if (Number.isFinite(positionX)) return positionX;
  const worldX = finite(pointer.worldX, Number.NaN);
  if (Number.isFinite(worldX)) return worldX;
  return 0;
}

function makeZone(scene: Phaser.Scene, x: number, y: number, width: number, height: number): Phaser.GameObjects.Zone {
  const zone = scene.add.zone(x, y, width, height);
  zone.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
  return zone;
}

function fit(scene: Phaser.Scene, key: string, maxW: number, maxH: number): { width: number; height: number } {
  if (!scene.textures.exists(key)) return { width: maxW, height: maxH };
  const source = scene.textures.get(key).getSourceImage() as { width: number; height: number };
  const ratio = source.width / source.height || maxW / maxH;
  const width = maxH * ratio;
  return width <= maxW ? { width, height: maxH } : { width: maxW, height: maxW / ratio };
}

function guide(card: TarotCard): string {
  if (card.arcana === "major") return "큰 흐름, 전환점, 마음의 중심축을 읽을 때 먼저 봅니다. 질문 속에서 이 카드가 어떤 태도나 인생의 장면을 상징하는지 살펴보세요.";
  if (card.suit === "cups") return "감정, 관계, 애착, 회복의 흐름으로 읽습니다. 마음이 무엇을 원하고 어디에서 흔들리는지 확인하세요.";
  if (card.suit === "swords") return "생각, 판단, 갈등, 말의 흐름으로 읽습니다. 혼란을 만드는 믿음이나 결정해야 할 기준을 살펴보세요.";
  if (card.suit === "wands") return "열정, 행동, 성장, 추진력으로 읽습니다. 지금 움직여야 할 방향과 에너지의 흐름을 확인하세요.";
  if (card.suit === "pentacles") return "현실, 돈, 일, 몸, 안정의 흐름으로 읽습니다. 실제 조건과 지속 가능한 선택을 중심으로 살펴보세요.";
  return "카드의 상징, 키워드, 질문의 맥락을 함께 놓고 해석하세요.";
}

function arcanaLabel(card: TarotCard): string {
  if (card.arcana === "major") return "메이저 아르카나";
  if (card.suit === "cups") return "마이너 아르카나 · 컵";
  if (card.suit === "swords") return "마이너 아르카나 · 소드";
  if (card.suit === "wands") return "마이너 아르카나 · 완드";
  if (card.suit === "pentacles") return "마이너 아르카나 · 펜타클";
  return "마이너 아르카나";
}

export class CardGalleryScene extends Phaser.Scene {
  private items: GalleryItem[] = [];
  private detailObjects: Phaser.GameObjects.GameObject[] = [];
  private scrollX = 0;
  private minScrollX = 0;
  private maxScrollX = 0;
  private dragStartX = 0;
  private startScrollX = 0;
  private isDragging = false;
  private centeredIndex = 0;

  constructor() {
    super("CardGalleryScene");
  }

  preload(): void {
    allTarotCards.forEach((card) => {
      if (!this.textures.exists(card.imageKey)) this.load.image(card.imageKey, card.imageUrl);
    });
  }

  create(): void {
    this.scrollX = 0;
    this.minScrollX = -(allTarotCards.length - 1) * SPACING;
    this.maxScrollX = 0;
    this.dragStartX = 0;
    this.startScrollX = 0;
    this.centeredIndex = 0;
    this.cameras.main.setScroll(0, 0);
    this.createBackground();
    this.createHeader();
    this.createPanel();
    this.createCards();
    this.createBackButton();
    this.bindDragScroll();
  }

  private createBackground(): void {
    const bg = this.add.graphics().setDepth(0);
    bg.fillGradientStyle(0x21104f, 0x160b36, 0x09071a, 0x03020a, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let i = 0; i < 90; i += 1) {
      this.add.circle(
        Phaser.Math.Between(12, GAME_WIDTH - 12),
        Phaser.Math.Between(12, GAME_HEIGHT - 12),
        Phaser.Math.FloatBetween(1.2, 3.4),
        0xf8f0ff,
        Phaser.Math.FloatBetween(0.1, 0.42),
      ).setDepth(1);
    }
  }

  private createHeader(): void {
    this.add.text(GAME_WIDTH / 2, sy(66), "카드 갤러리", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${ss(30)}px`,
      color: "#f8f0ff",
      stroke: "#2c174f",
      strokeThickness: ss(5),
    }).setOrigin(0.5).setDepth(20);

    this.add.text(GAME_WIDTH / 2, sy(118), "가운데 카드를 눌러 뜻을 펼쳐보세요.", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(13)}px`,
      color: "#d9c8ff",
    }).setOrigin(0.5).setDepth(20);
  }

  private createPanel(): void {
    const panel = this.add.rectangle(GAME_WIDTH / 2, 910, GAME_WIDTH - 72, 1260, 0x07050d, 0.38).setDepth(2);
    panel.setStrokeStyle(ss(2), 0xf6d365, 0.28);

    this.add.text(GAME_WIDTH / 2, 1478, "← 스와이프해서 카드 넘기기 →", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(13)}px`,
      color: "#b9a7e8",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(20);
  }

  private createCards(): void {
    this.items = allTarotCards.map((card, index) => {
      const objects = this.createCardObjects(card, index);
      return { card, index, objects, x: 0, scale: SIDE_SCALE };
    });
    this.updateCards();
  }

  private createCardObjects(card: TarotCard, index: number): Phaser.GameObjects.GameObject[] {
    const shadow = this.add.rectangle(0, 0, BASE_CARD_W + 30, BASE_CARD_H + 30, 0x03020a, 0.52).setDepth(9);
    const back = this.add.rectangle(0, 0, BASE_CARD_W + 18, BASE_CARD_H + 18, 0x0c0717, 1).setDepth(10);
    const imageFrame = this.add.rectangle(0, 0, BASE_CARD_W + 8, BASE_CARD_H + 8, 0x0c0717, 0).setDepth(13);
    const innerFrame = this.add.rectangle(0, 0, BASE_CARD_W - 10, BASE_CARD_H - 10, 0x0c0717, 0).setDepth(14);
    back.setStrokeStyle(ss(3), 0xf6d365, 1);
    imageFrame.setStrokeStyle(ss(3), 0xf6d365, 0.96);
    innerFrame.setStrokeStyle(ss(1), 0xb58cff, 0.62);

    const objects: Phaser.GameObjects.GameObject[] = [shadow, back];
    if (this.textures.exists(card.imageKey)) {
      const image = this.add.image(0, 0, card.imageKey).setOrigin(0.5).setDepth(12);
      const fitted = fit(this, card.imageKey, BASE_CARD_W, BASE_CARD_H);
      image.setDisplaySize(fitted.width, fitted.height);
      objects.push(image);
    } else {
      objects.push(this.add.text(0, 0, "이미지\n없음", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(12)}px`,
        color: "#f6d365",
        align: "center",
      }).setOrigin(0.5).setDepth(12));
    }
    objects.push(imageFrame, innerFrame);

    const countBg = this.add.rectangle(0, 0, 106, 34, 0xf6d365, 1).setDepth(15);
    countBg.setStrokeStyle(ss(2), 0x4b3315, 0.92);
    objects.push(countBg);

    const count = this.add.text(0, 0, `${index + 1}/${allTarotCards.length}`, {
      fontFamily: "monospace",
      fontSize: `${ss(11)}px`,
      color: "#3a2409",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5).setDepth(16);
    objects.push(count);

    const label = this.add.text(0, 0, card.koreanName, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(15)}px`,
      color: "#fff6d6",
      fontStyle: "bold",
      align: "center",
      stroke: "#09071a",
      strokeThickness: ss(3),
      wordWrap: { width: BASE_CARD_W + 96 },
    }).setOrigin(0.5).setDepth(17);
    objects.push(label);

    const hit = makeZone(this, 0, 0, BASE_CARD_W + 84, BASE_CARD_H + 210).setDepth(18);
    hit.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      const tapped = Math.abs(pointerX(pointer) - this.dragStartX) <= 30;
      if (!tapped) return;
      if (index === this.centeredIndex) this.openDetail(card, index);
      else this.snapToIndex(index);
    });
    objects.push(hit);
    return objects;
  }

  private updateCards(): void {
    this.scrollX = finite(this.scrollX, 0);
    const rawCenter = -this.scrollX / SPACING;
    this.centeredIndex = Phaser.Math.Clamp(Math.round(rawCenter), 0, allTarotCards.length - 1);

    this.items.forEach((item) => {
      const distance = item.index - rawCenter;
      const x = finite(GAME_WIDTH / 2 + distance * SPACING, GAME_WIDTH / 2);
      const absDistance = Math.abs(distance);
      const scale = Phaser.Math.Clamp(CENTER_SCALE - absDistance * 0.28, SIDE_SCALE, CENTER_SCALE);
      const alpha = Phaser.Math.Clamp(1 - Math.max(0, absDistance - 1.2) * 0.3, 0.28, 1);
      const y = CARD_Y + Math.min(absDistance, 1) * 28;
      const visible = absDistance <= MAX_VISIBLE_DISTANCE;

      item.x = x;
      item.scale = scale;

      item.objects.slice(0, 5).forEach((object) => {
        const transform = object as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.Alpha;
        transform.setPosition(x, y);
        transform.setScale(scale);
        transform.setAlpha(alpha);
        object.setVisible(visible);
      });

      const countBg = item.objects[5] as Phaser.GameObjects.Rectangle;
      const count = item.objects[6] as Phaser.GameObjects.Text;
      const label = item.objects[7] as Phaser.GameObjects.Text;
      const hit = item.objects[8] as Phaser.GameObjects.Zone;
      const badgeScale = absDistance < 0.5 ? 1.08 : 0.92;
      const labelScale = absDistance < 0.5 ? 1.12 : 0.9;
      const badgeY = y - (BASE_CARD_H / 2 + 36) * scale;
      const labelY = y + (BASE_CARD_H / 2 + 104) * scale;

      countBg.setPosition(x, badgeY).setScale(badgeScale).setAlpha(alpha).setVisible(visible);
      count.setPosition(x, badgeY).setScale(badgeScale).setAlpha(alpha).setVisible(visible);
      label.setPosition(x, labelY).setScale(labelScale).setAlpha(alpha).setVisible(visible);
      hit.setPosition(x, y + 46 * scale).setScale(scale).setVisible(visible);

      const depthBase = 10 + Math.round((MAX_VISIBLE_DISTANCE - absDistance) * 10);
      item.objects.forEach((object, objectIndex) => object.setDepth(depthBase + objectIndex));
    });
  }

  private bindDragScroll(): void {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.detailObjects.length > 0) return;
      const x = pointerX(pointer);
      this.isDragging = true;
      this.dragStartX = x;
      this.startScrollX = finite(this.scrollX, 0);
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || this.detailObjects.length > 0) return;
      const x = pointerX(pointer);
      this.scrollX = Phaser.Math.Clamp(finite(this.startScrollX + x - this.dragStartX, 0), this.minScrollX, this.maxScrollX);
      this.updateCards();
    });
    this.input.on("pointerup", () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.snapToIndex(this.centeredIndex);
    });
  }

  private snapToIndex(index: number): void {
    const targetIndex = Phaser.Math.Clamp(index, 0, allTarotCards.length - 1);
    const targetScrollX = -targetIndex * SPACING;
    this.tweens.killTweensOf(this);
    this.tweens.add({
      targets: this,
      scrollX: targetScrollX,
      duration: 260,
      ease: "Cubic.easeOut",
      onUpdate: () => this.updateCards(),
      onComplete: () => this.updateCards(),
    });
  }

  private openDetail(card: TarotCard, index: number): void {
    this.clearDetail();
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x03020a, 0.76).setDepth(80).setInteractive();
    const panel = this.add.rectangle(GAME_WIDTH / 2, 910, GAME_WIDTH - 72, 1350, 0x080510, 0.98).setDepth(81);
    panel.setStrokeStyle(ss(3), 0xf6d365, 0.78);

    const image = this.add.image(GAME_WIDTH / 2, 420, card.imageKey).setOrigin(0.5).setDepth(82);
    const fitted = fit(this, card.imageKey, 320, 550);
    image.setDisplaySize(fitted.width, fitted.height);

    const title = this.add.text(GAME_WIDTH / 2, 735, card.displayName, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(18)}px`,
      color: "#fff6d6",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: GAME_WIDTH - 120 },
    }).setOrigin(0.5).setDepth(82);

    const meta = this.add.text(GAME_WIDTH / 2, 786, `${index + 1}/${allTarotCards.length} · ${arcanaLabel(card)}`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(12)}px`,
      color: "#cdbdff",
      align: "center",
    }).setOrigin(0.5).setDepth(82);

    const body = this.add.text(72, 850, `키워드 · ${card.keywords.join(" · ")}\n\n${card.description}\n\n해석 가이드\n${guide(card)}`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(15)}px`,
      color: "#f8f0ff",
      lineSpacing: ss(8),
      wordWrap: { width: GAME_WIDTH - 144 },
    }).setDepth(82);

    const close = this.add.rectangle(GAME_WIDTH / 2, 1500, 270, 62, 0x4b3315, 0.95).setDepth(83);
    close.setStrokeStyle(ss(2), 0xf6d365, 0.86);
    const closeText = this.add.text(GAME_WIDTH / 2, 1500, "갤러리로 돌아가기", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(14)}px`,
      color: "#fff6d6",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(84);
    const hit = makeZone(this, GAME_WIDTH / 2, 1500, 310, 90).setDepth(85).on("pointerdown", () => this.clearDetail());
    this.detailObjects = [overlay, panel, image, title, meta, body, close, closeText, hit];
  }

  private clearDetail(): void {
    this.detailObjects.forEach((object) => object.destroy());
    this.detailObjects = [];
  }

  private createBackButton(): void {
    const x = sx(72);
    const y = sy(70);
    const bg = this.add.rectangle(x, y, sx(96), sy(50), 0x100b18, 0.78).setDepth(30);
    bg.setStrokeStyle(ss(2), 0xf6d365, 0.64);
    this.add.text(x, y, "←", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(24)}px`,
      color: "#fff6d6",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(31);
    makeZone(this, x, y, sx(116), sy(74)).setDepth(32).on("pointerdown", () => this.scene.start("IntroScene"));
  }
}
