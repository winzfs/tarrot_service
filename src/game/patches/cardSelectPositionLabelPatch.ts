import { CardSelectScene } from "../scenes/CardSelectScene";

export function installCardSelectPositionLabelPatch(): void {
  const prototype = CardSelectScene.prototype as unknown as Record<string, unknown>;
  if (prototype.__cardSelectPositionLabelPatchInstalled) return;
  prototype.__cardSelectPositionLabelPatchInstalled = true;

  prototype.shouldHidePositionLabel = function alwaysShowPositionLabel(): boolean {
    return false;
  };
}
