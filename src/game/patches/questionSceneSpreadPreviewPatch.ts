import Phaser from "phaser";
import { DESIGN_GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import { QuestionScene } from "../scenes/QuestionScene";

type DialogueChoice = { label: string; description?: string; primary?: boolean; action: () => void };
type ChoiceButton = { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; hit: Phaser.GameObjects.Zone };
type PatchedQuestionScene = Phaser.Scene & Record<string, unknown>;

const RPG_SKIN_OBJECTS_KEY = "__safeRpgDialogueSkinObjects";

function ensureRpgSkin(scene: Phaser.Scene): void {
  const target = scene as PatchedQuestionScene;
  if (target[RPG_SKIN_OBJECTS_KEY]) return;

  const x = sx(18);
  const y = DESIGN_GAME_HEIGHT - sy(376);
  const width = GAME_WIDTH - sx(36);
  const height = sy(332);

  const panel = scene.add.graphics().setDepth(43);
  panel.fillStyle(0x07050d, 0.92).fillRoundedRect(x, y, width, height, ss(16));
  panel.fillStyle(0x1a1223, 0.84).fillRoundedRect(x + sx(8), y + sy(8), width - sx(16), height - sy(16), ss(12));
  panel.lineStyle(ss(4), 0x3b2a1f, 0.98).strokeRoundedRect(x, y, width, height, ss(16));
  panel.lineStyle(ss(2), 0xb58a48, 0.92).strokeRoundedRect(x + sx(6), y + sy(6), width - sx(12), height - sy(12), ss(12));

  const namePlate = scene.add.graphics().setDepth(48);
  namePlate.fillStyle(0x2a1b16, 0.98).fillRoundedRect(x + sx(54), y - sy(27), sx(178), sy(42), ss(12));
  namePlate.lineStyle(ss(2), 0xf6d365, 0.72).strokeRoundedRect(x + sx(59), y - sy(22), sx(168), sy(32), ss(9));
  const nameText = scene.add.text(x + sx(143), y - sy(6), "점술사", {
    fontFamily: "system-ui, sans-serif",
    fontSize: `${ss(15)}px`,
    color: "#f6d365",
    fontStyle: "bold",
  }).setOrigin(0.5).setDepth(49);

  const portrait = scene.add.graphics().setDepth(48);
  const px = x + sx(38);
  const py = y + sy(64);
  const size = sx(86);
  portrait.fillStyle(0x160f1f, 1).fillRoundedRect(px, py, size, size, ss(8));
  portrait.lineStyle(ss(3), 0x3b2a1f, 1).strokeRoundedRect(px, py, size, size, ss(8));
  portrait.lineStyle(ss(1), 0xf6d365, 0.66).strokeRoundedRect(px + sx(5), py + sy(5), size - sx(10), size - sy(10), ss(5));

  const sigil = scene.add.text(px + size / 2, py + size / 2, "✦", {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: `${ss(34)}px`,
    color: "#fff6d6",
  }).setOrigin(0.5).setDepth(49);

  target[RPG_SKIN_OBJECTS_KEY] = [panel, namePlate, nameText, portrait, sigil];
}

function styleDialogue(scene: Phaser.Scene): void {
  const target = scene as PatchedQuestionScene;
  const title = target.dialogueTitleText as Phaser.GameObjects.Text | undefined;
  const body = target.dialogueBodyText as Phaser.GameObjects.Text | undefined;
  title?.setPosition(sx(164), DESIGN_GAME_HEIGHT - sy(330)).setDepth(49).setStyle({
    fontFamily: "system-ui, sans-serif",
    fontSize: `${ss(12)}px`,
    color: "#cdbdff",
    fontStyle: "bold",
  });
  body?.setPosition(sx(164), DESIGN_GAME_HEIGHT - sy(298)).setDepth(49).setStyle({
    fontFamily: "system-ui, sans-serif",
    fontSize: `${ss(16)}px`,
    color: "#f8f0ff",
    lineSpacing: ss(8),
    wordWrap: { width: sx(204) },
  });
}

function styleChoices(scene: Phaser.Scene, choices: DialogueChoice[]): void {
  const buttons = (((scene as PatchedQuestionScene).choiceButtons as ChoiceButton[] | undefined) ?? []);
  buttons.forEach((button, index) => {
    const choice = choices[index];
    if (!choice) return;

    const compact = choices.length > 3;
    const spacing = compact ? sy(41) : sy(52);
    const y = DESIGN_GAME_HEIGHT - (compact ? sy(254) : sy(194)) + index * spacing;
    const width = GAME_WIDTH - sx(92);
    const height = compact ? sy(34) : sy(42);
    const x = GAME_WIDTH / 2;

    button.bg.clear();
    button.bg.setDepth(56);
    button.bg.fillStyle(choice.primary ? 0x4b3315 : 0x100b18, choice.primary ? 0.9 : 0.62);
    button.bg.fillRoundedRect(x - width / 2, y - height / 2, width, height, ss(6));
    button.bg.lineStyle(ss(2), choice.primary ? 0xf6d365 : 0x6a5134, choice.primary ? 0.95 : 0.78);
    button.bg.strokeRoundedRect(x - width / 2, y - height / 2, width, height, ss(6));
    button.label.setPosition(x - width / 2 + sx(44), y).setOrigin(0, 0.5).setDepth(57);
    button.label.setStyle({
      fontFamily: "system-ui, sans-serif",
      fontSize: `${compact ? ss(13) : ss(15)}px`,
      color: choice.primary ? "#fff6d6" : "#f8f0ff",
      fontStyle: "bold",
      align: "left",
      wordWrap: { width: width - sx(84) },
    });
    button.label.setText(`${choice.primary ? "➤" : `${index + 1}.`} ${choice.label}`);
    button.hit.setPosition(x, y).setSize(width, height).setDepth(90);
  });
}

export function installQuestionSceneSpreadPreviewPatch(): void {
  const prototype = QuestionScene.prototype as unknown as Record<string, unknown>;
  if (prototype.__spreadPreviewPatchInstalled) return;
  prototype.__spreadPreviewPatchInstalled = true;

  prototype.createFortuneTellerPanel = function disabledLegacyFortuneTellerPanel(): void {
    // Legacy top hint panel removed. RPG skin is applied without replacing base dialogue creation.
  };

  const originalSetDialogue = prototype.setDialogue as (title: string, lines: string[]) => void;
  prototype.setDialogue = function patchedSetDialogue(this: Phaser.Scene, title: string, lines: string[]): void {
    originalSetDialogue.call(this, `점술사 · ${title}`, lines);
    ensureRpgSkin(this);
    styleDialogue(this);
  };

  const originalSetChoices = prototype.setChoices as (choices: DialogueChoice[]) => void;
  prototype.setChoices = function patchedSetChoices(this: Phaser.Scene, choices: DialogueChoice[]): void {
    originalSetChoices.call(this, choices);
    ensureRpgSkin(this);
    styleChoices(this, choices);
  };
}
