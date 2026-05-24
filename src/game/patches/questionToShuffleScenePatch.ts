import Phaser from "phaser";

type SceneStart = Phaser.Scenes.ScenePlugin["start"];

type PatchedScenePluginPrototype = Phaser.Scenes.ScenePlugin & {
  __questionToShuffleScenePatchApplied?: boolean;
};

const prototype = Phaser.Scenes.ScenePlugin.prototype as PatchedScenePluginPrototype;

if (!prototype.__questionToShuffleScenePatchApplied) {
  const originalStart = prototype.start as SceneStart;

  prototype.start = function patchedStart(
    this: Phaser.Scenes.ScenePlugin,
    key: string,
    data?: object,
  ): Phaser.Scenes.ScenePlugin {
    const currentSceneKey = this.scene?.scene.key;
    const nextSceneKey = currentSceneKey === "QuestionScene" && key === "CardSelectScene" ? "CardShuffleScene" : key;
    return originalStart.call(this, nextSceneKey, data);
  } as SceneStart;

  prototype.__questionToShuffleScenePatchApplied = true;
}
