import Phaser from "phaser";
import cardBackImageUrl from "../../../images/back.png?url";

export const CARD_BACK_IMAGE_KEY = "tarot-card-back";
export const INTRO_TITLE_IMAGE_KEY = "intro-title-image";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    this.load.image(CARD_BACK_IMAGE_KEY, cardBackImageUrl);
    this.load.image(INTRO_TITLE_IMAGE_KEY, "/img/title.png");
  }

  create(): void {
    this.scene.start("IntroScene");
  }
}
