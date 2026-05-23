import Phaser from "phaser";
import { allTarotCards } from "../../tarot/cards";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    for (const card of allTarotCards) {
      this.load.image(card.imageKey, card.imageUrl);
    }
  }

  create(): void {
    this.scene.start("IntroScene");
  }
}
