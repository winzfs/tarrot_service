import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import { QuestionScene } from "../scenes/QuestionScene";

const CARD_BACK_TEXTURE_KEY = "tarot-card-back";
const PREVIEW_OBJECTS_KEY = "__dialogueSpreadPreviewObjects";
const PREVIEW_TWEENS_KEY = "__dialogueSpreadPreviewTweens";
const DIALOGUE_SKIN_OBJECTS_KEY = "__npcDialogueSkinObjects";
const DIALOGUE_PANEL_GEOMETRY_KEY = "__npcDialoguePanelGeometry";

type PreviewPosition = { x: number; y: number };
type PreviewLayout = { width: number; height: number; positions: PreviewPosition[] };
type ChoiceView = { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; hit: Phaser.GameObjects.Zone };
type DialoguePanelGeometry = { x: number; y: number; width: number; height: number };
type PatchedQuestionScene = Phaser.Scene & Record<string, unknown>;

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
  if (!match) return 3;
  return Math.max(1, Math.min(5, Number(match[1]) || 3));
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

function drawRpgDialoguePanel(scene: Phaser.Scene, x: number, y: number, width: number, height: number): Phaser.GameObjects.Graphics {
  const panel = scene.add.graphics().setDepth(43);
  panel.fillStyle(0x07050d, 0.92);
  panel.fillRoundedRect(x, y, width, height, ss(16));
  panel.fillStyle(0x1a1223, 0.82);
  panel.fillRoundedRect(x + sx(8), y + sy(8), width - sx(16), height - sy(16), ss(12));
  panel.lineStyle(ss(4), 0x3b2a1f, 0.98);
  panel.strokeRoundedRect(x, y, width, height, ss(16));
  panel.lineStyle(ss(2), 0xb58a48, 0.92);
  panel.strokeRoundedRect(x + sx(6), y + sy(6), width - sx(12), height - sy(12), ss(12));
  panel.lineStyle(ss(1), 0xf6d365, 0.32);
  panel.strokeRoundedRect(x + sx(16), y + sy(16), width - sx(32), height - sy(32), ss(8));
  return panel;
}

function ensureNpcDialogueSkin(scene: Phaser.Scene): void {
  const target = scene as PatchedQuestionScene;
  if (target[DIALOGUE_SKIN_OBJECTS_KEY]) return;

  const x = sx(18);
  const height = sy(292);
  const y = Math.max(sy(1180), GAME_HEIGHT - height - sy(64));
  const width = GAME_WIDTH - sx(36);
  const panel = drawRpgDialoguePanel(scene, x, y, width, height);

  const namePlate = scene.add.graphics().setDepth(48);
  const nameX = x + sx(54);
  const nameY = y - sy(27);
  namePlate.fillStyle(0x2a1b16, 0.98);
  namePlate.fillRoundedRect(nameX, nameY, sx(178), sy(42), ss(12));
  namePlate.lineStyle(ss(3), 0x3b2a1f, 1);
  namePlate.strokeRoundedRect(nameX, nameY, sx(178), sy(42), ss(12));
  namePlate.lineStyle(ss(1), 0xf6d365, 0.78);
  namePlate.strokeRoundedRect(nameX + sx(5), nameY + sy(5), sx(168), sy(32), ss(9));

  const nameText = scene.add.text(nameX + sx(89), nameY + sy(21), "점술사", {
    fontFamily: "system-ui, sans-serif",
    fontSize: `${ss(15)}px`,
    color: "#f6d365",
    fontStyle: "bold",
  }).setOrigin(0.5).setDepth(49);

  const portraitX = x + sx(38);
  const portraitY = y + sy(64);
  const portraitSize = sx(86);
  const portraitBg = scene.add.graphics().setDepth(48);
  portraitBg.fillStyle(0x160f1f, 1);
  portraitBg.fillRoundedRect(portraitX, portraitY, portraitSize, portraitSize, ss(8));
  portraitBg.lineStyle(ss(3), 0x3b2a1f, 1);
  portraitBg.strokeRoundedRect(portraitX, portraitY, portraitSize, portraitSize, ss(8));
  portraitBg.lineStyle(ss(1), 0xf6d365, 0.66);
  portraitBg.strokeRoundedRect(portraitX + sx(5), portraitY + sy(5), portraitSize - sx(10), portraitSize - sy(10), ss(5));

  const sigil = scene.add.text(portraitX + portraitSize / 2, portraitY + portraitSize / 2, "✦", {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: `${ss(34)}px`,
    color: "#fff6d6",
  }).setOrigin(0.5).setDepth(49);

  const nextMark = scene.add.text(x + width - sx(34), y + height - sy(28), "▾", {
    fontFamily: "system-ui, sans-serif",
    fontSize: `${ss(18)}px`,
    color: "#f6d365",
    fontStyle: "bold",
  }).setOrigin(0.5).setDepth(49);
  scene.tweens.add({ targets: nextMark, y: y + height - sy(21), duration: 780, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

  const titleText = target.dialogueTitleText as Phaser.GameObjects.Text | undefined;
  const bodyText = target.dialogueBodyText as Phaser.GameObjects.Text | undefined;
  titleText?.setPosition(x + sx(146), y + sy(38)).setDepth(49).setStyle({
    fontFamily: "system-ui, sans-serif",
    fontSize: `${ss(12)}px`,
    color: "#cdbdff",
    fontStyle: "bold",
  });
  bodyText?.setPosition(x + sx(146), y + sy(70)).setDepth(49).setStyle({
    fontFamily: "system-ui, sans-serif",
    fontSize: `${ss(16)}px`,
    color: "#f8f0ff",
    lineSpacing: ss(8),
    wordWrap: { width: width - sx(190) },
  });

  target[DIALOGUE_PANEL_GEOMETRY_KEY] = { x, y, width, height } satisfies DialoguePanelGeometry;
  target[DIALOGUE_SKIN_OBJECTS_KEY] = [panel, namePlate, nameText, portraitBg, sigil, nextMark];
}

function getLayout(count: number): PreviewLayout {
  const centerX = GAME_WIDTH / 2;
  if (count === 1) return { width: 248, height: 384, positions: [{ x: centerX, y: sy(478) }] };
  if (count === 5) {
    const width = 138;
    const height = 214;
    const gapX = 44;
    const gapY = 34;
    const topY = sy(418);
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
  return { width, height, positions: Array.from({ length: count }, (_, index) => ({ x: startX + index * (width + gap), y: sy(486) })) };
}

function addStaticFrame(container: Phaser.GameObjects.Container, scene: Phaser.Scene, width: number, height: number): void {
  const frame = scene.add.graphics();
  frame.lineStyle(3, 0xf6d365, 0.92);
  frame.strokeRect(-width / 2 - 5, -height / 2 - 5, width + 10, height + 10);
  frame.lineStyle(1, 0xb58cff, 0.55);
  frame.strokeRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8);
  container.add(frame);
}

function addFallbackCard(container: Phaser.GameObjects.Container, scene: Phaser.Scene, width: number, height: number): void {
  const card = scene.add.graphics();
  card.fillStyle(0x120b2b, 0.98);
  card.fillRect(-width / 2, -height / 2, width, height);
  card.lineStyle(2, 0xf6d365, 0.86);
  card.strokeRect(-width / 2, -height / 2, width, height);
  card.lineStyle(1, 0x6d4aff, 0.72);
  card.strokeRect(-width / 2 + 8, -height / 2 + 8, width - 16, height - 16);
  container.add(card);
}

function addPreviewCard(scene: Phaser.Scene, position: PreviewPosition, width: number, height: number, index: number, objects: Phaser.GameObjects.GameObject[], tweens: Phaser.Tweens.Tween[]): void {
  const container = scene.add.container(position.x, position.y).setDepth(42);
  if (scene.textures.exists(CARD_BACK_TEXTURE_KEY)) {
    const card = scene.add.image(0, 0, CARD_BACK_TEXTURE_KEY).setDisplaySize(width, height);
    const lightOverlay = scene.add.image(0, 0, CARD_BACK_TEXTURE_KEY).setDisplaySize(width, height).setAlpha(0.04).setTint(0xfff6d6).setBlendMode(Phaser.BlendModes.ADD);
    container.add([card, lightOverlay]);
    tweens.push(scene.tweens.add({ targets: lightOverlay, alpha: 0.28, duration: 1700 + index * 110, delay: index * 220, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }));
  } else {
    addFallbackCard(container, scene, width, height);
    const lightOverlay = scene.add.rectangle(0, 0, width, height, 0xfff6d6, 0.035).setBlendMode(Phaser.BlendModes.ADD);
    container.add(lightOverlay);
    tweens.push(scene.tweens.add({ targets: lightOverlay, alpha: 0.2, duration: 1700 + index * 110, delay: index * 220, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }));
  }
  const staticHighlight = scene.add.rectangle(0, 0, width * 0.92, height * 0.92, 0xfff6d6, 0.025).setBlendMode(Phaser.BlendModes.ADD);
  container.add(staticHighlight);
  addStaticFrame(container, scene, width, height);
  tweens.push(scene.tweens.add({ targets: container, y: position.y - sy(6), duration: 2100 + index * 130, delay: index * 150, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }));
  objects.push(container);
}

function addPreview(scene: Phaser.Scene, count: number): void {
  clearPreview(scene);
  const objects: Phaser.GameObjects.GameObject[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];
  const layout = getLayout(count);
  layout.positions.forEach((position, index) => addPreviewCard(scene, position, layout.width, layout.height, index, objects, tweens));
  const target = scene as PatchedQuestionScene;
  target[PREVIEW_OBJECTS_KEY] = objects;
  target[PREVIEW_TWEENS_KEY] = tweens;
}

function redrawChoiceButton(button: ChoiceView, choice: { label: string; primary?: boolean }, index: number, choicesLength: number, geometry: DialoguePanelGeometry): void {
  const compact = choicesLength > 3;
  const width = geometry.width - sx(92);
  const height = compact ? sy(34) : sy(42);
  const spacing = compact ? sy(41) : sy(52);
  const startY = geometry.y + (compact ? sy(122) : sy(154));
  const y = startY + index * spacing;
  const x = GAME_WIDTH / 2;

  button.bg.clear();
  button.bg.setDepth(56);
  button.bg.fillStyle(choice.primary ? 0x4b3315 : 0x100b18, choice.primary ? 0.9 : 0.62);
  button.bg.fillRoundedRect(x - width / 2, y - height / 2, width, height, ss(6));
  button.bg.lineStyle(ss(2), choice.primary ? 0xf6d365 : 0x6a5134, choice.primary ? 0.95 : 0.78);
  button.bg.strokeRoundedRect(x - width / 2, y - height / 2, width, height, ss(6));
  button.bg.lineStyle(ss(1), choice.primary ? 0xfff0b2 : 0xb58a48, choice.primary ? 0.58 : 0.32);
  button.bg.lineBetween(x - width / 2 + sx(18), y - height / 2 + sy(5), x + width / 2 - sx(18), y - height / 2 + sy(5));

  button.label.setPosition(x - width / 2 + sx(44), y).setOrigin(0, 0.5).setDepth(57).setVisible(true).setText(`${choice.primary ? "➤" : `${index + 1}.`} ${choice.label}`).setStyle({
    fontFamily: "system-ui, sans-serif",
    fontSize: `${compact ? ss(13) : ss(15)}px`,
    color: choice.primary ? "#fff6d6" : "#f8f0ff",
    fontStyle: "bold",
    align: "left",
    wordWrap: { width: width - sx(84) },
  });
  button.hit.setPosition(x, y).setSize(width, height).setDepth(58);
}

export function installQuestionSceneSpreadPreviewPatch(): void {
  const prototype = QuestionScene.prototype as unknown as Record<string, unknown>;
  if (prototype.__spreadPreviewPatchInstalled) return;
  prototype.__spreadPreviewPatchInstalled = true;

  prototype.createFortuneTellerPanel = function disabledLegacyFortuneTellerPanel(): void {
    // Replaced by the RPG-style NPC dialogue box skin in this patch.
  };

  const originalSetDialogue = prototype.setDialogue as (title: string, lines: string[]) => void;
  const originalSetChoices = prototype.setChoices as (choices: { label: string; description?: string; primary?: boolean; action: () => void }[]) => void;

  prototype.setDialogue = function patchedSetDialogue(this: Phaser.Scene, title: string, lines: string[]): void {
    ensureNpcDialogueSkin(this);
    clearPreview(this);
    if (title === "의식 3/5 · 배열 제안" && lines.length > 0) {
      const firstLine = lines[0] ?? "";
      originalSetDialogue.call(this, `점술사 · ${title}`, [firstLine, getSpreadReason(firstLine)]);
      addPreview(this, getSpreadCount(firstLine));
      return;
    }
    originalSetDialogue.call(this, `점술사 · ${title}`, lines);
  };

  prototype.setChoices = function patchedSetChoices(this: Phaser.Scene, choices: { label: string; description?: string; primary?: boolean; action: () => void }[]): void {
    ensureNpcDialogueSkin(this);
    originalSetChoices.call(this, choices);
    const target = this as PatchedQuestionScene;
    const geometry = target[DIALOGUE_PANEL_GEOMETRY_KEY] as DialoguePanelGeometry | undefined;
    const buttons = (target.choiceButtons as ChoiceView[] | undefined) ?? [];
    buttons.forEach((button, index) => {
      const choice = choices[index];
      if (!choice || !geometry) {
        button.bg.clear();
        button.label.setVisible(false);
        button.hit.disableInteractive();
        return;
      }
      redrawChoiceButton(button, choice, index, choices.length, geometry);
      button.hit.setInteractive({ useHandCursor: true });
    });
  };
}
