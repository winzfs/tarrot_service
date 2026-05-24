import Phaser from "phaser";
import "./styles.css";
import "./card-name-layout.css";
import "./fusion-five-layout.css";
import "./reading-layout-adjustments.css";
import "./summary-scene.css";
import "./reversed-card.css";
import "./mobile-viewport-fix.css";
import "./game/patches/summaryImageExportPatch";
import "./game/patches/cardSelectCameraFadePatch";
import { gameConfig } from "./game/GameConfig";

window.addEventListener("load", () => {
  new Phaser.Game(gameConfig);
});