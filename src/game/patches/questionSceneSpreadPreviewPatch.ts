import Phaser from "phaser";
import { DESIGN_GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import { QuestionScene } from "../scenes/QuestionScene";

type DialogueChoice = { label: string; description?: string; primary?: boolean; action: () => void };
type ChoiceButton = { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; hit: Phaser.GameObjects.Zone };
type PatchedQuestionScene = Phaser.Scene & Record<string, unknown>;
type PreviewLayout = { width: number; height: number; positions: { x: number; y: number }[] };

const CARD_BACK_TEXTURE_KEY = "tarot-card-back";
const PREVIEW_OBJECTS_KEY = "__dialogueSpreadPreviewObjects";
const PREVIEW_TWEENS_KEY = "__dialogueSpreadPreviewTweens";
const RPG_SKIN_OBJECTS_KEY = "__safeRpgDialogueSkinObjects";

function getSpreadReason(firstLine: string): string {
  if (firstLine.includes("오늘") || firstLine.includes("한 장")) return "지금 가장 가까운 기운 하나만 조용히 비춰, 질문의 핵심을 짧고 선명하게 붙잡습니다.";
  if (firstLine.includes("상황") || firstLine.includes("조언")) return "현재 상황, 막힌 지점, 바로 취할 태도를 세 개의 문으로 차례차례 엽니다.";
  if (firstLine.includes("시간") || firstLine.includes("세 문")) return "지나온 흐름, 지금의 자리, 다가오는 가능성을 시간의 순서대로 읽어냅니다.";
  if (firstLine.includes("관계") || firstLine.includes("거울")) return "나와 상대의 마음, 서로를 비추는 감정, 관계가 향하는 다음 결을 깊게 들여다봅니다.";
  if (firstLine.includes("선택") || firstLine.includes("갈림길")) return "두 갈래 길이 품은 가능성과 선택 뒤에 따라올 조언을 나란히 비교합니다.";
  return "질문에 맞는 문이 조용히 열렸습니다.";
}

function getSpreadCount(firstLine: string): number {
  const match = firstLine.match(/(\d+)장/);
  return match ? Math.max(1, Math.min(5, Number(match[1]) || 3)) : 3;
}

function getPreviewLayout(count: number): PreviewLayout {
  const centerX = GAME_WIDTH / 2;
  if (count === 1) return { width: 248, height: 384, positions: [{ x: centerX, y: sy(360) }] };
  if (count === 5) {
    const width = 138;
    const height = 214;
    const gapX = 44;
    const gapY = 34;
    const topY = sy(280);
    const bottomY = topY + height + gapY;
    const topOffset = (width + gapX) / 2;
    const bottomOffset = width + gapX;
    return {
      width,
      height,
      positions: [
        { x: centerX - topOffset, y: topY },
        { x: centerX + topOffset, y: topY },
        { x: centerX - bottomOffset, y: bottomY },
        { x: centerX, y: bottomY },
        { x: centerX + bottomOffset, y: bottomY },
      ],
    };
  }

  const width = 198;
  const height = 306;
  const gap = 44;
  const totalWidth = count * width + (count - 1) * gap;
  const startX = centerX - totalWidth / 2 + width / 2;
  return {
    width,
    height,
    positions: Array.from({ length: count }, (_, index) => ({ x: startX + index * (width + gap), y: sy(365) })),
  };
}

function clearPreview(scene: Phaser.Scene): void {
  const target = scene as PatchedQuestionScene;
  const tweens = (target[PREVIEW_TWEENS_KEY] as Phaser.Tweens.Tween[] | undefined) ?? [];
  const objects = (target[PREVIEW_OBJECTS_KEY] as Phaser.GameObjects.GameObject[] | undefined) ?? [];
  tweens.forEach((tween) => tween.stop());
  objects.forEach((object) => object.destroy());
  target[PREVIEW_TWEENS_KEY] = [];
  target[PREVIEW_OBJECTS_KEY] = [];
}

function addPreview(scene: Phaser.Scene, count: number): void {
  clearPreview(scene);
  const objects: Phaser.GameObjects.GameObject[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];
  const layout = getPreviewLayout(count);

  layout.positions.forEach((position, index) => {
    const container = scene.add.container(position.x, position.y).setDepth(42);

    if (scene.textures.exists(CARD_BACK_TEXTURE_KEY)) {
      const card = scene.add.image(0, 0, CARD_BACK_TEXTURE_KEY).setDisplaySize(layout.width, layout.height);
      const lightOverlay = scene.add
        .image(0, 0, CARD_BACK_TEXTURE_KEY)
        .setDisplaySize(layout.width, layout.height)
        .setAlpha(0.04)
        .setTint(0xfff6d6)
        .setBlendMode(Phaser.BlendModes.ADD);
      container.add([card, lightOverlay]);
      tweens.push(scene.tweens.add({
        targets: lightOverlay,
        alpha: 0.28,
        duration: 1700 + index * 110,
        delay: index * 220,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      }));
    } else {
      const card = scene.add.rectangle(0, 0, layout.width, layout.height, 0x120b2b, 0.98).setStrokeStyle(2, 0xf6d365, 0.86);
      container.add(card);
    }

    const frame = scene.add.graphics();
    frame.lineStyle(3, 0xf6d365, 0.92);
    frame.strokeRect(-layout.width / 2 - 5, -layout.height / 2 - 5, layout.width + 10, layout.height + 10);
    frame.lineStyle(1, 0xb58cff, 0.55);
    frame.strokeRect(-layout.width / 2 + 4, -layout.height / 2 + 4, layout.width - 8, layout.height - 8);
    container.add(frame);

    tweens.push(scene.tweens.add({
      targets: container,
      y: position.y - sy(6),
      duration: 2100 + index * 130,
      delay: index * 150,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    }));
    objects.push(container);
  });

  const target = scene as PatchedQuestionScene;
  target[PREVIEW_OBJECTS_KEY] = objects;
  target[PREVIEW_TWEENS_KEY] = tweens;
}

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
  const panelY = DESIGN_GAME_HEIGHT - sy(376);
  buttons.forEach((button, index) => {
    const choice = choices[index];
    if (!choice) return;

    const compact = choices.length > 3;
    const left = compact ? sx(116) : sx(52);
    const width = compact ? GAME_WIDTH - sx(154) : GAME_WIDTH - sx(104);
    const height = compact ? sy(30) : sy(40);
    const spacing = compact ? sy(35) : sy(48);
    const y = panelY + (compact ? sy(136) : sy(190)) + index * spacing;
    const x = left + width / 2;

    button.bg.clear();
    button.bg.setDepth(56);
    button.bg.fillStyle(choice.primary ? 0x4b3315 : 0x100b18, choice.primary ? 0.9 : 0.62);
    button.bg.fillRoundedRect(left, y - height / 2, width, height, ss(6));
    button.bg.lineStyle(ss(2), choice.primary ? 0xf6d365 : 0x6a5134, choice.primary ? 0.95 : 0.72);
    button.bg.strokeRoundedRect(left, y - height / 2, width, height, ss(6));
    button.label.setPosition(left + sx(18), y).setOrigin(0, 0.5).setDepth(57);
    button.label.setStyle({
      fontFamily: "system-ui, sans-serif",
      fontSize: `${compact ? ss(12) : ss(14)}px`,
      color: choice.primary ? "#fff6d6" : "#f8f0ff",
      fontStyle: "bold",
      align: "left",
      wordWrap: { width: width - sx(36) },
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
    ensureRpgSkin(this);
    clearPreview(this);
    if (title === "의식 3/5 · 배열 제안" && lines.length > 0) {
      const firstLine = lines[0] ?? "";
      originalSetDialogue.call(this, `점술사 · ${title}`, [firstLine, getSpreadReason(firstLine)]);
      addPreview(this, getSpreadCount(firstLine));
    } else {
      originalSetDialogue.call(this, `점술사 · ${title}`, lines);
    }
    styleDialogue(this);
  };

  const originalSetChoices = prototype.setChoices as (choices: DialogueChoice[]) => void;
  prototype.setChoices = function patchedSetChoices(this: Phaser.Scene, choices: DialogueChoice[]): void {
    originalSetChoices.call(this, choices);
    ensureRpgSkin(this);
    styleChoices(this, choices);
  };
}
