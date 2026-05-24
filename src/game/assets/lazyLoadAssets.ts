import Phaser from "phaser";
import { allTarotCards } from "../../tarot/cards";
import type { TarotCard } from "../../tarot/types";
import { allVfxAssets } from "../vfx/vfxLibrary";

type ImageAsset = {
  key: string;
  url: string;
};

let activeLoadPromise: Promise<void> | undefined;

function uniqueMissingAssets(scene: Phaser.Scene, assets: ImageAsset[]): ImageAsset[] {
  const seen = new Set<string>();

  return assets.filter((asset) => {
    if (!asset.key || !asset.url) return false;
    if (seen.has(asset.key)) return false;
    seen.add(asset.key);
    return !scene.textures.exists(asset.key);
  });
}

function waitForActiveLoad(): Promise<void> {
  return activeLoadPromise ?? Promise.resolve();
}

async function loadImages(scene: Phaser.Scene, assets: ImageAsset[]): Promise<void> {
  await waitForActiveLoad();

  const missingAssets = uniqueMissingAssets(scene, assets);
  if (missingAssets.length === 0) return;

  activeLoadPromise = new Promise<void>((resolve) => {
    const loader = scene.load;

    loader.once(Phaser.Loader.Events.COMPLETE, () => {
      activeLoadPromise = undefined;
      resolve();
    });

    missingAssets.forEach((asset) => loader.image(asset.key, asset.url));
    loader.start();
  });

  await activeLoadPromise;
}

export function warmUpTarotCardImages(scene: Phaser.Scene): void {
  void loadImages(
    scene,
    allTarotCards.map((card) => ({ key: card.imageKey, url: card.imageUrl })),
  );
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
