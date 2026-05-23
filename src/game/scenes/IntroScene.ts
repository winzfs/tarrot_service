import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";

export class IntroScene extends Phaser.Scene {
  private isStarting = false;

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

  private createArcaneCircle(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = sy(330);
    const r1 = ss(120);
    const r2 = ss(158);
    const r3 = ss(192);

    const glow = this.add.circle(centerX, centerY, ss(210), 0x6d4aff, 0.11);
    this.tweens.add({
      targets: glow,
      scale: 1.13,
      alpha: 0.2,
      duration: 2800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const circle = this.add.graphics();
    circle.lineStyle(ss(3), 0xf6d365, 0.85);
    circle.strokeCircle(centerX, centerY, r2);
    circle.lineStyle(ss(2), 0xb58cff, 0.55);
    circle.strokeCircle(centerX, centerY, r1);
    circle.strokeCircle(centerX, centerY, r3);

    for (let i = 0; i < 12; i += 1) {
      const angle = Phaser.Math.DegToRad(i * 30);
      const innerX = centerX + Math.cos(angle) * r1;
      const innerY = centerY + Math.sin(angle) * r1;
      const outerX = centerX + Math.cos(angle) * r3;
      const outerY = centerY + Math.sin(angle) * r3;
      circle.lineBetween(innerX, innerY, outerX, outerY);
    }

    const gem = this.add.polygon(
      centerX,
      centerY,
      [0, -ss(82), ss(58), 0, 0, ss(82), -ss(58), 0],
      0x1b1238,
      0.82,
    );
    gem.setStrokeStyle(ss(3), 0xf6d365, 0.9);

    this.tweens.add({
      targets: [circle, gem],
      angle: 360,
      duration: 46000,
      repeat: -1,
      ease: "Linear",
    });
  }

  private createTitle(): void {
    this.add
      .text(GAME_WIDTH / 2, sy(118), "ARCANA\nGATE", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${ss(62)}px`,
        color: "#f8f0ff",
        align: "center",
        stroke: "#2c174f",
        strokeThickness: ss(7),
        letterSpacing: ss(5),
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, sy(220), "운명의 문을 여는 작은 타로 의식", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(19)}px`,
        color: "#d9c8ff",
        align: "center",
      })
      .setOrigin(0.5);
  }

  private createStartButton(): void {
    const buttonWidth = sx(288);
    const buttonHeight = sy(72);
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT - sy(170);

    const panel = this.add.graphics();
    panel.fillStyle(0x1b1238, 0.92);
    panel.fillRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, ss(22));
    panel.lineStyle(ss(3), 0xf6d365, 0.9);
    panel.strokeRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, ss(22));

    const label = this.add
      .text(x, y, "운명의 문 열기", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(22)}px`,
        color: "#fff6d6",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const hitArea = this.add.zone(x, y, buttonWidth + sx(40), buttonHeight + sy(30)).setInteractive({ useHandCursor: true });
    hitArea.on("pointerdown", () => {
      if (this.isStarting) return;
      this.isStarting = true;
      hitArea.disableInteractive();
      label.setText("질문의 방으로...");
      this.cameras.main.fadeOut(520, 9, 7, 26);
      this.time.delayedCall(540, () => this.scene.start("QuestionScene"));
    });

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - sy(92), "질문을 품고 카드를 여세요", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(14)}px`,
        color: "#8f7cc8",
      })
      .setOrigin(0.5);
  }
}
