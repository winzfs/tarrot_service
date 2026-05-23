import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import { addRuneRing, addSoftGlow, playBurst, spawnTextureSparkles } from "../vfx/vfxEffects";

const CARD_BACK_IMAGE_KEY = "tarot-card-back";
const CARD_FRAME_GAP = 6;

function fitTexture(scene: Phaser.Scene, key: string, maxW: number, maxH: number): { width: number; height: number } {
  const source = scene.textures.get(key).getSourceImage() as { width: number; height: number };
  const ratio = source.width / source.height;
  const w = maxH * ratio;
  return w <= maxW ? { width: w, height: maxH } : { width: maxW, height: maxW / ratio };
}

function addOuterCardFrame(scene: Phaser.Scene, imageWidth: number, imageHeight: number, x = 0, y = 0): Phaser.GameObjects.Graphics {
  const frame = scene.add.graphics();
  const gap = ss(CARD_FRAME_GAP);
  const frameWidth = imageWidth + gap * 2;
  const frameHeight = imageHeight + gap * 2;
  const left = x - frameWidth / 2;
  const top = y - frameHeight / 2;

  frame.lineStyle(ss(3), 0xf6d365, 0.98);
  frame.strokeRect(left, top, frameWidth, frameHeight);
  frame.lineStyle(ss(1), 0xb58cff, 0.56);
  frame.strokeRect(left + ss(5), top + ss(5), frameWidth - ss(10), frameHeight - ss(10));
  return frame;
}

export class IntroScene extends Phaser.Scene {
  private isStarting = false;

  constructor() { super("IntroScene"); }

  create(): void {
    this.isStarting = false;
    this.createBackground();
    this.createCardApparition();
    this.createTitle();
    this.createStartButton();
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x21104f, 0x160b36, 0x09071a, 0x03020a, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    for (let i = 0; i < 120; i += 1) {
      const star = this.add.circle(Phaser.Math.Between(sx(8), GAME_WIDTH - sx(8)), Phaser.Math.Between(sy(8), GAME_HEIGHT - sy(8)), Phaser.Math.FloatBetween(ss(0.7), ss(2.1)), 0xf8f0ff, Phaser.Math.FloatBetween(0.22, 0.88));
      this.tweens.add({ targets: star, alpha: Phaser.Math.FloatBetween(0.08, 0.32), duration: Phaser.Math.Between(1500, 3800), yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }

  private createCardApparition(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = sy(350);
    const backGlow = addSoftGlow(this, centerX, centerY, 1, 0.9);
    const ring = addRuneRing(this, centerX, centerY, 2, 0.56);
    const card = this.add.container(centerX, centerY + sy(70)).setAlpha(0).setScale(0.72).setDepth(3);
    const maxW = sx(132);
    const maxH = sy(214);

    if (this.textures.exists(CARD_BACK_IMAGE_KEY)) {
      const fitted = fitTexture(this, CARD_BACK_IMAGE_KEY, maxW, maxH);
      const image = this.add.image(0, 0, CARD_BACK_IMAGE_KEY).setOrigin(0.5);
      image.setDisplaySize(fitted.width, fitted.height);
      card.add([image, addOuterCardFrame(this, fitted.width, fitted.height)]);
    } else {
      const bg = this.add.graphics();
      bg.fillStyle(0x160c32, 0.98);
      bg.fillRect(-maxW / 2, -maxH / 2, maxW, maxH);
      bg.lineStyle(ss(3), 0xf6d365, 0.95);
      bg.strokeRect(-maxW / 2 - ss(CARD_FRAME_GAP), -maxH / 2 - ss(CARD_FRAME_GAP), maxW + ss(CARD_FRAME_GAP * 2), maxH + ss(CARD_FRAME_GAP * 2));
      card.add([bg, this.add.text(0, 0, "✦", { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${ss(52)}px`, color: "#fff6d6", stroke: "#2c174f", strokeThickness: ss(4) }).setOrigin(0.5)]);
    }

    this.tweens.add({ targets: backGlow, alpha: 0.34, scale: 1.45, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: ring, alpha: 0.68, angle: 360, duration: 36000, repeat: -1, ease: "Linear" });
    this.tweens.add({ targets: card, alpha: 1, y: centerY, scale: 1, delay: 280, duration: 980, ease: "Back.easeOut" });
    this.tweens.add({ targets: card, y: centerY - sy(10), delay: 1280, duration: 2100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.time.delayedCall(760, () => { playBurst(this, centerX, centerY, 4, 0.72); spawnTextureSparkles(this, centerX, centerY, 5, 28, ss(36), ss(150)); });
  }

  private createTitle(): void {
    this.add.text(GAME_WIDTH / 2, sy(108), "ARCANA\nGATE", { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${ss(58)}px`, color: "#f8f0ff", align: "center", stroke: "#2c174f", strokeThickness: ss(7), letterSpacing: ss(5) }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, sy(204), "별빛 아래 열리는 작은 타로 의식", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(18)}px`, color: "#d9c8ff", align: "center" }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, sy(700), "여행자여, 이 문은 답을 강요하지 않습니다.\n다만 당신 안에 이미 놓인 길을 비출 뿐입니다.", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(16)}px`, color: "#f8f0ff", align: "center", lineSpacing: ss(8), wordWrap: { width: sx(320) } }).setOrigin(0.5);
  }

  private createStartButton(): void {
    const width = sx(304), height = sy(72), x = GAME_WIDTH / 2, y = GAME_HEIGHT - sy(190);
    const panel = this.add.graphics();
    panel.fillStyle(0x1b1238, 0.92);
    panel.fillRoundedRect(x - width / 2, y - height / 2, width, height, ss(22));
    panel.lineStyle(ss(3), 0xf6d365, 0.9);
    panel.strokeRoundedRect(x - width / 2, y - height / 2, width, height, ss(22));
    const label = this.add.text(x, y, "운명의 문에 손을 얹는다", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(20)}px`, color: "#fff6d6", fontStyle: "bold" }).setOrigin(0.5);
    const hitArea = this.add.zone(x, y, width + sx(40), height + sy(30)).setInteractive({ useHandCursor: true });

    const galleryY = GAME_HEIGHT - sy(106), galleryWidth = sx(246), galleryHeight = sy(54);
    const galleryPanel = this.add.graphics();
    galleryPanel.fillStyle(0x0f0a25, 0.72);
    galleryPanel.fillRoundedRect(x - galleryWidth / 2, galleryY - galleryHeight / 2, galleryWidth, galleryHeight, ss(18));
    galleryPanel.lineStyle(ss(2), 0x6d4aff, 0.72);
    galleryPanel.strokeRoundedRect(x - galleryWidth / 2, galleryY - galleryHeight / 2, galleryWidth, galleryHeight, ss(18));
    this.add.text(x, galleryY, "연출 샘플 보기", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(15)}px`, color: "#d9c8ff", fontStyle: "bold" }).setOrigin(0.5);
    const galleryHitArea = this.add.zone(x, galleryY, galleryWidth + sx(40), galleryHeight + sy(24)).setInteractive({ useHandCursor: true });

    hitArea.on("pointerdown", () => {
      if (this.isStarting) return;
      this.isStarting = true;
      hitArea.disableInteractive();
      galleryHitArea.disableInteractive();
      label.setText("속삭임의 방으로...");
      this.cameras.main.fadeOut(520, 9, 7, 26);
      this.time.delayedCall(540, () => this.scene.start("QuestionScene"));
    });
    galleryHitArea.on("pointerdown", () => {
      if (this.isStarting) return;
      this.isStarting = true;
      hitArea.disableInteractive();
      galleryHitArea.disableInteractive();
      this.cameras.main.fadeOut(360, 9, 7, 26);
      this.time.delayedCall(380, () => this.scene.start("VfxGalleryScene"));
    });
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - sy(52), "질문은 곧 별빛에 봉인됩니다", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(13)}px`, color: "#8f7cc8" }).setOrigin(0.5);
  }
}
