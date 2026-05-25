import Phaser from "phaser";
import { allTarotCards } from "../../tarot/cards";
import type { TarotCard } from "../../tarot/types";
import { GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";

const CARD_W = sx(132);
const CARD_H = sy(228);
const GAP = sx(26);
const TRACK_Y = sy(520);

function fit(scene: Phaser.Scene, key: string, maxW: number, maxH: number): { width: number; height: number } {
  const source = scene.textures.get(key).getSourceImage() as { width: number; height: number };
  const ratio = source.width / source.height;
  const width = maxH * ratio;
  return width <= maxW ? { width, height: maxH } : { width: maxW, height: maxW / ratio };
}

function makeZoneInteractive(zone: Phaser.GameObjects.Zone, width: number, height: number): Phaser.GameObjects.Zone {
  zone.setSize(width, height);
  zone.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
  return zone;
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
  private track?: Phaser.GameObjects.Container;
  private minX = 0;
  private maxX = sx(54);
  private downX = 0;
  private startX = 0;
  private dragging = false;
  private detail: Phaser.GameObjects.GameObject[] = [];

  constructor() { super("CardGalleryScene"); }

  preload(): void {
    allTarotCards.forEach((card) => {
      if (!this.textures.exists(card.imageKey)) this.load.image(card.imageKey, card.imageUrl);
    });
  }

  create(): void {
    this.addBackground();
    this.addHeader();
    this.addTrack();
    this.addBackButton();
  }

  private addBackground(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x21104f, 0x160b36, 0x09071a, 0x03020a, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    for (let i = 0; i < 80; i += 1) {
      this.add.circle(Phaser.Math.Between(sx(10), GAME_WIDTH - sx(10)), Phaser.Math.Between(sy(10), GAME_HEIGHT - sy(10)), Phaser.Math.FloatBetween(ss(0.7), ss(1.9)), 0xf8f0ff, Phaser.Math.FloatBetween(0.14, 0.52));
    }
  }

  private addHeader(): void {
    this.add.text(GAME_WIDTH / 2, sy(66), "카드 갤러리", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${ss(30)}px`,
      color: "#f8f0ff",
      stroke: "#2c174f",
      strokeThickness: ss(5),
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, sy(110), "좌우로 넘기고 카드를 눌러 뜻을 펼쳐보세요.", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(13)}px`,
      color: "#d9c8ff",
    }).setOrigin(0.5);
  }

  private addTrack(): void {
    const panel = this.add.graphics();
    panel.fillStyle(0x07050d, 0.34).fillRoundedRect(sx(14), sy(150), GAME_WIDTH - sx(28), sy(730), ss(18));
    panel.lineStyle(ss(2), 0xf6d365, 0.18).strokeRoundedRect(sx(14), sy(150), GAME_WIDTH - sx(28), sy(730), ss(18));

    const track = this.add.container(this.maxX, TRACK_Y);
    this.track = track;
    allTarotCards.forEach((card, index) => track.add(this.makeCard(card, index * (CARD_W + GAP), 0, index)));

    const contentW = allTarotCards.length * CARD_W + (allTarotCards.length - 1) * GAP;
    this.minX = Math.min(this.maxX, GAME_WIDTH - sx(54) - contentW);

    this.add.text(GAME_WIDTH / 2, sy(902), "← 스와이프해서 전체 카드 보기 →", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(13)}px`,
      color: "#b9a7e8",
    }).setOrigin(0.5);

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.detail.length) return;
      this.dragging = true;
      this.downX = p.x;
      this.startX = track.x;
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this.dragging || this.detail.length) return;
      track.x = Phaser.Math.Clamp(this.startX + p.x - this.downX, this.minX, this.maxX);
    });
    this.input.on("pointerup", () => { this.dragging = false; });
    this.input.on("wheel", (_p: Phaser.Input.Pointer, _o: Phaser.GameObjects.GameObject[], dx: number, dy: number) => {
      if (this.detail.length) return;
      track.x = Phaser.Math.Clamp(track.x - (Math.abs(dx) > Math.abs(dy) ? dx : dy), this.minX, this.maxX);
    });
  }

  private makeCard(card: TarotCard, x: number, y: number, index: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const frame = this.add.graphics();
    frame.fillStyle(0x0c0717, 0.98).fillRect(-CARD_W / 2 - ss(6), -CARD_H / 2 - ss(6), CARD_W + ss(12), CARD_H + ss(12));
    frame.lineStyle(ss(2), 0xf6d365, 0.72).strokeRect(-CARD_W / 2 - ss(6), -CARD_H / 2 - ss(6), CARD_W + ss(12), CARD_H + ss(12));
    const img = this.add.image(0, 0, card.imageKey).setOrigin(0.5);
    const fitted = fit(this, card.imageKey, CARD_W, CARD_H);
    img.setDisplaySize(fitted.width, fitted.height);
    const label = this.add.text(0, CARD_H / 2 + sy(28), card.koreanName, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(11)}px`,
      color: "#fff6d6",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: CARD_W + sx(14) },
    }).setOrigin(0.5);
    const hit = makeZoneInteractive(this.add.zone(0, 0, CARD_W + sx(18), CARD_H + sy(78)), CARD_W + sx(18), CARD_H + sy(78));
    hit.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (Math.abs(p.x - this.downX) <= sx(12)) this.openDetail(card, index);
    });
    c.add([frame, img, label, hit]);
    return c;
  }

  private openDetail(card: TarotCard, index: number): void {
    this.clearDetail();
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x03020a, 0.74).setDepth(80).setInteractive();
    const x = sx(28), y = sy(132), w = GAME_WIDTH - sx(56), h = Math.min(sy(1200), GAME_HEIGHT - sy(180));
    const panel = this.add.graphics().setDepth(81);
    panel.fillStyle(0x080510, 0.96).fillRoundedRect(x, y, w, h, ss(18));
    panel.lineStyle(ss(3), 0xf6d365, 0.78).strokeRoundedRect(x, y, w, h, ss(18));

    const img = this.add.image(GAME_WIDTH / 2, y + sy(270), card.imageKey).setDepth(82).setOrigin(0.5).setAlpha(0).setScale(0.75);
    const fitted = fit(this, card.imageKey, sx(230), sy(400));
    img.setDisplaySize(fitted.width, fitted.height);

    const title = this.add.text(GAME_WIDTH / 2, y + sy(508), card.displayName, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(18)}px`,
      color: "#fff6d6",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: w - sx(40) },
    }).setOrigin(0.5).setDepth(82);
    const meta = this.add.text(GAME_WIDTH / 2, y + sy(548), `${index + 1}/${allTarotCards.length} · ${card.arcana === "major" ? "메이저 아르카나" : "마이너 아르카나"}`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(12)}px`,
      color: "#cdbdff",
    }).setOrigin(0.5).setDepth(82);
    const body = this.add.text(x + sx(28), y + sy(608), `키워드 · ${card.keywords.join(" · ")}\n\n${card.description}\n\n해석 가이드\n${guide(card)}`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(15)}px`,
      color: "#f8f0ff",
      lineSpacing: ss(8),
      wordWrap: { width: w - sx(56) },
    }).setDepth(82);

    const closeY = y + h - sy(58);
    const closeBg = this.add.graphics().setDepth(83);
    closeBg.fillStyle(0x4b3315, 0.92).fillRoundedRect(GAME_WIDTH / 2 - sx(112), closeY - sy(26), sx(224), sy(52), ss(10));
    closeBg.lineStyle(ss(2), 0xf6d365, 0.86).strokeRoundedRect(GAME_WIDTH / 2 - sx(112), closeY - sy(26), sx(224), sy(52), ss(10));
    const closeText = this.add.text(GAME_WIDTH / 2, closeY, "갤러리로 돌아가기", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(14)}px`, color: "#fff6d6", fontStyle: "bold" }).setOrigin(0.5).setDepth(84);
    const closeHit = makeZoneInteractive(this.add.zone(GAME_WIDTH / 2, closeY, sx(246), sy(74)).setDepth(85), sx(246), sy(74)).on("pointerdown", () => this.clearDetail());

    this.detail = [overlay, panel, img, title, meta, body, closeBg, closeText, closeHit];
    this.tweens.add({ targets: img, alpha: 1, scale: 1, duration: 260, ease: "Back.easeOut" });
  }

  private clearDetail(): void {
    this.detail.forEach((object) => object.destroy());
    this.detail = [];
  }

  private addBackButton(): void {
    const x = sx(70), y = sy(68);
    const bg = this.add.graphics().setDepth(30);
    bg.fillStyle(0x100b18, 0.76).fillRoundedRect(x - sx(44), y - sy(24), sx(88), sy(48), ss(10));
    bg.lineStyle(ss(2), 0xf6d365, 0.52).strokeRoundedRect(x - sx(44), y - sy(24), sx(88), sy(48), ss(10));
    this.add.text(x, y, "←", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(24)}px`, color: "#fff6d6", fontStyle: "bold" }).setOrigin(0.5).setDepth(31);
    makeZoneInteractive(this.add.zone(x, y, sx(110), sy(68)).setDepth(32), sx(110), sy(68)).on("pointerdown", () => this.scene.start("IntroScene"));
  }
}
