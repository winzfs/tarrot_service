import Phaser from "phaser";
import { allTarotCards } from "../../tarot/cards";
import { allVfxAssets } from "../vfx/vfxLibrary";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    for (const card of allTarotCards) {
      this.load.image(card.imageKey, card.imageUrl);
    }

    for (const asset of allVfxAssets) {
      this.load.image(asset.key, asset.url);
    }
  }

  create(): void {
    this.scene.start("IntroScene");
  }
}
