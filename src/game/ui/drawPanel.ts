import Phaser from "phaser";
import { dialogueBackgroundTextureKey, loadDialogueBackgroundSettings } from "../../admin/dialogueBackgroundSettings";

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

function addConfiguredDialogueBackground(scene: Phaser.Scene, width: number, height: number): void {
  if (scene.scene.key !== "QuestionScene") return;
  const settings = loadDialogueBackgroundSettings();
  if (!settings.enabled || !settings.imageUrl) return;

  const textureKey = dialogueBackgroundTextureKey(settings.imageUrl);

  const addImage = (): void => {
    if (!scene.textures.exists(textureKey)) return;
    const source = scene.textures.get(textureKey).getSourceImage() as { width: number; height: number };
    const sourceRatio = source.width / source.height || 1;
    const targetRatio = width / height;
    const baseDisplayWidth = sourceRatio > targetRatio ? height * sourceRatio : width;
    const baseDisplayHeight = sourceRatio > targetRatio ? height : width / sourceRatio;
    const displayWidth = baseDisplayWidth * settings.zoom;
    const displayHeight = baseDisplayHeight * settings.zoom;
    const image = scene.add.image(
      width / 2 + (settings.offsetX / 100) * width,
      height / 2 + (settings.offsetY / 100) * height,
      textureKey,
    );
    image.setDisplaySize(displayWidth, displayHeight).setDepth(-19).setAlpha(1);

    const dim = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, settings.dim);
    dim.setDepth(-18);
  };

  if (scene.textures.exists(textureKey)) {
    addImage();
    return;
  }

  const image = new Image();
  image.crossOrigin = "anonymous";
  image.onload = () => {
    if (!scene.scene.isActive()) return;
    if (!scene.textures.exists(textureKey)) scene.textures.addImage(textureKey, image);
    addImage();
  };
  image.onerror = () => {
    // Keep the default mystic background if the configured file is missing.
  };
  image.src = settings.imageUrl;
}

export function drawMysticBackground(scene: Phaser.Scene, width: number, height: number): void {
  const bg = scene.add.graphics();
  bg.setDepth(-20);
  bg.fillGradientStyle(0x21104f, 0x160b36, 0x09071a, 0x03020a, 1);
  bg.fillRect(0, 0, width, height);

  addConfiguredDialogueBackground(scene, width, height);

  const edgePadding = 30;

  for (let i = 0; i < 56; i += 1) {
    const star = scene.add.circle(
      Phaser.Math.Between(edgePadding, width - edgePadding),
      Phaser.Math.Between(edgePadding, height - edgePadding),
      Phaser.Math.FloatBetween(0.45, 1.15),
      0xf8f0ff,
      Phaser.Math.FloatBetween(0.1, 0.42),
    );
    star.setDepth(-17);

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
