import Phaser from "phaser";
import { GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import { QuestionScene } from "../scenes/QuestionScene";

const CARD_BACK_TEXTURE_KEY = "tarot-card-back";
const PREVIEW_OBJECTS_KEY = "__dialogueSpreadPreviewObjects";
const PREVIEW_TWEENS_KEY = "__dialogueSpreadPreviewTweens";

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

function fitTexture(scene: Phaser.Scene, textureKey: string, maxWidth: number, maxHeight: number): { width: number; height: number } {
  const source = scene.textures.get(textureKey).getSourceImage() as { width?: number; height?: number };
  const sourceWidth = source.width || maxWidth;
  const sourceHeight = source.height || maxHeight;
  const ratio = sourceWidth / sourceHeight;
  const widthFromHeight = maxHeight * ratio;
  return widthFromHeight <= maxWidth
    ? { width: widthFromHeight, height: maxHeight }
    : { width: maxWidth, height: maxWidth / ratio };
}

function clearPreview(scene: Phaser.Scene): void {
  const target = scene as Phaser.Scene & Record<string, unknown>;
  const tweens = (target[PREVIEW_TWEENS_KEY] as Phaser.Tweens.Tween[] | undefined) ?? [];
  const objects = (target[PREVIEW_OBJECTS_KEY] as Phaser.GameObjects.GameObject[] | undefined) ?? [];
  tweens.forEach((tween) => tween.stop());
  objects.forEach((object) => object.destroy());
  target[PREVIEW_TWEENS_KEY] = [];
  target[PREVIEW_OBJECTS_KEY] = [];
}

function addFrameToContainer(container: Phaser.GameObjects.Container, scene: Phaser.Scene, width: number, height: number): Phaser.GameObjects.Graphics {
  const frame = scene.add.graphics();
  const gap = ss(4);
  frame.lineStyle(ss(2.4), 0xf6d365, 0.96);
  frame.strokeRect(-width / 2 - gap, -height / 2 - gap, width + gap * 2, height + gap * 2);
  frame.lineStyle(ss(1), 0xb58cff, 0.62);
  frame.strokeRect(-width / 2 + ss(4), -height / 2 + ss(4), width - ss(8), height - ss(8));
  container.add(frame);
  return frame;
}

function addGlassSweepToContainer(
  container: Phaser.GameObjects.Container,
  scene: Phaser.Scene,
  width: number,
  height: number,
  index: number,
  tweens: Phaser.Tweens.Tween[],
): void {
  const softFace = scene.add
    .rectangle(0, 0, width * 0.92, height * 0.92, 0xfff6d6, 0.035)
    .setBlendMode(Phaser.BlendModes.ADD);
  const sweep = scene.add
    .rectangle(-width * 0.86, 0, width * 0.3, height * 1.42, 0xfff6d6, 0)
    .setAngle(18)
    .setBlendMode(Phaser.BlendModes.ADD);
  const sweepCore = scene.add
    .rectangle(-width * 0.96, 0, width * 0.09, height * 1.38, 0xffffff, 0)
    .setAngle(18)
    .setBlendMode(Phaser.BlendModes.ADD);

  container.add([softFace, sweep, sweepCore]);

  tweens.push(
    scene.tweens.add({
      targets: softFace,
      alpha: 0.1,
      duration: 1450 + index * 100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    }),
  );
  tweens.push(
    scene.tweens.add({
      targets: sweep,
      x: width * 0.86,
      alpha: { from: 0, to: 0.4 },
      duration: 1450 + index * 70,
      delay: 240 + index * 130,
      repeat: -1,
      repeatDelay: 1420 + index * 90,
      ease: "Cubic.easeInOut",
      onRepeat: () => {
        sweep.setX(-width * 0.86);
        sweep.setAlpha(0);
      },
    }),
  );
  tweens.push(
    scene.tweens.add({
      targets: sweepCore,
      x: width * 0.96,
      alpha: { from: 0, to: 0.28 },
      duration: 1450 + index * 70,
      delay: 300 + index * 130,
      repeat: -1,
      repeatDelay: 1420 + index * 90,
      ease: "Cubic.easeInOut",
      onRepeat: () => {
        sweepCore.setX(-width * 0.96);
        sweepCore.setAlpha(0);
      },
    }),
  );
}

function addImageCardPreview(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  index: number,
  objects: Phaser.GameObjects.GameObject[],
  tweens: Phaser.Tweens.Tween[],
): void {
  const container = scene.add.container(x, y).setDepth(42);
  const card = scene.add.image(0, 0, CARD_BACK_TEXTURE_KEY).setDisplaySize(width, height);
  const luminousCard = scene.add
    .image(0, 0, CARD_BACK_TEXTURE_KEY)
    .setDisplaySize(width, height)
    .setAlpha(0.08)
    .setBlendMode(Phaser.BlendModes.ADD);

  container.add([card, luminousCard]);
  addGlassSweepToContainer(container, scene, width, height, index, tweens);
  addFrameToContainer(container, scene, width, height);

  tweens.push(
    scene.tweens.add({
      targets: container,
      y: y - sy(4),
      duration: 1520 + index * 90,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    }),
  );
  tweens.push(
    scene.tweens.add({
      targets: luminousCard,
      alpha: 0.3,
      duration: 1200 + index * 120,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    }),
  );

  objects.push(container);
}

function addFallbackCardPreview(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  index: number,
  objects: Phaser.GameObjects.GameObject[],
  tweens: Phaser.Tweens.Tween[],
): void {
  const container = scene.add.container(x, y).setDepth(42);
  const card = scene.add.graphics();
  card.fillStyle(0x120b2b, 0.98);
  card.fillRoundedRect(-width / 2, -height / 2, width, height, ss(8));
  card.lineStyle(ss(2), 0xf6d365, 0.86);
  card.strokeRoundedRect(-width / 2, -height / 2, width, height, ss(8));
  card.lineStyle(ss(1), 0x6d4aff, 0.72);
  card.strokeRoundedRect(-width / 2 + sx(5), -height / 2 + sy(5), width - sx(10), height - sy(10), ss(6));
  container.add(card);
  addGlassSweepToContainer(container, scene, width, height, index, tweens);
  addFrameToContainer(container, scene, width, height);

  tweens.push(
    scene.tweens.add({
      targets: container,
      y: y - sy(4),
      duration: 1520 + index * 90,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    }),
  );
  objects.push(container);
}

function addPreview(scene: Phaser.Scene, count: number): void {
  const target = scene as Phaser.Scene & Record<string, unknown>;
  clearPreview(scene);

  const objects: Phaser.GameObjects.GameObject[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];
  const maxCardWidth = sx(count >= 5 ? 62 : count === 1 ? 112 : 94);
  const maxCardHeight = sy(count >= 5 ? 98 : count === 1 ? 172 : 146);
  const fitted = scene.textures.exists(CARD_BACK_TEXTURE_KEY)
    ? fitTexture(scene, CARD_BACK_TEXTURE_KEY, maxCardWidth, maxCardHeight)
    : { width: maxCardWidth, height: maxCardHeight };
  const gap = sx(count >= 5 ? 8 : 18);
  const totalWidth = count * fitted.width + (count - 1) * gap;
  const startX = GAME_WIDTH / 2 - totalWidth / 2 + fitted.width / 2;
  const y = sy(count === 1 ? 516 : 510);

  for (let index = 0; index < count; index += 1) {
    const x = startX + index * (fitted.width + gap);
    if (scene.textures.exists(CARD_BACK_TEXTURE_KEY)) {
      addImageCardPreview(scene, x, y, fitted.width, fitted.height, index, objects, tweens);
    } else {
      addFallbackCardPreview(scene, x, y, fitted.width, fitted.height, index, objects, tweens);
    }
  }

  target[PREVIEW_OBJECTS_KEY] = objects;
  target[PREVIEW_TWEENS_KEY] = tweens;
}

export function installQuestionSceneSpreadPreviewPatch(): void {
  const prototype = QuestionScene.prototype as unknown as Record<string, unknown>;
  if (prototype.__spreadPreviewPatchInstalled) return;
  prototype.__spreadPreviewPatchInstalled = true;

  const originalSetDialogue = prototype.setDialogue as (title: string, lines: string[]) => void;
  prototype.setDialogue = function patchedSetDialogue(this: Phaser.Scene, title: string, lines: string[]): void {
    clearPreview(this);
    if (title === "의식 3/5 · 배열 제안" && lines.length > 0) {
      const firstLine = lines[0] ?? "";
      originalSetDialogue.call(this, title, [firstLine, getSpreadReason(firstLine)]);
      addPreview(this, getSpreadCount(firstLine));
      return;
    }
    originalSetDialogue.call(this, title, lines);
  };
}
