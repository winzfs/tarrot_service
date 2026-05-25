import Phaser from "phaser";
import { allTarotCards } from "../../tarot/cards";
import type { TarotCard } from "../../tarot/types";
import { GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";

const VERSION = "gallery-phaser-direct-v3";
const CARD_W = sx(112);
const CARD_H = sy(194);
const COL_GAP = sx(28);
const ROW_GAP = sy(82);
const ROWS = 2;

type GalleryItem = {
  card: TarotCard;
  index: number;
  col: number;
  row: number;
  baseX: number;
  baseY: number;
  objects: Phaser.GameObjects.GameObject[];
  hit: Phaser.GameObjects.Zone;
};

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

function makeZone(scene: Phaser.Scene, x: number, y: number, width: number, height: number): Phaser.GameObjects.Zone {
  const zone = scene.add.zone(x, y, width, height);
  zone.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
  return zone;
}

export class CardGalleryScene extends Phaser.Scene {
  private items: GalleryItem[] = [];
  private scrollX = 0;
  private minScrollX = 0;
  private maxScrollX = 0;
  private dragStartX = 0;
  private startScrollX = 0;
  private isDragging = false;
  private detailObjects: Phaser.GameObjects.GameObject[] = [];
  private firstRowY = sy(360);
  private startX = sx(128);

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
    this.createVisibilityProbe();
    this.createCards();
    this.createBackButton();
    this.bindDragScroll();
  }

  private createBackground(): void {
    const bg = this.add.graphics().setDepth(0);
    bg.fillGradientStyle(0x21104f, 0x160b36, 0x09071a, 0x03020a, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    for (let i = 0; i < 80; i += 1) {
      this.add.circle(
        Phaser.Math.Between(sx(10), GAME_WIDTH - sx(10)),
        Phaser.Math.Between(sy(10), GAME_HEIGHT - sy(10)),
        Phaser.Math.FloatBetween(ss(0.7), ss(1.8)),
        0xf8f0ff,
        Phaser.Math.FloatBetween(0.14, 0.5),
      ).setDepth(1);
    }
  }

  private createHeader(): void {
    this.add.text(GAME_WIDTH / 2, sy(68), "카드 갤러리", {
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

    this.add.text(GAME_WIDTH / 2, sy(148), `cards: ${allTarotCards.length}${allTarotCards[0] ? ` · ${allTarotCards[0].koreanName}` : ""}`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(11)}px`,
      color: "#f6d365",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(20);

    this.add.text(GAME_WIDTH / 2, sy(176), VERSION, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(10)}px`,
      color: "#98f5c7",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(20);
  }

  private createPanel(): void {
    const top = sy(205);
    const height = sy(600);
    const panel = this.add.rectangle(GAME_WIDTH / 2, top + height / 2, GAME_WIDTH - sx(36), height, 0x07050d, 0.34).setDepth(2);
    panel.setStrokeStyle(ss(2), 0xf6d365, 0.26);

    this.add.text(GAME_WIDTH / 2, top + height + sy(42), "← 스와이프해서 전체 카드 보기 →", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(13)}px`,
      color: "#b9a7e8",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(20);
  }

  private createVisibilityProbe(): void {
    const x = sx(92);
    const y = sy(250);
    const probe = this.add.rectangle(x, y, sx(92), sy(42), 0xf6d365, 0.95).setDepth(90);
    probe.setStrokeStyle(ss(2), 0x03020a, 1);
    this.add.text(x, y, "TEST", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(13)}px`,
      color: "#03020a",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(91);
  }

  private createCards(): void {
    if (allTarotCards.length === 0) {
      this.add.text(GAME_WIDTH / 2, sy(390), "카드 데이터를 불러오지 못했습니다.", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(18)}px`,
        color: "#ff9bb4",
      }).setOrigin(0.5).setDepth(40);
      return;
    }

    this.items = allTarotCards.map((card, index) => {
      const col = Math.floor(index / ROWS);
      const row = index % ROWS;
      return this.createCardItem(card, index, col, row);
    });

    const columns = Math.ceil(allTarotCards.length / ROWS);
    const contentWidth = columns * (CARD_W + COL_GAP);
    this.maxScrollX = 0;
    this.minScrollX = Math.min(0, GAME_WIDTH - this.startX - contentWidth - sx(80));
    this.updateCardPositions();
  }

  private createCardItem(card: TarotCard, index: number, col: number, row: number): GalleryItem {
    const back = this.add.rectangle(0, 0, CARD_W + ss(12), CARD_H + ss(12), 0x0c0717, 0.98).setDepth(10);
    back.setStrokeStyle(ss(2), 0xf6d365, 0.9);

    const inner = this.add.rectangle(0, 0, CARD_W, CARD_H, 0x21104f, 0.55).setDepth(11);
    inner.setStrokeStyle(ss(1), 0xb58cff, 0.56);

    const objects: Phaser.GameObjects.GameObject[] = [back, inner];

    if (this.textures.exists(card.imageKey)) {
      const image = this.add.image(0, 0, card.imageKey).setOrigin(0.5).setDepth(12);
      const fitted = fit(this, card.imageKey, CARD_W, CARD_H);
      image.setDisplaySize(fitted.width, fitted.height);
      objects.push(image);
    } else {
      objects.push(this.add.text(0, 0, "이미지\n로딩 중", {
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
      wordWrap: { width: CARD_W + sx(18) },
    }).setOrigin(0.5).setDepth(13);
    objects.push(label);

    const indexLabel = this.add.text(0, 0, `${index + 1}`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(10)}px`,
      color: "#03020a",
      fontStyle: "bold",
      backgroundColor: "#f6d365",
      padding: { x: ss(4), y: ss(2) },
    }).setOrigin(0.5).setDepth(14);
    objects.push(indexLabel);

    const hit = makeZone(this, 0, 0, CARD_W + sx(26), CARD_H + sy(80)).setDepth(15);
    hit.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (Math.abs(pointer.x - this.dragStartX) <= sx(14)) this.openDetail(card, index);
    });
    objects.push(hit);

    return { card, index, col, row, baseX: 0, baseY: 0, objects, hit };
  }

  private updateCardPositions(): void {
    this.items.forEach((item) => {
      const x = this.startX + item.col * (CARD_W + COL_GAP) + this.scrollX;
      const y = this.firstRowY + item.row * (CARD_H + ROW_GAP);
      item.baseX = x;
      item.baseY = y;

      item.objects.forEach((object) => {
        if ("setPosition" in object) {
          (object as Phaser.GameObjects.Components.Transform).setPosition(x, y);
        }
      });

      const label = item.objects[3] as Phaser.GameObjects.Text;
      label.setPosition(x, y + CARD_H / 2 + sy(28));
      const indexLabel = item.objects[4] as Phaser.GameObjects.Text;
      indexLabel.setPosition(x - CARD_W / 2 + sx(18), y - CARD_H / 2 + sy(18));

      const visible = x > -CARD_W && x < GAME_WIDTH + CARD_W;
      item.objects.forEach((object) => object.setVisible(visible));
    });
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
      this.scrollX = Phaser.Math.Clamp(this.startScrollX + pointer.x - this.dragStartX, this.minScrollX, this.maxScrollX);
      this.updateCardPositions();
    });

    this.input.on("pointerup", () => {
      this.isDragging = false;
    });

    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _objects: Phaser.GameObjects.GameObject[], dx: number, dy: number) => {
      if (this.detailObjects.length > 0) return;
      const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      this.scrollX = Phaser.Math.Clamp(this.scrollX - delta, this.minScrollX, this.maxScrollX);
      this.updateCardPositions();
    });
  }

  private openDetail(card: TarotCard, index: number): void {
    this.clearDetail();

    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x03020a, 0.76).setDepth(80).setInteractive();
    const panelW = GAME_WIDTH - sx(70);
    const panelH = Math.min(sy(1230), GAME_HEIGHT - sy(180));
    const panelX = GAME_WIDTH / 2;
    const panelTop = sy(140);
    const panel = this.add.rectangle(panelX, panelTop + panelH / 2, panelW, panelH, 0x080510, 0.98).setDepth(81);
    panel.setStrokeStyle(ss(3), 0xf6d365, 0.78);

    const image = this.add.image(panelX, sy(390), card.imageKey).setOrigin(0.5).setDepth(82).setAlpha(0).setScale(0.72);
    const fitted = fit(this, card.imageKey, sx(230), sy(400));
    image.setDisplaySize(fitted.width, fitted.height);

    const title = this.add.text(panelX, sy(630), card.displayName, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(18)}px`,
      color: "#fff6d6",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: panelW - sx(48) },
    }).setOrigin(0.5).setDepth(82);

    const meta = this.add.text(panelX, sy(670), `${index + 1}/${allTarotCards.length} · ${arcanaLabel(card)}`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(12)}px`,
      color: "#cdbdff",
      align: "center",
    }).setOrigin(0.5).setDepth(82);

    const body = this.add.text(panelX - panelW / 2 + sx(34), sy(730), `키워드 · ${card.keywords.join(" · ")}\n\n${card.description}\n\n해석 가이드\n${guide(card)}`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(15)}px`,
      color: "#f8f0ff",
      lineSpacing: ss(8),
      wordWrap: { width: panelW - sx(68) },
    }).setDepth(82);

    const closeY = panelTop + panelH - sy(58);
    const closeBg = this.add.rectangle(panelX, closeY, sx(238), sy(54), 0x4b3315, 0.94).setDepth(83);
    closeBg.setStrokeStyle(ss(2), 0xf6d365, 0.86);
    const closeText = this.add.text(panelX, closeY, "갤러리로 돌아가기", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(14)}px`,
      color: "#fff6d6",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(84);
    const closeHit = makeZone(this, panelX, closeY, sx(260), sy(78)).setDepth(85);
    closeHit.on("pointerdown", () => this.clearDetail());

    this.detailObjects = [overlay, panel, image, title, meta, body, closeBg, closeText, closeHit];
    this.tweens.add({ targets: image, alpha: 1, scale: 1, duration: 260, ease: "Back.easeOut" });
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
