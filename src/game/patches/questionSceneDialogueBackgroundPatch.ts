import Phaser from "phaser";
import { dialogueBackgroundTextureKey, dialogueBackgroundUrlCandidates, loadDialogueBackgroundSettings } from "../../admin/dialogueBackgroundSettings";
import { GAME_HEIGHT, GAME_WIDTH } from "../GameConfig";
import { QuestionScene } from "../scenes/QuestionScene";

let installed = false;
let resolvedUrl: string | undefined;

function addStatusBadge(scene: Phaser.Scene, message: string): void {
  const badge = scene.add.text(8, GAME_HEIGHT - 22, message, {
    fontFamily: "monospace",
    fontSize: "10px",
    color: "#ffd8e2",
    backgroundColor: "rgba(42,7,24,0.74)",
    padding: { x: 4, y: 2 },
  });
  badge.setDepth(9999).setAlpha(0.92);
  scene.time.delayedCall(2600, () => badge.destroy());
}

function currentTextureKey(): string | undefined {
  const settings = loadDialogueBackgroundSettings();
  const url = resolvedUrl ?? settings.imageUrl;
  return url ? dialogueBackgroundTextureKey(url) : undefined;
}

function applyDialogueBackground(scene: Phaser.Scene): void {
  const settings = loadDialogueBackgroundSettings();
  if (!settings.enabled || !settings.imageUrl) return;

  const textureKey = currentTextureKey();
  if (!textureKey || !scene.textures.exists(textureKey)) {
    addStatusBadge(scene, "admin bg: image not loaded");
    return;
  }

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
  addStatusBadge(scene, `admin bg: ${resolvedUrl ?? settings.imageUrl}`);
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
    resolvedUrl = undefined;
    if (!settings.enabled || !settings.imageUrl) return;

    const candidates = dialogueBackgroundUrlCandidates(settings.imageUrl);
    candidates.forEach((url) => {
      const textureKey = dialogueBackgroundTextureKey(url);
      if (!this.textures.exists(textureKey)) this.load.image(textureKey, url);
    });
    resolvedUrl = candidates[0];
  };

  proto.create = function patchedQuestionSceneCreate(this: QuestionScene): void {
    if (originalCreate) originalCreate.call(this);
    const settings = loadDialogueBackgroundSettings();
    const candidates = dialogueBackgroundUrlCandidates(settings.imageUrl);
    const loadedUrl = candidates.find((url) => this.textures.exists(dialogueBackgroundTextureKey(url)));
    resolvedUrl = loadedUrl ?? candidates[0];
    applyDialogueBackground(this);
  };
}
