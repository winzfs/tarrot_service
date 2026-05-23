import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { IntroScene } from "./scenes/IntroScene";
import { QuestionScene } from "./scenes/QuestionScene";
import { CardSelectScene } from "./scenes/CardSelectScene";
import { ReadingScene } from "./scenes/ReadingScene";
import { ChatScene } from "./scenes/ChatScene";
import { VfxGalleryScene } from "./scenes/VfxGalleryScene";

export const BASE_GAME_WIDTH = 390;
export const BASE_GAME_HEIGHT = 844;

export const GAME_WIDTH = 1080;
export const GAME_HEIGHT = 1920;

export const UI_SCALE_X = GAME_WIDTH / BASE_GAME_WIDTH;
export const UI_SCALE_Y = GAME_HEIGHT / BASE_GAME_HEIGHT;
export const UI_SCALE = Math.min(UI_SCALE_X, UI_SCALE_Y);

export function sx(value: number): number {
  return Math.round(value * UI_SCALE_X);
}

export function sy(value: number): number {
  return Math.round(value * UI_SCALE_Y);
}

export function ss(value: number): number {
  return Math.round(value * UI_SCALE);
}

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-root",
  backgroundColor: "#09071a",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  resolution: 1,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  dom: {
    createContainer: true,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
  },
  scene: [BootScene, IntroScene, QuestionScene, CardSelectScene, ReadingScene, ChatScene, VfxGalleryScene],
};
