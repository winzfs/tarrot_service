import { CardSelectScene } from "../scenes/CardSelectScene";

type PatchedCardSelectScene = CardSelectScene & {
  create: (...args: unknown[]) => unknown;
  createCardSelectionStage: (...args: unknown[]) => unknown;
  __cardSelectProgressionPatchApplied?: boolean;
};

const prototype = CardSelectScene.prototype as unknown as PatchedCardSelectScene;

if (!prototype.__cardSelectProgressionPatchApplied && typeof prototype.createCardSelectionStage === "function") {
  prototype.create = function patchedCreate(this: CardSelectScene) {
    this.cameras.main.resetFX();
    this.cameras.main.fadeIn(260, 9, 7, 26);
    return (this as unknown as PatchedCardSelectScene).createCardSelectionStage();
  };

  prototype.__cardSelectProgressionPatchApplied = true;
}
