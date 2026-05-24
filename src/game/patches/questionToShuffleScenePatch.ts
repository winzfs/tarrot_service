import { QuestionScene } from "../scenes/QuestionScene";

type SceneStartLike = (key: string, data?: object) => unknown;

type PatchedQuestionScene = QuestionScene & {
  __questionToShuffleInstancePatchApplied?: boolean;
};

const prototype = QuestionScene.prototype as unknown as PatchedQuestionScene & {
  create: (...args: unknown[]) => unknown;
};

if (!prototype.__questionToShuffleInstancePatchApplied && typeof prototype.create === "function") {
  const originalCreate = prototype.create;

  prototype.create = function patchedQuestionCreate(this: QuestionScene, ...args: unknown[]) {
    const result = originalCreate.apply(this, args);
    const scenePlugin = this.scene as unknown as { start: SceneStartLike; __shuffleRouteApplied?: boolean };

    if (!scenePlugin.__shuffleRouteApplied) {
      const originalStart = scenePlugin.start.bind(this.scene) as SceneStartLike;
      scenePlugin.start = (key: string, data?: object) => originalStart(key === "CardSelectScene" ? "CardShuffleScene" : key, data);
      scenePlugin.__shuffleRouteApplied = true;
    }

    return result;
  };

  prototype.__questionToShuffleInstancePatchApplied = true;
}
