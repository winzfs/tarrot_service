import Phaser from "phaser";
import { GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import { QuestionScene } from "../scenes/QuestionScene";

const CARD_BACK_TEXTURE_KEY = "tarot-card-back";
const PREVIEW_OBJECTS_KEY = "__dialogueSpreadPreviewObjects";
const PREVIEW_TWEENS_KEY = "__dialogueSpreadPreviewTweens";
const DIALOGUE_SKIN_OBJECTS_KEY = "__npcDialogueSkinObjects";

type PreviewPosition = { x: number; y: number };
type PreviewLayout = { width: number; height: number; positions: PreviewPosition[] };
type ChoiceView = { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; hit: Phaser.GameObjects.Zone };
type PatchedQuestionScene = Phaser.Scene & Record<string, unknown>;

function getSpreadReason(firstLine: string): string {
  if (firstLine.includes("오늘") || firstLine.includes("한 장")) {
    return "지금 가장 가까운 기운 하나만 조용히 비춰, 질문의 핵심을 짧고 선명하게 붙잡습니다.";
  }
  if (firstLine.includes("상황") || firstLine.includes("조언")) {
    return "현재 상황, 막힌 지점, 바로 취할 태도를 세 개의 문으로 차례차례 엽니다.";
  }
  if (firstLine.includes("시간") || firstLine.includes("세 문")) {
    return "지나온 흐름, 지금의 자리, 다가오는 가능성을 시간의 순서대로 읽어냅니다.";
  }
  if (firstLine.includes("관계") || firstLine.includes("거울")) {
    return "나와 상대의 마음, 서로를 비추는 감정, 관계가 향하는 다음 결을 깊게 들여다봅니다.";
  }
  if (firstLine.includes("선택") || firstLine.includes("갈림길")) {
    return "두 갈래 길이 품은 가능성과 선택 뒤에 따라올 조언을 나란히 비교합니다.";
  }
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

function ensureNpcDialogueSkin(scene: Phaser.Scene): void {
  const target = scene as PatchedQuestionScene;
  if (target[DIALOGUE_SKIN_OBJECTS_KEY]) return;

  const x = sx(18);
  const y = sy(224);
  const width = GAME_WIDTH - sx(36);
  const height = sy(164);
  const panel = scene.add.graphics().setDepth(43);
  panel.fillStyle(0x090719, 0.94);
  panel.fillRoundedRect(x, y, width, height, ss(18));
  panel.lineStyle(ss(3), 0xf6d365, 0.72);
  panel.strokeRoundedRect(x, y, width, height, ss(18));
  panel.lineStyle(ss(1), 0x6d4aff, 0.64);
  panel.strokeRoundedRect(x + sx(6), y + sy(6), width - sx(12), height - sy(12), ss(14));

  const shadow = scene.add.rectangle(GAME_WIDTH / 2, y + height + sy(8), width - sx(20), sy(10), 0x000000, 0.24).setDepth(42);
  const portraitGlow = scene.add.circle(sx(56), y + sy(52), ss(29), 0x6d4aff, 0.16).setDepth(44);
  const portrait = scene.add.circle(sx(56), y + sy(52), ss(23), 0x1b1238, 0.98).setDepth(45).setStrokeStyle(ss(2), 0xf6d365, 0.84);
  const sigil = scene.add.text(sx(56), y + sy(52), "✦", {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: `${ss(21)}px`,
    color: "#fff6d6",
  }).setOrigin(0.5).setDepth(46);

  const namePlate = scene.add.graphics().setDepth(46);
  namePlate.fillStyle(0x1b1238, 0.96);
  namePlate.fillRoundedRect(sx(86), y + sy(16), sx(88), sy(28), ss(10));
  namePlate.lineStyle(ss(1), 0xf6d365, 0.68);
  namePlate.strokeRoundedRect(sx(86), y + sy(16), sx(88), sy(28), ss(10));
  const nameText = scene.add.text(sx(130), y + sy(30), "점술사", {
    fontFamily: "system-ui, sans-serif",
    fontSize: `${ss(13)}px`,
    color: "#fff6d6",
    fontStyle: "bold",
  }).setOrigin(0.5).setDepth(47);
  const nextMark = scene.add.text(GAME_WIDTH - sx(42), y + height - sy(26), "▾", {
    fontFamily: "system-ui, sans-serif",
    fontSize: `${ss(18)}px`,
    color: "#f6d365",
    fontStyle: "bold",
  }).setOrigin(0.5).setDepth(47);

  scene.tweens.add({
    targets: nextMark,
    y: y + height - sy(20),
    duration: 780,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });

  const titleText = target.dialogueTitleText as Phaser.GameObjects.Text | undefined;
  const bodyText = target.dialogueBodyText as Phaser.GameObjects.Text | undefined;
  titleText?.setPosition(sx(188), y + sy(22)).setDepth(47).setStyle({
    fontFamily: "system-ui, sans-serif",
    fontSize: `${ss(12)}px`,
    color: "#cdbdff",
    fontStyle: "bold",
  });
  bodyText?.setPosition(sx(88), y + sy(58)).setDepth(47).setStyle({
    fontFamily: "system-ui, sans-serif",
    fontSize: `${ss(15)}px`,
    color: "#f8f0ff",
    lineSpacing: ss(7),
    wordWrap: { width: sx(250) },
  });

  target[DIALOGUE_SKIN_OBJECTS_KEY] = [panel, shadow, portraitGlow, portrait, sigil, namePlate, nameText, nextMark];
}

function getLayout(count: number): PreviewLayout {
  const centerX = GAME_WIDTH / 2;

  if (count === 1) {
    return {
      width: 248,
      height: 384,
      positions: [{ x: centerX, y: sy(478) }],
    };
  }

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

  return {
    width,
    height,
    positions: Array.from({ length: count }, (_, index) => ({
      x: startX + index * (width + gap),
      y: sy(486),
    })),
  };
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

function addPreviewCard(
  scene: Phaser.Scene,
  position: PreviewPosition,
  width: number,
  height: number,
  index: number,
  objects: Phaser.GameObjects.GameObject[],
  tweens: Phaser.Tweens.Tween[],
): void {
  const container = scene.add.container(position.x, position.y).setDepth(42);

  if (scene.textures.exists(CARD_BACK_TEXTURE_KEY)) {
    const card = scene.add.image(0, 0, CARD_BACK_TEXTURE_KEY).setDisplaySize(width, height);
    const lightOverlay = scene.add
      .image(0, 0, CARD_BACK_TEXTURE_KEY)
      .setDisplaySize(width, height)
      .setAlpha(0.04)
      .setTint(0xfff6d6)
      .setBlendMode(Phaser.BlendModes.ADD);

    container.add([card, lightOverlay]);

    tweens.push(
      scene.tweens.add({
        targets: lightOverlay,
        alpha: 0.28,
        duration: 1700 + index * 110,
        delay: index * 220,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      }),
    );
  } else {
    addFallbackCard(container, scene, width, height);
    const lightOverlay = scene.add.rectangle(0, 0, width, height, 0xfff6d6, 0.035).setBlendMode(Phaser.BlendModes.ADD);
    container.add(lightOverlay);
    tweens.push(
      scene.tweens.add({
        targets: lightOverlay,
        alpha: 0.2,
        duration: 1700 + index * 110,
        delay: index * 220,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      }),
    );
  }

  const staticHighlight = scene.add.rectangle(0, 0, width * 0.92, height * 0.92, 0xfff6d6, 0.025).setBlendMode(Phaser.BlendModes.ADD);
  container.add(staticHighlight);
  addStaticFrame(container, scene, width, height);

  tweens.push(
    scene.tweens.add({
      targets: container,
      y: position.y - sy(6),
      duration: 2100 + index * 130,
      delay: index * 150,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    }),
  );

  objects.push(container);
}

function addPreview(scene: Phaser.Scene, count: number): void {
  clearPreview(scene);

  const objects: Phaser.GameObjects.GameObject[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];
  const layout = getLayout(count);

  layout.positions.forEach((position, index) => {
    addPreviewCard(scene, position, layout.width, layout.height, index, objects, tweens);
  });

  const target = scene as PatchedQuestionScene;
  target[PREVIEW_OBJECTS_KEY] = objects;
  target[PREVIEW_TWEENS_KEY] = tweens;
}

export function installQuestionSceneSpreadPreviewPatch(): void {
  const prototype = QuestionScene.prototype as unknown as Record<string, unknown>;
  if (prototype.__spreadPreviewPatchInstalled) return;
  prototype.__spreadPreviewPatchInstalled = true;

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
    const buttons = ((this as PatchedQuestionScene).choiceButtons as ChoiceView[] | undefined) ?? [];
    buttons.forEach((button, index) => {
      const choice = choices[index];
      button.bg.setDepth(56);
      button.label.setDepth(57);
      button.hit.setDepth(58);
      if (!choice) return;
      button.label.setText(`${choice.primary ? "▶" : "›"} ${choice.label}`);
      button.label.setStyle({
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(14)}px`,
        color: choice.primary ? "#fff6d6" : "#f8f0ff",
        fontStyle: "bold",
        align: "center",
      });
    });
  };
}
