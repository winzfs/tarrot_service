import Phaser from "phaser";
import { allTarotCards } from "../../tarot/cards";
import type { TarotCard } from "../../tarot/types";
import { GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";

const DEBUG_VERSION = "gallery-debug-v5";
const CARD_W = sx(116);
const CARD_H = sy(200);
const GAP_X = sx(30);
const GAP_Y = sy(82);
const ROWS = 2;

type GalleryItem = {
  card: TarotCard;
  index: number;
  col: number;
  row: number;
  objects: Phaser.GameObjects.GameObject[];
  x: number;
  y: number;
};

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

export class CardGalleryScene extends Phaser.Scene {
  private items: GalleryItem[] = [];
  private detailObjects: Phaser.GameObjects.GameObject[] = [];
  private debugText?: Phaser.GameObjects.Text;
  private scrollX = 0;
  private minScrollX = 0;
  private dragStartX = 0;
  private startScrollX = 0;
  private isDragging = false;
  private startX = sx(122);
  private firstRowY = sy(380);

  constructor() {
    super("CardGalleryScene");
  }

  preload(): void {
    allTarotCards.forEach((card) => {
      if (!this.textures.exists(card.imageKey)) this.load.image(card.imageKey, card.imageUrl);
    });
  }

  create(): void {
    this.cameras.main.setScroll(0, 0);
    this.createBackground();
    this.createHeader();
    this.createPanel();
    this.createProbe();
    this.createCards();
    this.createBackButton();
    this.createDebugOverlay();
    this.bindDragScroll();
    this.refreshDebug("create");
  }

  private createBackground(): void {
    const bg = this.add.graphics().setDepth(0);
    bg.fillGradientStyle(0x21104f, 0x160b36, 0x09071a, 0x03020a, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  private createHeader(): void {
    this.add.text(GAME_WIDTH / 2, sy(66), "카드 갤러리", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${ss(30)}px`,
      color: "#f8f0ff",
      stroke: "#2c174f",
      strokeThickness: ss(5),
    }).setOrigin(0.5).setDepth(20);

    this.add.text(GAME_WIDTH / 2, sy(112), "좌우로 넘기고 카드를 눌러 뜻을 펼쳐보세요.", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(13)}px`,
      color: "#d9c8ff",
    }).setOrigin(0.5).setDepth(20);

    this.add.text(GAME_WIDTH / 2, sy(146), `cards: ${allTarotCards.length}${allTarotCards[0] ? ` · ${allTarotCards[0].koreanName}` : ""}`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(11)}px`,
      color: "#f6d365",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(20);

    this.add.text(GAME_WIDTH / 2, sy(174), DEBUG_VERSION, {
      fontFamily: "monospace",
      fontSize: `${ss(10)}px`,
      color: "#98f5c7",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(20);
  }

  private createPanel(): void {
    const panel = this.add.rectangle(GAME_WIDTH / 2, sy(520), GAME_WIDTH - sx(36), sy(650), 0x07050d, 0.38).setDepth(2);
    panel.setStrokeStyle(ss(2), 0xf6d365, 0.28);
    this.add.text(GAME_WIDTH / 2, sy(870), "← 스와이프해서 전체 카드 보기 →", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(13)}px`,
      color: "#b9a7e8",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(20);
  }

  private createProbe(): void {
    const probe = this.add.rectangle(sx(92), sy(238), sx(100), sy(46), 0xf6d365, 0.96).setDepth(90);
    probe.setStrokeStyle(ss(2), 0x03020a, 1);
    this.add.text(sx(92), sy(238), "TEST", {
      fontFamily: "monospace",
      fontSize: `${ss(13)}px`,
      color: "#03020a",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(91);
  }

  private createCards(): void {
    this.items = allTarotCards.map((card, index) => {
      const col = Math.floor(index / ROWS);
      const row = index % ROWS;
      const objects = this.createCardObjects(card, index);
      return { card, index, col, row, objects, x: 0, y: 0 };
    });

    const columns = Math.ceil(allTarotCards.length / ROWS);
    const contentWidth = columns * (CARD_W + GAP_X);
    this.minScrollX = Math.min(0, GAME_WIDTH - this.startX - contentWidth - sx(80));
    this.updateCards();
  }

  private createCardObjects(card: TarotCard, index: number): Phaser.GameObjects.GameObject[] {
    const back = this.add.rectangle(0, 0, CARD_W + ss(12), CARD_H + ss(12), 0x0c0717, 1).setDepth(10);
    back.setStrokeStyle(ss(3), 0xf6d365, 1);
    const inner = this.add.rectangle(0, 0, CARD_W, CARD_H, 0x21104f, 0.72).setDepth(11);
    inner.setStrokeStyle(ss(1), 0xb58cff, 0.72);

    const objects: Phaser.GameObjects.GameObject[] = [back, inner];
    if (this.textures.exists(card.imageKey)) {
      const image = this.add.image(0, 0, card.imageKey).setOrigin(0.5).setDepth(12);
      const fitted = fit(this, card.imageKey, CARD_W, CARD_H);
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

    const label = this.add.text(0, 0, card.koreanName, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(11)}px`,
      color: "#fff6d6",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: CARD_W + sx(20) },
    }).setOrigin(0.5).setDepth(13);
    objects.push(label);

    const num = this.add.text(0, 0, `${index + 1}`, {
      fontFamily: "monospace",
      fontSize: `${ss(10)}px`,
      color: "#03020a",
      backgroundColor: "#f6d365",
      padding: { x: ss(4), y: ss(2) },
    }).setOrigin(0.5).setDepth(14);
    objects.push(num);

    const hit = makeZone(this, 0, 0, CARD_W + sx(28), CARD_H + sy(82)).setDepth(15);
    hit.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (Math.abs(pointer.x - this.dragStartX) <= sx(14)) this.openDetail(card, index);
    });
    objects.push(hit);
    return objects;
  }

  private updateCards(): void {
    this.items.forEach((item) => {
      const x = this.startX + item.col * (CARD_W + GAP_X) + this.scrollX;
      const y = this.firstRowY + item.row * (CARD_H + GAP_Y);
      item.x = x;
      item.y = y;
      item.objects.forEach((object) => {
        const transform = object as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;
        transform.setPosition(x, y);
      });
      (item.objects[3] as Phaser.GameObjects.Text).setPosition(x, y + CARD_H / 2 + sy(30));
      (item.objects[4] as Phaser.GameObjects.Text).setPosition(x - CARD_W / 2 + sx(18), y - CARD_H / 2 + sy(18));
      const visible = x > -CARD_W && x < GAME_WIDTH + CARD_W;
      item.objects.forEach((object) => object.setVisible(visible));
    });
    this.refreshDebug("updateCards");
  }

  private createDebugOverlay(): void {
    const bg = this.add.rectangle(GAME_WIDTH - sx(228), GAME_HEIGHT - sy(170), sx(430), sy(252), 0x03020a, 0.88).setDepth(200);
    bg.setStrokeStyle(ss(2), 0x98f5c7, 0.9);
    this.debugText = this.add.text(GAME_WIDTH - sx(430), GAME_HEIGHT - sy(288), "debug loading...", {
      fontFamily: "monospace",
      fontSize: `${ss(10)}px`,
      color: "#98f5c7",
      lineSpacing: ss(3),
      wordWrap: { width: sx(395) },
    }).setDepth(201);
  }

  private refreshDebug(status: string): void {
    if (!this.debugText) return;
    const first = allTarotCards[0];
    const firstItem = this.items[0];
    const textureOk = first ? this.textures.exists(first.imageKey) : false;
    this.debugText.setText([
      `status: ${status}`,
      `version: ${DEBUG_VERSION}`,
      `cards: ${allTarotCards.length}`,
      `items: ${this.items.length}`,
      `first: ${first?.koreanName ?? "none"}`,
      `imageKey: ${first?.imageKey ?? "none"}`,
      `texture: ${textureOk ? "ok" : "missing"}`,
      `firstXY: ${Math.round(firstItem?.x ?? -1)},${Math.round(firstItem?.y ?? -1)}`,
      `scrollX: ${Math.round(this.scrollX)} min:${Math.round(this.minScrollX)}`,
      `game: ${GAME_WIDTH}x${GAME_HEIGHT}`,
      `camera: ${this.cameras.main.width}x${this.cameras.main.height}`,
    ]);
  }

  private bindDragScroll(): void {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.detailObjects.length > 0) return;
      this.isDragging = true;
      this.dragStartX = pointer.x;
      this.startScrollX = this.scrollX;
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || this.detailObjects.length > 0) return;
      this.scrollX = Phaser.Math.Clamp(this.startScrollX + pointer.x - this.dragStartX, this.minScrollX, 0);
      this.updateCards();
    });
    this.input.on("pointerup", () => {
      this.isDragging = false;
      this.refreshDebug("pointerup");
    });
  }

  private openDetail(card: TarotCard, index: number): void {
    this.clearDetail();
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x03020a, 0.76).setDepth(80).setInteractive();
    const panel = this.add.rectangle(GAME_WIDTH / 2, sy(760), GAME_WIDTH - sx(72), sy(1160), 0x080510, 0.98).setDepth(81);
    panel.setStrokeStyle(ss(3), 0xf6d365, 0.78);
    const image = this.add.image(GAME_WIDTH / 2, sy(380), card.imageKey).setOrigin(0.5).setDepth(82);
    const fitted = fit(this, card.imageKey, sx(230), sy(400));
    image.setDisplaySize(fitted.width, fitted.height);
    const title = this.add.text(GAME_WIDTH / 2, sy(620), card.displayName, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(18)}px`,
      color: "#fff6d6",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: GAME_WIDTH - sx(120) },
    }).setOrigin(0.5).setDepth(82);
    const body = this.add.text(sx(72), sy(690), `키워드 · ${card.keywords.join(" · ")}\n\n${card.description}\n\n해석 가이드\n${guide(card)}`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(15)}px`,
      color: "#f8f0ff",
      lineSpacing: ss(8),
      wordWrap: { width: GAME_WIDTH - sx(144) },
    }).setDepth(82);
    const close = this.add.rectangle(GAME_WIDTH / 2, sy(1280), sx(250), sy(56), 0x4b3315, 0.95).setDepth(83);
    close.setStrokeStyle(ss(2), 0xf6d365, 0.86);
    const closeText = this.add.text(GAME_WIDTH / 2, sy(1280), "갤러리로 돌아가기", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(14)}px`,
      color: "#fff6d6",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(84);
    const hit = makeZone(this, GAME_WIDTH / 2, sy(1280), sx(280), sy(80)).setDepth(85).on("pointerdown", () => this.clearDetail());
    this.detailObjects = [overlay, panel, image, title, body, close, closeText, hit];
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
