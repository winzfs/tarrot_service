import Phaser from "phaser";
import { warmUpVfxAssets } from "../assets/lazyLoadAssets";
import { DESIGN_GAME_HEIGHT, GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import { INTRO_TITLE_IMAGE_KEY } from "./BootScene";
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
  private startHitArea?: Phaser.GameObjects.Zone;

  constructor() { super("IntroScene"); }

  create(): void {
    this.isStarting = false;
    this.startHitArea = undefined;
    this.createBackground();
    this.createCardApparition();
    this.createTitle();
    this.createStartButton();
    this.bindStartShortcuts();
    warmUpVfxAssets(this);
  }

  private beginQuestionScene(): void {
    if (this.isStarting) return;
    this.isStarting = true;
    this.startHitArea?.disableInteractive();
    this.cameras.main.fadeOut(520, 9, 7, 26);
    this.time.delayedCall(540, () => this.scene.start("QuestionScene"));
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
    const centerY = sy(430);
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
    if (this.textures.exists(INTRO_TITLE_IMAGE_KEY)) {
      const titleY = sy(138);
      const fitted = fitTexture(this, INTRO_TITLE_IMAGE_KEY, sx(356), sy(166));
      const titleImage = this.add.image(GAME_WIDTH / 2, titleY, INTRO_TITLE_IMAGE_KEY).setOrigin(0.5).setDepth(4);
      titleImage.setDisplaySize(fitted.width, fitted.height);
      titleImage.setBlendMode(Phaser.BlendModes.SCREEN);
      titleImage.setAlpha(0.98);
      this.tweens.add({ targets: titleImage, alpha: 0.86, duration: 1450, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.createTitleSparkles(GAME_WIDTH / 2, titleY, fitted.width, fitted.height);
    }

    this.add.text(GAME_WIDTH / 2, sy(246), "별빛 아래 열리는 작은 타로 의식", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(15)}px`, color: "#d9c8ff", align: "center" }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, sy(746), "여행자여, 이 문은 답을 강요하지 않습니다.\n다만 당신 안에 이미 놓인 길을 비출 뿐입니다.", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(16)}px`, color: "#f8f0ff", align: "center", lineSpacing: ss(8), wordWrap: { width: sx(320) } }).setOrigin(0.5);
  }

  private createTitleSparkles(centerX: number, centerY: number, width: number, height: number): void {
    for (let i = 0; i < 30; i += 1) {
      const sparkle = this.add.circle(
        centerX + Phaser.Math.Between(-width * 0.58, width * 0.58),
        centerY + Phaser.Math.Between(-height * 0.46, height * 0.52),
        Phaser.Math.FloatBetween(ss(0.55), ss(1.55)),
        Phaser.Math.RND.pick([0xfff6d6, 0xf6d365, 0xd9c8ff]),
        0,
      ).setDepth(8).setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({ targets: sparkle, alpha: { from: 0, to: Phaser.Math.FloatBetween(0.36, 0.82) }, scale: { from: 0.45, to: Phaser.Math.FloatBetween(1.25, 2.05) }, y: sparkle.y - Phaser.Math.Between(sy(2), sy(8)), duration: Phaser.Math.Between(760, 1400), delay: Phaser.Math.Between(0, 1200), yoyo: true, repeat: -1, repeatDelay: Phaser.Math.Between(180, 1100), ease: "Sine.easeInOut" });
    }

    for (let i = 0; i < 8; i += 1) {
      const glint = this.add.text(
        centerX + Phaser.Math.Between(-width * 0.52, width * 0.52),
        centerY + Phaser.Math.Between(-height * 0.34, height * 0.38),
        Phaser.Math.RND.pick(["✦", "✧", "⋆"]),
        { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${Phaser.Math.Between(ss(8), ss(14))}px`, color: Phaser.Math.RND.pick(["#fff6d6", "#f6d365", "#d9c8ff"]), stroke: "#09071a", strokeThickness: ss(1) },
      ).setOrigin(0.5).setAlpha(0).setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: glint, alpha: { from: 0, to: Phaser.Math.FloatBetween(0.55, 0.88) }, scale: { from: 0.42, to: Phaser.Math.FloatBetween(0.92, 1.18) }, angle: Phaser.Math.RND.pick([-10, 10, 14, -14]), duration: Phaser.Math.Between(760, 1180), delay: Phaser.Math.Between(0, 1700), yoyo: true, repeat: -1, repeatDelay: Phaser.Math.Between(650, 1700), ease: "Sine.easeInOut" });
    }

    const sweep = this.add.rectangle(centerX - width * 0.58, centerY, ss(5), height * 0.62, 0xfff6d6, 0).setDepth(10).setBlendMode(Phaser.BlendModes.ADD).setAngle(18);
    this.tweens.add({ targets: sweep, x: centerX + width * 0.58, alpha: { from: 0, to: 0.28 }, duration: 1550, delay: 900, repeat: -1, repeatDelay: 2600, ease: "Sine.easeInOut" });
  }

  private createStartButton(): void {
    const width = sx(238), height = sy(70), x = GAME_WIDTH / 2;
    const y = Math.min(DESIGN_GAME_HEIGHT - sy(220), GAME_HEIGHT - sy(120));
    const left = x - width / 2;
    const top = y - height / 2;
    const panel = this.add.graphics().setDepth(20);

    panel.fillGradientStyle(0x4d3191, 0x4d3191, 0x23154e, 0x23154e, 0.98);
    panel.fillRect(left, top, width, height);
    panel.lineStyle(ss(3), 0xf6d365, 0.9);
    panel.strokeRect(left, top, width, height);
    panel.lineStyle(ss(1), 0xfff6d6, 0.2);
    panel.strokeRect(left + ss(6), top + ss(6), width - ss(12), height - ss(12));
    panel.lineStyle(ss(1), 0xb58cff, 0.3);
    panel.strokeRect(left + ss(12), top + ss(12), width - ss(24), height - ss(24));

    const sweep = this.add.rectangle(left - width * 0.14, y, width * 0.16, height * 1.65, 0xfff6d6, 0.1).setAngle(18).setBlendMode(Phaser.BlendModes.ADD).setDepth(21);
    const label = this.add.text(x, y, "운명의 문에 손을 얹는다", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(17)}px`, color: "#fff6d6", fontStyle: "bold" }).setOrigin(0.5).setDepth(22);
    const hitArea = this.add.zone(x, y, width + sx(26), height + sy(24)).setDepth(30).setInteractive({ useHandCursor: true });
    this.startHitArea = hitArea;

    this.tweens.add({ targets: sweep, x: left + width * 1.14, alpha: { from: 0, to: 0.16 }, duration: 1900, repeat: -1, repeatDelay: 2500, ease: "Sine.easeInOut" });

    hitArea.on("pointerdown", () => {
      label.setText("속삭임의 방으로...");
      this.beginQuestionScene();
    });
  }

  private bindStartShortcuts(): void {
    this.input.keyboard?.once("keydown-ENTER", () => this.beginQuestionScene());
    this.input.keyboard?.once("keydown-SPACE", () => this.beginQuestionScene());
  }
}
