import Phaser from "phaser";
import "./styles.css";
import "./card-name-layout.css";
import "./fusion-five-layout.css";
import "./mobile-viewport-fix.css";
import { gameConfig } from "./game/GameConfig";

window.addEventListener("load", () => {
  new Phaser.Game(gameConfig);
});
