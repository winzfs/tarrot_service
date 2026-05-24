import Phaser from "phaser";
import { CardSelectScene } from "../scenes/CardSelectScene";

type ReadingDraftLike = Record<string, unknown> & { __fromShuffleScene?: boolean };
type SceneStartLike = (key: string, data?: object) => Phaser.Scenes.ScenePlugin;

type ScenePluginWithSealRouting = Phaser.Scenes.ScenePlugin & {
  __sealShuffleQuestionOnlyRoutingApplied?: boolean;
};

type CardSelectWithShuffleEntry = CardSelectScene & {
  draft?: ReadingDraftLike;
  createCardSelectionStage: () => void;
  __sealShuffleCardSelectSkipApplied?: boolean;
};

function getOwnerSceneKey(scenePlugin: Phaser.Scenes.ScenePlugin): string | undefined {
  const owner = scenePlugin as unknown as { scene?: { sys?: { settings?: { key?: string } } } };
  return owner.scene?.sys?.settings?.key;
}

const scenePluginPrototype = Phaser.Scenes.ScenePlugin.prototype as ScenePluginWithSealRouting;

if (!scenePluginPrototype.__sealShuffleQuestionOnlyRoutingApplied) {
  const originalStart = scenePluginPrototype.start as SceneStartLike;

  scenePluginPrototype.start = function routeQuestionSealToShuffle(
    this: Phaser.Scenes.ScenePlugin,
    key: string,
    data?: object,
  ): Phaser.Scenes.ScenePlugin {
    if (getOwnerSceneKey(this) === "QuestionScene" && key === "CardSelectScene") {
      return originalStart.call(this, "CardShuffleScene", data);
    }

    return originalStart.call(this, key, data);
  };

  scenePluginPrototype.__sealShuffleQuestionOnlyRoutingApplied = true;
}

const cardSelectPrototype = CardSelectScene.prototype as unknown as CardSelectWithShuffleEntry;

if (!cardSelectPrototype.__sealShuffleCardSelectSkipApplied) {
  const originalCreate = cardSelectPrototype.create;

  cardSelectPrototype.create = function createCardSelectionAfterShuffle(this: CardSelectWithShuffleEntry): void {
    if (this.draft?.__fromShuffleScene && typeof this.createCardSelectionStage === "function") {
      delete this.draft.__fromShuffleScene;
      this.createCardSelectionStage();
      return;
    }

    originalCreate.call(this);
  };

  cardSelectPrototype.__sealShuffleCardSelectSkipApplied = true;
}
