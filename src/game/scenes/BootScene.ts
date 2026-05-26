import Phaser from "phaser";
import cardBackImageUrl from "../../../images/back.png?url";
import { allVfxAssets } from "../vfx/vfxLibrary";

export const CARD_BACK_IMAGE_KEY = "tarot-card-back";
export const INTRO_TITLE_IMAGE_KEY = "intro-title-image";
export const BGM_MAIN_URL = "/sound/bgm1.m4a";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    this.load.image(CARD_BACK_IMAGE_KEY, cardBackImageUrl);
    this.load.image(INTRO_TITLE_IMAGE_KEY, "/img/title.png");
    allVfxAssets.forEach((asset) => {
      if (!this.textures.exists(asset.key)) {
        this.load.image(asset.key, asset.url);
      }
    });
  }

  create(): void {
    this.scene.start("IntroScene");
  }
}
