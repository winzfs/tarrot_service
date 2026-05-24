import Phaser from "phaser";

export function drawRoundedPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 18,
): Phaser.GameObjects.Graphics {
  const panel = scene.add.graphics();
  panel.fillStyle(0x140d2f, 0.88);
  panel.fillRoundedRect(x, y, width, height, radius);
  panel.lineStyle(2, 0xf6d365, 0.74);
  panel.strokeRoundedRect(x, y, width, height, radius);
  panel.lineStyle(1, 0xb58cff, 0.34);
  panel.strokeRoundedRect(x + 5, y + 5, width - 10, height - 10, Math.max(radius - 4, 4));
  return panel;
}

export function drawMysticBackground(scene: Phaser.Scene, width: number, height: number): void {
  const bg = scene.add.graphics();
  bg.fillGradientStyle(0x21104f, 0x160b36, 0x09071a, 0x03020a, 1);
  bg.fillRect(0, 0, width, height);

  const edgePadding = 30;

  for (let i = 0; i < 56; i += 1) {
    const star = scene.add.circle(
      Phaser.Math.Between(edgePadding, width - edgePadding),
      Phaser.Math.Between(edgePadding, height - edgePadding),
      Phaser.Math.FloatBetween(0.45, 1.15),
      0xf8f0ff,
      Phaser.Math.FloatBetween(0.1, 0.42),
    );

    scene.tweens.add({
      targets: star,
      alpha: Phaser.Math.FloatBetween(0.04, 0.18),
      duration: Phaser.Math.Between(1400, 3400),
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }
}
