import Phaser from "phaser";
import type { ReadingDraft } from "../state/ReadingDraft";
import { GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import { CARD_BACK_IMAGE_KEY } from "./BootScene";
import { addRuneRing, addSoftGlow, playBurst, spawnTextureSparkles } from "../vfx/vfxEffects";

const CARD_COUNT = 18;
const CARD_W = 104;
const CARD_H = 166;

type ShuffledReadingDraft = ReadingDraft & { __fromShuffleScene?: boolean };

function fitTexture(scene: Phaser.Scene, key: string, maxW: number, maxH: number): { width: number; height: number } {
  const source = scene.textures.get(key).getSourceImage() as { width: number; height: number };
  const ratio = source.width / source.height;
  const w = maxH * ratio;
  return w <= maxW ? { width: w, height: maxH } : { width: maxW, height: maxW / ratio };
}

export class CardShuffleScene extends Phaser.Scene {
  private draft?: ReadingDraft;

  constructor() {
    super("CardShuffleScene");
  }

  init(data: ReadingDraft): void {
    this.draft = data;
  }

  create(): void {
    const draft = this.draft;
    if (!draft) {
      this.scene.start("QuestionScene");
      return;
    }

    this.createDarkStage();
    this.playShuffle(draft);
  }

  private createDarkStage(): void {
    this.cameras.main.setBackgroundColor("#010008");
    this.cameras.main.setAlpha(1);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x010008, 1);

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x03020a, 0x03020a, 0x12072f, 0x05020e, 1, 1, 1, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let i = 0; i < 90; i += 1) {
      const star = this.add.circle(
        Phaser.Math.Between(sx(8), GAME_WIDTH - sx(8)),
        Phaser.Math.Between(sy(8), GAME_HEIGHT - sy(8)),
        Phaser.Math.FloatBetween(ss(0.6), ss(1.8)),
        0xf8f0ff,
        Phaser.Math.FloatBetween(0.12, 0.42),
      );
      this.tweens.add({ targets: star, alpha: 0.04, duration: Phaser.Math.Between(700, 1500), yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    const centerX = GAME_WIDTH / 2;
    const centerY = sy(430);
    const glow = addSoftGlow(this, centerX, centerY, 2, 0.72);
    const ring = addRuneRing(this, centerX, centerY, 3, 0.34);
    this.tweens.add({ targets: glow, alpha: 0.32, scale: 1.65, duration: 980, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: ring, angle: 360, duration: 18000, repeat: -1, ease: "Linear" });

    this.add.text(GAME_WIDTH / 2, sy(238), "카드들이 어둠 속에서 섞입니다", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${ss(30)}px`,
      color: "#fff6d6",
      align: "center",
      stroke: "#09071a",
      strokeThickness: ss(5),
    }).setOrigin(0.5).setDepth(10).setAlpha(0.96);

    this.add.text(GAME_WIDTH / 2, sy(676), "질문에 닿을 카드들이 하나씩 제단으로 모입니다.", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(15)}px`,
      color: "#d9c8ff",
      align: "center",
      wordWrap: { width: sx(312) },
    }).setOrigin(0.5).setDepth(10).setAlpha(0.86);
  }

  private createCardBack(x: number, y: number, index: number): Phaser.GameObjects.Container {
    const width = sx(CARD_W);
    const height = sy(CARD_H);
    const container = this.add.container(x, y).setDepth(20 + index).setAlpha(0);

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
    const mark = this.add.text(0, 0, "✦", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${ss(34)}px`,
      color: "#b58cff",
    }).setOrigin(0.5);
    container.add([card, mark]);
    return container;
  }

  private playShuffle(draft: ReadingDraft): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = sy(452);
    const cards = Array.from({ length: CARD_COUNT }, (_, index) => {
      const startLeft = index % 2 === 0;
      const startX = startLeft ? -sx(160) : GAME_WIDTH + sx(160);
      const startY = centerY + Phaser.Math.Between(-sy(250), sy(230));
      return this.createCardBack(startX, startY, index);
    });

    cards.forEach((card, index) => {
      const lane = index - (CARD_COUNT - 1) / 2;
      const passY = centerY + lane * sy(13) + Phaser.Math.Between(-sy(22), sy(22));
      const midX = centerX + Phaser.Math.Between(-sx(160), sx(160));
      const targetX = centerX + Phaser.Math.Between(-sx(48), sx(48));
      const targetY = centerY + Phaser.Math.Between(-sy(36), sy(36));
      card.setAngle(Phaser.Math.Between(-24, 24));

      this.time.delayedCall(index * 48, () => {
        this.tweens.add({
          targets: card,
          alpha: 1,
          x: midX,
          y: passY,
          angle: Phaser.Math.Between(-38, 38),
          duration: 360,
          ease: "Cubic.easeOut",
          onComplete: () => {
            this.tweens.add({
              targets: card,
              x: targetX,
              y: targetY,
              angle: Phaser.Math.Between(-10, 10),
              scale: 0.78,
              duration: 440,
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
          scale: 0.38,
          x: centerX,
          y: centerY,
          angle: card.angle + Phaser.Math.Between(-70, 70),
          delay: index * 18,
          duration: 420,
          ease: "Sine.easeIn",
        });
      });
    });

    this.time.delayedCall(2450, () => {
      const nextDraft: ShuffledReadingDraft = { ...draft, __fromShuffleScene: true };
      this.cameras.main.fadeOut(360, 9, 7, 26);
      this.time.delayedCall(380, () => this.scene.start("CardSelectScene", nextDraft));
    });
  }
}
