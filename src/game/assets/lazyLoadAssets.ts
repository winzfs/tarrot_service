import Phaser from "phaser";
import type { TarotCard } from "../../tarot/types";
import { allVfxAssets } from "../vfx/vfxLibrary";

type ImageAsset = {
  key: string;
  url: string;
};

function uniqueMissingAssets(scene: Phaser.Scene, assets: ImageAsset[]): ImageAsset[] {
  const seen = new Set<string>();

  return assets.filter((asset) => {
    if (!asset.key || !asset.url) return false;
    if (seen.has(asset.key)) return false;
    seen.add(asset.key);
    return !scene.textures.exists(asset.key);
  });
}

function loadImages(scene: Phaser.Scene, assets: ImageAsset[]): Promise<void> {
  const missingAssets = uniqueMissingAssets(scene, assets);
  if (missingAssets.length === 0) return Promise.resolve();

  return new Promise<void>((resolve) => {
    let remaining = missingAssets.length;

    const markDone = () => {
      remaining -= 1;
      if (remaining <= 0) resolve();
    };

    missingAssets.forEach((asset) => {
      scene.load.once(`filecomplete-image-${asset.key}`, markDone);
      scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, markDone);
      scene.load.image(asset.key, asset.url);
    });

    if (!scene.load.isLoading()) scene.load.start();
  });
}

export function warmUpTarotCardImages(_scene: Phaser.Scene): void {
  // Tarot card fronts are loaded only for the cards that were actually drawn.
}

export function warmUpVfxAssets(scene: Phaser.Scene): void {
  void loadImages(
    scene,
    allVfxAssets.map((asset) => ({ key: asset.key, url: asset.url })),
  );
}

export function ensureTarotCardImagesLoaded(scene: Phaser.Scene, cards: TarotCard[]): Promise<void> {
  return loadImages(
    scene,
    cards.map((card) => ({ key: card.imageKey, url: card.imageUrl })),
  );
}

export function ensureVfxAssetsLoaded(scene: Phaser.Scene): Promise<void> {
  return loadImages(
    scene,
    allVfxAssets.map((asset) => ({ key: asset.key, url: asset.url })),
  );
}
