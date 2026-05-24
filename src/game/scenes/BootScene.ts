import Phaser from "phaser";
import { allTarotCards } from "../../tarot/cards";
import { allVfxAssets } from "../vfx/vfxLibrary";
import cardBackImageUrl from "../../../images/back.png?url";

export const CARD_BACK_IMAGE_KEY = "tarot-card-back";
export const INTRO_TITLE_IMAGE_KEY = "intro-title-image";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    this.load.image(CARD_BACK_IMAGE_KEY, cardBackImageUrl);
    this.load.image(INTRO_TITLE_IMAGE_KEY, "/img/tltle.png");

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