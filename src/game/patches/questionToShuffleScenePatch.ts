import Phaser from "phaser";

type SceneStart = Phaser.Scenes.ScenePlugin["start"];

type PatchedScenePluginPrototype = Phaser.Scenes.ScenePlugin & {
  __questionToShuffleScenePatchApplied?: boolean;
};

const prototype = Phaser.Scenes.ScenePlugin.prototype as PatchedScenePluginPrototype;

function getCurrentSceneKey(plugin: Phaser.Scenes.ScenePlugin): string | undefined {
  const anyPlugin = plugin as unknown as {
    key?: string;
    scene?: {
      scene?: { key?: string };
      sys?: { settings?: { key?: string } };
    };
  };

  return anyPlugin.key ?? anyPlugin.scene?.scene?.key ?? anyPlugin.scene?.sys?.settings?.key;
}

if (!prototype.__questionToShuffleScenePatchApplied) {
  const originalStart = prototype.start as SceneStart;

  prototype.start = function patchedStart(
    this: Phaser.Scenes.ScenePlugin,
    key: string,
    data?: object,
  ): Phaser.Scenes.ScenePlugin {
    const currentSceneKey = getCurrentSceneKey(this);
    const shouldRouteToShuffle = key === "CardSelectScene" && currentSceneKey !== "CardShuffleScene";
    return originalStart.call(this, shouldRouteToShuffle ? "CardShuffleScene" : key, data);
  } as SceneStart;

  prototype.__questionToShuffleScenePatchApplied = true;
}
