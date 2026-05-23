import Phaser from "phaser";
import "./styles.css";
import "./card-name-layout.css";
import { gameConfig } from "./game/GameConfig";

window.addEventListener("load", () => {
  new Phaser.Game(gameConfig);
});
