import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import { addRuneRing, addSoftGlow, playBurst, spawnTextureSparkles } from "../vfx/vfxEffects";

export class IntroScene extends Phaser.Scene {
  private isStarting = false;

  constructor() {
    super("IntroScene");
  }

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
      const x = Phaser.Math.Between(sx(8), GAME_WIDTH - sx(8));
      const y = Phaser.Math.Between(sy(8), GAME_HEIGHT - sy(8));
      const radius = Phaser.Math.FloatBetween(ss(0.7), ss(2.1));
      const alpha = Phaser.Math.FloatBetween(0.22, 0.88);
      const star = this.add.circle(x, y, radius, 0xf8f0ff, alpha);

      this.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.08, 0.32),
        duration: Phaser.Math.Between(1500, 3800),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  private createCardApparition(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = sy(350);

    const backGlow = addSoftGlow(this, centerX, centerY, 1, 0.9);
    const ring = addRuneRing(this, centerX, centerY, 2, 0.56);
    const card = this.add.container(centerX, centerY + sy(70)).setAlpha(0).setScale(0.72).setDepth(3);

    const cardWidth = sx(132);
    const cardHeight = sy(214);
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x160c32, 0.98);
    cardBg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, ss(22));
    cardBg.lineStyle(ss(4), 0xf6d365, 0.95);
    cardBg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, ss(22));
    cardBg.lineStyle(ss(2), 0xb58cff, 0.56);
    cardBg.strokeRoundedRect(-cardWidth / 2 + ss(14), -cardHeight / 2 + ss(14), cardWidth - ss(28), cardHeight - ss(28), ss(16));
    cardBg.strokeCircle(0, 0, ss(45));
    cardBg.strokeCircle(0, 0, ss(64));

    const moon = this.add
      .text(0, -sy(62), "☾", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${ss(36)}px`,
        color: "#f6d365",
      })
      .setOrigin(0.5);

    const sigil = this.add
      .text(0, 0, "✦", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${ss(52)}px`,
        color: "#fff6d6",
        stroke: "#2c174f",
        strokeThickness: ss(4),
      })
      .setOrigin(0.5);

    const star = this.add
      .text(0, sy(70), "✧", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${ss(27)}px`,
        color: "#b58cff",
      })
      .setOrigin(0.5);

    card.add([cardBg, moon, sigil, star]);

    this.tweens.add({ targets: backGlow, alpha: 0.34, scale: 1.45, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: ring, alpha: 0.68, angle: 360, duration: 36000, repeat: -1, ease: "Linear" });
    this.tweens.add({ targets: card, alpha: 1, y: centerY, scale: 1, delay: 280, duration: 980, ease: "Back.easeOut" });
    this.tweens.add({ targets: card, y: centerY - sy(10), delay: 1280, duration: 2100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.time.delayedCall(760, () => {
      playBurst(this, centerX, centerY, 4, 0.72);
      spawnTextureSparkles(this, centerX, centerY, 5, 28, ss(36), ss(150));
    });
  }

  private createTitle(): void {
    this.add
      .text(GAME_WIDTH / 2, sy(108), "ARCANA\nGATE", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${ss(58)}px`,
        color: "#f8f0ff",
        align: "center",
        stroke: "#2c174f",
        strokeThickness: ss(7),
        letterSpacing: ss(5),
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, sy(204), "별빛 아래 열리는 작은 타로 의식", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(18)}px`,
        color: "#d9c8ff",
        align: "center",
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        sy(700),
        "여행자여, 이 문은 답을 강요하지 않습니다.\n다만 당신 안에 이미 놓인 길을 비출 뿐입니다.",
        {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${ss(16)}px`,
          color: "#f8f0ff",
          align: "center",
          lineSpacing: ss(8),
          wordWrap: { width: sx(320) },
        },
      )
      .setOrigin(0.5);
  }

  private createStartButton(): void {
    const buttonWidth = sx(304);
    const buttonHeight = sy(72);
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT - sy(190);

    const panel = this.add.graphics();
    panel.fillStyle(0x1b1238, 0.92);
    panel.fillRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, ss(22));
    panel.lineStyle(ss(3), 0xf6d365, 0.9);
    panel.strokeRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, ss(22));

    const label = this.add
      .text(x, y, "운명의 문에 손을 얹는다", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(20)}px`,
        color: "#fff6d6",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const hitArea = this.add.zone(x, y, buttonWidth + sx(40), buttonHeight + sy(30)).setInteractive({ useHandCursor: true });
    hitArea.on("pointerdown", () => {
      if (this.isStarting) return;
      this.isStarting = true;
      hitArea.disableInteractive();
      galleryHitArea.disableInteractive();
      label.setText("속삭임의 방으로...");
      this.cameras.main.fadeOut(520, 9, 7, 26);
      this.time.delayedCall(540, () => this.scene.start("QuestionScene"));
    });

    const galleryY = GAME_HEIGHT - sy(106);
    const galleryWidth = sx(246);
    const galleryHeight = sy(54);
    const galleryPanel = this.add.graphics();
    galleryPanel.fillStyle(0x0f0a25, 0.72);
    galleryPanel.fillRoundedRect(x - galleryWidth / 2, galleryY - galleryHeight / 2, galleryWidth, galleryHeight, ss(18));
    galleryPanel.lineStyle(ss(2), 0x6d4aff, 0.72);
    galleryPanel.strokeRoundedRect(x - galleryWidth / 2, galleryY - galleryHeight / 2, galleryWidth, galleryHeight, ss(18));

    this.add
      .text(x, galleryY, "연출 샘플 보기", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(15)}px`,
        color: "#d9c8ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const galleryHitArea = this.add.zone(x, galleryY, galleryWidth + sx(40), galleryHeight + sy(24)).setInteractive({ useHandCursor: true });
    galleryHitArea.on("pointerdown", () => {
      if (this.isStarting) return;
      this.isStarting = true;
      hitArea.disableInteractive();
      galleryHitArea.disableInteractive();
      this.cameras.main.fadeOut(360, 9, 7, 26);
      this.time.delayedCall(380, () => this.scene.start("VfxGalleryScene"));
    });

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - sy(52), "질문은 곧 별빛에 봉인됩니다", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(13)}px`,
        color: "#8f7cc8",
      })
      .setOrigin(0.5);
  }
}
