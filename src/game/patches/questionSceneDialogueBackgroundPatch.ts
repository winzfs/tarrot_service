import Phaser from "phaser";
import { dialogueBackgroundTextureKey, loadDialogueBackgroundSettings } from "../../admin/dialogueBackgroundSettings";
import { GAME_HEIGHT, GAME_WIDTH } from "../GameConfig";
import { QuestionScene } from "../scenes/QuestionScene";

let installed = false;

function applyDialogueBackground(scene: Phaser.Scene): void {
  const settings = loadDialogueBackgroundSettings();
  if (!settings.enabled || !settings.imageUrl) return;

  const textureKey = dialogueBackgroundTextureKey(settings.imageUrl);
  if (!scene.textures.exists(textureKey)) return;

  const source = scene.textures.get(textureKey).getSourceImage() as { width: number; height: number };
  const sourceRatio = source.width / source.height || 1;
  const targetRatio = GAME_WIDTH / GAME_HEIGHT;
  const baseDisplayWidth = sourceRatio > targetRatio ? GAME_HEIGHT * sourceRatio : GAME_WIDTH;
  const baseDisplayHeight = sourceRatio > targetRatio ? GAME_HEIGHT : GAME_WIDTH / sourceRatio;

  const image = scene.add.image(
    GAME_WIDTH / 2 + (settings.offsetX / 100) * GAME_WIDTH,
    GAME_HEIGHT / 2 + (settings.offsetY / 100) * GAME_HEIGHT,
    textureKey,
  );
  image.setDisplaySize(baseDisplayWidth * settings.zoom, baseDisplayHeight * settings.zoom);
  image.setDepth(-16);

  const dim = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, settings.dim);
  dim.setDepth(-15);
}

export function installQuestionSceneDialogueBackgroundPatch(): void {
  if (installed) return;
  installed = true;

  const proto = QuestionScene.prototype as QuestionScene & {
    preload?: () => void;
    create?: () => void;
  };

  const originalPreload = proto.preload;
  const originalCreate = proto.create;

  proto.preload = function patchedQuestionScenePreload(this: QuestionScene): void {
    if (originalPreload) originalPreload.call(this);

    const settings = loadDialogueBackgroundSettings();
    if (!settings.enabled || !settings.imageUrl) return;

    const textureKey = dialogueBackgroundTextureKey(settings.imageUrl);
    if (!this.textures.exists(textureKey)) this.load.image(textureKey, settings.imageUrl);
  };

  proto.create = function patchedQuestionSceneCreate(this: QuestionScene): void {
    if (originalCreate) originalCreate.call(this);
    applyDialogueBackground(this);
  };
}
