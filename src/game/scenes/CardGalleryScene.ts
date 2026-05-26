import Phaser from "phaser";
import { allTarotCards } from "../../tarot/cards";
import type { TarotCard } from "../../tarot/types";
import { GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";

const BASE_CARD_W = 250;
const BASE_CARD_H = 425;
const FRAME_PAD = 16;
const CENTER_SCALE = 1.18;
const SIDE_SCALE = 0.78;
const SPACING = 330;
const CARD_Y = 850;
const MAX_VISIBLE_DISTANCE = 2.4;

type GalleryItem = {
  card: TarotCard;
  index: number;
  container: Phaser.GameObjects.Container;
  hit: Phaser.GameObjects.Zone;
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

function compactKeywords(card: TarotCard): string {
  return card.keywords.slice(0, 4).join(" · ");
}

function majorEssence(card: TarotCard): string {
  const map: Record<string, string> = {
    "The Fool": "아직 아무것도 확정되지 않은 첫걸음입니다. 두려움보다 가능성이 앞서지만, 어디로 발을 내딛는지는 직접 정해야 합니다.",
    "The Magician": "이미 손안에 도구가 모여 있습니다. 중요한 것은 재능의 유무가 아니라 그것을 어떤 의도로 현실에 꺼내는가입니다.",
    "The High Priestess": "겉으로 보이는 말보다 침묵 속의 신호가 큽니다. 지금은 서두르기보다 아직 드러나지 않은 정보를 기다릴 때입니다.",
    "The Empress": "자라나는 것, 돌보는 것, 마음이 풍요로워지는 흐름을 말합니다. 급하게 밀기보다 무르익을 시간을 주어야 합니다.",
    "The Emperor": "흔들리는 상황에 기준과 질서를 세우는 카드입니다. 감정보다 책임, 약속, 구조가 해답에 가까워집니다.",
    "The Hierophant": "혼자만의 방식보다 이미 검증된 길과 조언자, 규칙을 살펴보라는 카드입니다. 배움과 신뢰의 문이 열립니다.",
    "The Lovers": "끌림만이 아니라 선택의 책임을 묻습니다. 무엇을 택하면 내 마음과 가치가 함께 남는지 바라보게 합니다.",
    "The Chariot": "흩어진 힘을 한 방향으로 묶어 전진하는 카드입니다. 망설임보다 목표를 향한 조율된 움직임이 필요합니다.",
    Strength: "거칠게 밀어붙이는 힘이 아니라 부드럽게 다루는 용기입니다. 감정과 본능을 적으로 보지 않고 길들이는 장면입니다.",
    "The Hermit": "잠시 물러나 내 기준의 등불을 찾는 카드입니다. 바깥의 소음보다 혼자 있을 때 보이는 진실이 중요해집니다.",
    "Wheel of Fortune": "흐름이 바뀌는 순간입니다. 모든 것을 통제하려 하기보다 타이밍을 읽고 변화에 몸을 맞추는 지혜가 필요합니다.",
    Justice: "공정함, 책임, 선택의 결과를 비춥니다. 감정만으로 판단하기보다 사실과 기준을 차분히 세워야 합니다.",
    "The Hanged Man": "멈춤은 실패가 아니라 관점이 뒤집히는 시간입니다. 지금 당장 움직이지 않아야 보이는 답이 있습니다.",
    Death: "끝을 통해 다음 형태가 열립니다. 무언가를 놓아야만 새로운 흐름이 들어올 수 있음을 보여줍니다.",
    Temperance: "서로 다른 것을 섞어 알맞은 비율을 찾는 카드입니다. 극단보다 조율, 속도보다 균형이 중요합니다.",
    "The Devil": "집착, 유혹, 반복되는 패턴을 정직하게 보게 합니다. 묶여 있다는 사실을 알아차릴 때 끈은 느슨해집니다.",
    "The Tower": "더는 버티기 어려운 구조가 흔들립니다. 불편한 진실이 드러나지만, 그 덕분에 새로 지을 자리가 생깁니다.",
    "The Star": "상처 뒤에 다시 믿어보는 힘입니다. 당장 결과보다 회복의 방향과 긴 호흡의 희망을 보여줍니다.",
    "The Moon": "불안과 상상, 아직 확인되지 않은 감정의 안개입니다. 보이는 것을 곧바로 사실로 단정하지 말아야 합니다.",
    "The Sun": "숨김없이 드러나는 밝은 에너지입니다. 명확함, 기쁨, 인정, 자신감이 상황을 환하게 비춥니다.",
    Judgement: "외면해온 부름에 응답하는 카드입니다. 과거의 결산을 통해 다시 선택할 기회가 찾아옵니다.",
    "The World": "한 사이클이 완성되는 문입니다. 끝맺음과 성취, 그리고 다음 장으로 넘어갈 준비를 함께 보여줍니다.",
  };
  return map[card.name] ?? `${card.koreanName}은 ${compactKeywords(card)}의 큰 흐름을 통해 질문의 중심축을 비춥니다.`;
}

function suitTheme(card: TarotCard): string {
  if (card.suit === "cups") return "감정, 관계, 애착, 마음의 교류";
  if (card.suit === "swords") return "생각, 판단, 말, 갈등과 선택";
  if (card.suit === "wands") return "열정, 행동, 의지, 시작하는 에너지";
  return "돈, 일, 몸, 생활, 안정과 현실 기반";
}

function rankPhase(card: TarotCard): string {
  const rank = card.name.split(" of ")[0];
  const phases: Record<string, string> = {
    Ace: "막 손에 들어온 씨앗 같은 시작점",
    Two: "둘 사이의 균형과 선택이 생기는 단계",
    Three: "첫 확장과 협력이 밖으로 드러나는 단계",
    Four: "안정되지만 동시에 굳어질 수 있는 정착 단계",
    Five: "충돌과 결핍, 균열이 표면으로 올라오는 전환점",
    Six: "회복과 교환, 다음 흐름으로 건너가는 단계",
    Seven: "시험, 방어, 평가, 인내가 필요한 구간",
    Eight: "반복과 숙련, 빠른 전개 또는 갇힌 패턴",
    Nine: "개인적 완성 직전의 내면 결과를 마주하는 단계",
    Ten: "한 사이클의 완성, 부담 또는 결실이 꽉 찬 단계",
    Page: "배우기 시작하는 어린 가능성과 새 소식",
    Knight: "움직임이 커지고 방향성이 강해지는 단계",
    Queen: "수트의 힘을 내면화하고 돌보는 성숙한 태도",
    King: "수트의 힘을 외부에서 책임 있게 운용하는 단계",
  };
  return phases[rank] ?? "이 카드가 속한 흐름의 한 단계";
}

function minorGuide(card: TarotCard): string {
  const rank = card.name.split(" of ")[0];
  const keywordText = compactKeywords(card);
  return [
    `${card.koreanName}은 ${suitTheme(card)}의 영역에서 ${rankPhase(card)}을 보여줍니다.`,
    `${keywordText}의 흐름은 이 카드가 단순한 결과가 아니라 지금 상황에서 어떤 태도와 움직임을 요구하는지 알려줍니다.`,
    `${rank}의 단계가 강하게 드러나므로, 질문에 적용할 때는 "지금 이 흐름이 막 시작되는지, 커지는지, 정리되는지"를 함께 보면 좋습니다.`,
  ].join(" ");
}

function guide(card: TarotCard): string {
  if (card.arcana === "major") {
    return [
      majorEssence(card),
      "이 카드는 작은 사건 하나보다 상황 전체를 움직이는 태도와 전환점을 읽을 때 중요합니다.",
      "질문에 적용할 때는 \"내가 지금 어떤 문턱 앞에 서 있는가\"를 먼저 살펴보세요.",
    ].join(" ");
  }
  return minorGuide(card);
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
    this.items = allTarotCards.map((card, index) => this.createCardItem(card, index));
    this.updateCards();
  }

  private createCardItem(card: TarotCard, index: number): GalleryItem {
    const container = this.add.container(0, 0).setDepth(10);

    const shadow = this.add.rectangle(0, 0, BASE_CARD_W + FRAME_PAD * 2 + 18, BASE_CARD_H + FRAME_PAD * 2 + 18, 0x03020a, 0.5);
    const frameBack = this.add.rectangle(0, 0, BASE_CARD_W + FRAME_PAD * 2, BASE_CARD_H + FRAME_PAD * 2, 0x0c0717, 1);
    frameBack.setStrokeStyle(ss(4), 0xf6d365, 1);
    const frameInner = this.add.rectangle(0, 0, BASE_CARD_W + FRAME_PAD * 2 - 12, BASE_CARD_H + FRAME_PAD * 2 - 12, 0x0c0717, 0);
    frameInner.setStrokeStyle(ss(3), 0xb58cff, 0.78);

    container.add([shadow, frameBack]);

    if (this.textures.exists(card.imageKey)) {
      const image = this.add.image(0, 0, card.imageKey).setOrigin(0.5);
      const fitted = fit(this, card.imageKey, BASE_CARD_W, BASE_CARD_H);
      image.setDisplaySize(fitted.width, fitted.height);
      container.add(image);
    } else {
      container.add(this.add.text(0, 0, "이미지\n없음", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(12)}px`,
        color: "#f6d365",
        align: "center",
      }).setOrigin(0.5));
    }

    container.add(frameInner);

    const badgeY = -(BASE_CARD_H / 2 + FRAME_PAD + 54);
    const badge = this.add.rectangle(0, badgeY, 108, 34, 0xf6d365, 1);
    const badgeText = this.add.text(0, badgeY, `${index + 1}/${allTarotCards.length}`, {
      fontFamily: "monospace",
      fontSize: `${ss(11)}px`,
      color: "#3a2409",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);

    const labelY = BASE_CARD_H / 2 + FRAME_PAD + 74;
    const label = this.add.text(0, labelY, card.koreanName, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(15)}px`,
      color: "#fff6d6",
      fontStyle: "bold",
      align: "center",
      stroke: "#09071a",
      strokeThickness: ss(3),
      wordWrap: { width: BASE_CARD_W + 96 },
    }).setOrigin(0.5);

    container.add([badge, badgeText, label]);

    const hit = makeZone(this, 0, 0, BASE_CARD_W + FRAME_PAD * 2 + 92, BASE_CARD_H + FRAME_PAD * 2 + 250).setDepth(80);
    hit.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      const tapped = Math.abs(pointerX(pointer) - this.dragStartX) <= 30;
      if (!tapped) return;
      if (index === this.centeredIndex) this.openDetail(card, index);
      else this.snapToIndex(index);
    });

    return { card, index, container, hit, x: 0, scale: SIDE_SCALE };
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
      const depthBase = 10 + Math.round((MAX_VISIBLE_DISTANCE - absDistance) * 10);

      item.x = x;
      item.scale = scale;
      item.container.setPosition(x, y).setScale(scale).setAlpha(alpha).setVisible(visible).setDepth(depthBase);
      item.hit.setPosition(x, y + 46 * scale).setScale(scale).setVisible(visible).setDepth(depthBase + 80);
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

    const body = this.add.text(72, 850, `키워드 · ${card.keywords.join(" · ")}\n\n${card.description}\n\n고유 해석\n${guide(card)}`, {
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
