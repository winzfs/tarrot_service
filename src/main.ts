import Phaser from "phaser";
import "./styles.css";
import { gameConfig } from "./game/GameConfig";

window.addEventListener("load", () => {
  new Phaser.Game(gameConfig);
});
