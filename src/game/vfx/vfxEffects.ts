import Phaser from "phaser";
import { ss } from "../GameConfig";
import { hasLoadedVfx, vfx, type VfxAsset } from "./vfxLibrary";

type VfxObject = Phaser.GameObjects.Image | Phaser.GameObjects.Graphics | Phaser.GameObjects.Arc | Phaser.GameObjects.Text;

type AddImageOptions = {
  alpha?: number;
  scale?: number;
  depth?: number;
  rotation?: number;
  tint?: number;
  blend?: boolean;
};

function textureReady(scene: Phaser.Scene, asset?: VfxAsset): asset is VfxAsset {
  return Boolean(asset && hasLoadedVfx() && scene.textures.exists(asset.key));
}

export function addVfxImage(
  scene: Phaser.Scene,
  asset: VfxAsset | undefined,
  x: number,
  y: number,
  options: AddImageOptions = {},
): Phaser.GameObjects.Image | undefined {
  if (!textureReady(scene, asset)) return undefined;

  const image = scene.add.image(x, y, asset.key).setOrigin(0.5);
  image.setAlpha(options.alpha ?? 1);
  image.setScale(options.scale ?? 1);
  image.setDepth(options.depth ?? 0);
  image.setRotation(options.rotation ?? 0);

  if (options.tint !== undefined) image.setTint(options.tint);
  if (options.blend ?? true) image.setBlendMode(Phaser.BlendModes.ADD);

  return image;
}

export function addSoftGlow(scene: Phaser.Scene, x: number, y: number, depth: number, scale = 1): VfxObject {
  const glow = addVfxImage(scene, vfx.glow(), x, y, { alpha: 0, scale, depth, blend: true });
  if (glow) return glow;
  return scene.add.circle(x, y, ss(64) * scale, 0x6d4aff, 0).setDepth(depth);
}

export function addRuneRing(scene: Phaser.Scene, x: number, y: number, depth: number, scale = 1): VfxObject {
  const ring = addVfxImage(scene, vfx.ring(), x, y, { alpha: 0, scale, depth, blend: true });
  if (ring) return ring;
  return scene.add.circle(x, y, ss(54) * scale, 0xf6d365, 0).setDepth(depth).setStrokeStyle(ss(3), 0xf6d365, 0.85);
}

export function addSigil(scene: Phaser.Scene, x: number, y: number, depth: number, scale = 1): VfxObject {
  const sigil = addVfxImage(scene, vfx.sigil(), x, y, { alpha: 0, scale, depth, blend: true });
  if (sigil) return sigil;
  return scene.add
    .text(x, y, "✦", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${ss(44 * scale)}px`,
      color: "#fff6d6",
      stroke: "#2c174f",
      strokeThickness: ss(4),
    })
    .setOrigin(0.5)
    .setDepth(depth)
    .setAlpha(0);
}

export function createMagicBeam(
  scene: Phaser.Scene,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  depth: number,
  tint = 0xf6d365,
): VfxObject {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const beamAsset = vfx.beam();

  if (textureReady(scene, beamAsset)) {
    return scene.add
      .image(fromX, fromY, beamAsset.key)
      .setOrigin(0, 0.5)
      .setRotation(angle)
      .setDisplaySize(distance, ss(38))
      .setAlpha(0)
      .setDepth(depth)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(tint);
  }

  const beam = scene.add.graphics().setDepth(depth).setAlpha(0);
  beam.lineStyle(ss(3), tint, 0.82);
  beam.lineBetween(fromX, fromY, toX, toY);
  return beam;
}

export function playBurst(scene: Phaser.Scene, x: number, y: number, depth: number, scale = 1): void {
  const burst = addVfxImage(scene, vfx.burst(), x, y, { alpha: 0, scale: 0.3 * scale, depth, blend: true });

  if (burst) {
    scene.tweens.add({
      targets: burst,
      alpha: 0.95,
      scale: 1.45 * scale,
      duration: 260,
      ease: "Cubic.easeOut",
      onComplete: () => {
        scene.tweens.add({
          targets: burst,
          alpha: 0,
          scale: 1.9 * scale,
          duration: 460,
          ease: "Sine.easeOut",
          onComplete: () => burst.destroy(),
        });
      },
    });
    return;
  }

  const fallback = scene.add.circle(x, y, ss(24) * scale, 0xffffff, 0.9).setDepth(depth);
  scene.tweens.add({ targets: fallback, alpha: 0, scale: 5.5, duration: 640, ease: "Cubic.easeOut", onComplete: () => fallback.destroy() });
}

export function playSmoke(scene: Phaser.Scene, x: number, y: number, depth: number, scale = 1): void {
  const smokeAssets = [vfx.smoke(), vfx.smokeAlt()].filter(Boolean) as VfxAsset[];
  if (smokeAssets.length === 0 || !textureReady(scene, smokeAssets[0])) return;

  smokeAssets.slice(0, 2).forEach((asset, index) => {
    const smoke = addVfxImage(scene, asset, x + (index === 0 ? -ss(14) : ss(16)), y, {
      alpha: 0,
      scale: (0.58 + index * 0.18) * scale,
      depth,
      rotation: index === 0 ? -0.22 : 0.28,
      blend: true,
    });
    if (!smoke) return;

    scene.tweens.add({
      targets: smoke,
      alpha: 0.32,
      scale: (0.98 + index * 0.2) * scale,
      x: smoke.x + (index === 0 ? -ss(28) : ss(32)),
      y: smoke.y - ss(18 + index * 8),
      angle: index === 0 ? -16 : 18,
      duration: 1150,
      ease: "Sine.easeInOut",
      onComplete: () => {
        scene.tweens.add({ targets: smoke, alpha: 0, duration: 520, ease: "Sine.easeOut", onComplete: () => smoke.destroy() });
      },
    });
  });
}

export function spawnTextureSparkles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  depth: number,
  count: number,
  radiusMin: number,
  radiusMax: number,
): boolean {
  const sparkleAsset = vfx.sparkle() ?? vfx.particle();
  const shardAsset = vfx.shard();

  if (!textureReady(scene, sparkleAsset)) return false;

  for (let i = 0; i < count; i += 1) {
    const asset = i % 4 === 0 && textureReady(scene, shardAsset) ? shardAsset : sparkleAsset;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.Between(radiusMin, radiusMax);
    const sparkle = addVfxImage(scene, asset, x, y, {
      alpha: Phaser.Math.FloatBetween(0.58, 0.96),
      scale: Phaser.Math.FloatBetween(0.08, 0.22),
      depth,
      rotation: Phaser.Math.FloatBetween(0, Math.PI * 2),
      blend: true,
    });

    if (!sparkle) continue;

    scene.tweens.add({
      targets: sparkle,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      alpha: 0,
      scale: sparkle.scaleX * Phaser.Math.FloatBetween(1.4, 2.2),
      angle: sparkle.angle + Phaser.Math.Between(-90, 180),
      delay: Phaser.Math.Between(0, 130),
      duration: Phaser.Math.Between(780, 1380),
      ease: "Cubic.easeOut",
      onComplete: () => sparkle.destroy(),
    });
  }

  return true;
}

export function fadeDestroy(scene: Phaser.Scene, targets: VfxObject | VfxObject[], delay = 0, duration = 500): void {
  scene.tweens.add({
    targets,
    alpha: 0,
    delay,
    duration,
    ease: "Sine.easeInOut",
    onComplete: () => {
      const list = Array.isArray(targets) ? targets : [targets];
      list.forEach((target) => target.destroy());
    },
  });
}
