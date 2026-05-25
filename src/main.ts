import Phaser from "phaser";
import "./styles.css";
import "./card-name-layout.css";
import "./fusion-five-layout.css";
import "./reading-layout-adjustments.css";
import "./summary-scene.css";
import "./reversed-card.css";
import "./mobile-viewport-fix.css";
import "./game/patches/summaryImageExportPatch";
import { installQuestionSceneSpreadPreviewPatch } from "./game/patches/questionSceneSpreadPreviewPatch";
import { installCardSelectPositionLabelPatch } from "./game/patches/cardSelectPositionLabelPatch";
import { gameConfig } from "./game/GameConfig";

installQuestionSceneSpreadPreviewPatch();
installCardSelectPositionLabelPatch();

function mountFatalDebugBadge(message: string): void {
  if (typeof document === "undefined") return;
  const id = "arcana-fatal-debug-badge";
  const existing = document.getElementById(id);
  if (existing) existing.remove();

  const badge = document.createElement("div");
  badge.id = id;
  badge.textContent = `Runtime error: ${message}`;
  badge.style.position = "fixed";
  badge.style.left = "8px";
  badge.style.right = "8px";
  badge.style.bottom = "8px";
  badge.style.zIndex = "99999";
  badge.style.padding = "8px 10px";
  badge.style.border = "1px solid rgba(255,182,200,.7)";
  badge.style.borderRadius = "8px";
  badge.style.background = "rgba(42, 7, 24, .9)";
  badge.style.color = "#ffd8e2";
  badge.style.font = "12px/1.35 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  badge.style.pointerEvents = "none";
  document.body.appendChild(badge);
}

window.addEventListener("error", (event) => {
  mountFatalDebugBadge(event.message || "unknown error");
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason ?? "unknown rejection");
  mountFatalDebugBadge(message);
});

window.addEventListener("load", () => {
  new Phaser.Game(gameConfig);
});