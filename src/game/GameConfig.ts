import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { IntroScene } from "./scenes/IntroScene";
import { QuestionScene } from "./scenes/QuestionScene";
import { CardSelectScene } from "./scenes/CardSelectScene";
import { ReadingScene } from "./scenes/ReadingScene";
import { ChatScene } from "./scenes/ChatScene";

export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

const devicePixelRatio = window.devicePixelRatio || 1;
const renderResolution = Math.min(Math.max(devicePixelRatio, 1.5), 2);

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-root",
  backgroundColor: "#09071a",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  resolution: renderResolution,
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
  scene: [BootScene, IntroScene, QuestionScene, CardSelectScene, ReadingScene, ChatScene],
};
