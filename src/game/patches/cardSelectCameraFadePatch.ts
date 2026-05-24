import { CardSelectScene } from "../scenes/CardSelectScene";

type PatchedCardSelectScene = CardSelectScene & {
  createCardSelectionStage: (...args: unknown[]) => unknown;
  __cardSelectCameraFadePatchApplied?: boolean;
};

const prototype = CardSelectScene.prototype as unknown as PatchedCardSelectScene;

if (!prototype.__cardSelectCameraFadePatchApplied && typeof prototype.createCardSelectionStage === "function") {
  const originalCreateCardSelectionStage = prototype.createCardSelectionStage;

  prototype.createCardSelectionStage = function patchedCreateCardSelectionStage(this: CardSelectScene, ...args: unknown[]) {
    const result = originalCreateCardSelectionStage.apply(this, args);
    this.cameras.main.fadeIn(260, 9, 7, 26);
    return result;
  };

  prototype.__cardSelectCameraFadePatchApplied = true;
}
