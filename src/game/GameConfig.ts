import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { IntroScene } from "./scenes/IntroScene";
import { CardGalleryScene } from "./scenes/CardGalleryScene";
import { QuestionScene } from "./scenes/QuestionScene";
import { CardShuffleScene } from "./scenes/CardShuffleScene";
import { CardSelectScene } from "./scenes/CardSelectScene";
import { ReadingScene } from "./scenes/ReadingScene";
import { SummaryScene } from "./scenes/SummaryScene";
import { ChatScene } from "./scenes/ChatScene";

export const BASE_GAME_WIDTH = 390;
export const BASE_GAME_HEIGHT = 844;

export const GAME_WIDTH = 1080;
export const DESIGN_GAME_HEIGHT = 1920;
const MIN_GAME_HEIGHT = 1920;
const MAX_GAME_HEIGHT = 2520;

function getViewportAspectHeight(): number {
  if (typeof window === "undefined") return DESIGN_GAME_HEIGHT;

  const viewport = window.visualViewport;
  const viewportWidth = viewport?.width || window.innerWidth || BASE_GAME_WIDTH;
  const viewportHeight = viewport?.height || window.innerHeight || BASE_GAME_HEIGHT;

  if (viewportWidth <= 0 || viewportHeight <= 0) return DESIGN_GAME_HEIGHT;

  const fittedHeight = Math.ceil(GAME_WIDTH * (viewportHeight / viewportWidth));
  return Phaser.Math.Clamp(fittedHeight, MIN_GAME_HEIGHT, MAX_GAME_HEIGHT);
}

export const GAME_HEIGHT = getViewportAspectHeight();

export const UI_SCALE_X = GAME_WIDTH / BASE_GAME_WIDTH;
export const UI_SCALE_Y = DESIGN_GAME_HEIGHT / BASE_GAME_HEIGHT;
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
    mode: Phaser.Scale.ENVELOP,
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
  scene: [BootScene, IntroScene, CardGalleryScene, QuestionScene, CardShuffleScene, CardSelectScene, ReadingScene, SummaryScene, ChatScene],
};