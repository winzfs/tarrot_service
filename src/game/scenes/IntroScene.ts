import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../GameConfig";

export class IntroScene extends Phaser.Scene {
  constructor() {
    super("IntroScene");
  }

  create(): void {
    this.createBackground();
    this.createArcaneCircle();
    this.createTitle();
    this.createStartButton();
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x21104f, 0x160b36, 0x09071a, 0x03020a, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let i = 0; i < 80; i += 1) {
      const x = Phaser.Math.Between(8, GAME_WIDTH - 8);
      const y = Phaser.Math.Between(8, GAME_HEIGHT - 8);
      const radius = Phaser.Math.FloatBetween(0.6, 1.8);
      const alpha = Phaser.Math.FloatBetween(0.25, 0.9);
      const star = this.add.circle(x, y, radius, 0xf8f0ff, alpha);

      this.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.1, 0.35),
        duration: Phaser.Math.Between(1200, 3200),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  private createArcaneCircle(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = 292;

    const glow = this.add.circle(centerX, centerY, 132, 0x6d4aff, 0.1);
    this.tweens.add({
      targets: glow,
      scale: 1.12,
      alpha: 0.18,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const circle = this.add.graphics();
    circle.lineStyle(2, 0xf6d365, 0.85);
    circle.strokeCircle(centerX, centerY, 104);
    circle.lineStyle(1, 0xb58cff, 0.55);
    circle.strokeCircle(centerX, centerY, 78);
    circle.strokeCircle(centerX, centerY, 124);

    for (let i = 0; i < 12; i += 1) {
      const angle = Phaser.Math.DegToRad(i * 30);
      const innerX = centerX + Math.cos(angle) * 78;
      const innerY = centerY + Math.sin(angle) * 78;
      const outerX = centerX + Math.cos(angle) * 124;
      const outerY = centerY + Math.sin(angle) * 124;
      circle.lineBetween(innerX, innerY, outerX, outerY);
    }

    const gem = this.add.polygon(
      centerX,
      centerY,
      [
        0,
        -54,
        38,
        0,
        0,
        54,
        -38,
        0,
      ],
      0x1b1238,
      0.82,
    );
    gem.setStrokeStyle(2, 0xf6d365, 0.9);

    this.tweens.add({
      targets: [circle, gem],
      angle: 360,
      duration: 36000,
      repeat: -1,
      ease: "Linear",
    });
  }

  private createTitle(): void {
    this.add
      .text(GAME_WIDTH / 2, 112, "ARCANA\nGATE", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "48px",
        color: "#f8f0ff",
        align: "center",
        stroke: "#2c174f",
        strokeThickness: 6,
        letterSpacing: 4,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 188, "운명의 문을 여는 작은 타로 의식", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        color: "#d9c8ff",
        align: "center",
      })
      .setOrigin(0.5);
  }

  private createStartButton(): void {
    const buttonWidth = 248;
    const buttonHeight = 58;
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT - 174;

    const panel = this.add.graphics();
    panel.fillStyle(0x1b1238, 0.92);
    panel.fillRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, 18);
    panel.lineStyle(2, 0xf6d365, 0.9);
    panel.strokeRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, 18);

    const label = this.add
      .text(x, y, "운명의 문 열기", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        color: "#fff6d6",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const hitArea = this.add.zone(x, y, buttonWidth, buttonHeight).setInteractive({ useHandCursor: true });

    hitArea.on("pointerover", () => {
      this.tweens.add({ targets: [panel, label], scale: 1.03, duration: 140, ease: "Sine.easeOut" });
    });

    hitArea.on("pointerout", () => {
      this.tweens.add({ targets: [panel, label], scale: 1, duration: 140, ease: "Sine.easeOut" });
    });

    hitArea.on("pointerdown", () => {
      label.setText("질문의 방으로...");
      this.cameras.main.fadeOut(420, 9, 7, 26);
      this.time.delayedCall(440, () => {
        this.scene.start("QuestionScene");
      });
    });

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 96, "Phase 2: 질문 입력 흐름", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#8f7cc8",
      })
      .setOrigin(0.5);
  }
}
