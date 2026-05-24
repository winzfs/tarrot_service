import Phaser from "phaser";
import { CardSelectScene } from "../scenes/CardSelectScene";

type ReadingDraftLike = Record<string, unknown> & { __fromShuffleScene?: boolean };
type SceneStartLike = (key: string, data?: object) => Phaser.Scenes.ScenePlugin;

type PatchedScenePlugin = Phaser.Scenes.ScenePlugin & {
  __sealShuffleFlowBridgeApplied?: boolean;
};

type PatchedCardSelectScene = CardSelectScene & {
  draft?: ReadingDraftLike;
  createCardSelectionStage: () => void;
  playShuffleIntro: (onComplete: () => void) => void;
  __sealShuffleCardSelectBridgeApplied?: boolean;
};

const scenePluginPrototype = Phaser.Scenes.ScenePlugin.prototype as PatchedScenePlugin;

if (!scenePluginPrototype.__sealShuffleFlowBridgeApplied) {
  const originalStart = scenePluginPrototype.start as SceneStartLike;

  scenePluginPrototype.start = function bridgedSceneStart(
    this: Phaser.Scenes.ScenePlugin,
    key: string,
    data?: object,
  ): Phaser.Scenes.ScenePlugin {
    const draft = data as ReadingDraftLike | undefined;

    if (key === "CardSelectScene" && !draft?.__fromShuffleScene) {
      return originalStart.call(this, "CardShuffleScene", data);
    }

    if (key === "CardSelectScene" && draft?.__fromShuffleScene) {
      const cleanDraft = { ...draft };
      delete cleanDraft.__fromShuffleScene;
      return originalStart.call(this, key, cleanDraft);
    }

    return originalStart.call(this, key, data);
  };

  scenePluginPrototype.__sealShuffleFlowBridgeApplied = true;
}

const cardSelectPrototype = CardSelectScene.prototype as unknown as PatchedCardSelectScene;

if (!cardSelectPrototype.__sealShuffleCardSelectBridgeApplied) {
  const originalCreate = cardSelectPrototype.create;

  cardSelectPrototype.create = function bridgedCardSelectCreate(this: PatchedCardSelectScene) {
    if (this.draft?.__fromShuffleScene && typeof this.createCardSelectionStage === "function") {
      this.createCardSelectionStage();
      return;
    }

    originalCreate.call(this);
  };

  cardSelectPrototype.__sealShuffleCardSelectBridgeApplied = true;
}
