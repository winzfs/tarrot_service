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

function addCardFrame(scene: Phaser.Scene, x: number, y: number, width: number, height: number): Phaser.GameObjects.Graphics {
  const frame = scene.add.graphics().setDepth(45);
  const gap = ss(4);
  frame.lineStyle(ss(2.4), 0xf6d365, 0.96);
  frame.strokeRect(x - width / 2 - gap, y - height / 2 - gap, width + gap * 2, height + gap * 2);
  frame.lineStyle(ss(1), 0xb58cff, 0.62);
  frame.strokeRect(x - width / 2 + ss(4), y - height / 2 + ss(4), width - ss(8), height - ss(8));
  return frame;
}

function addChapterStyleCardShine(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  index: number,
  objects: Phaser.GameObjects.GameObject[],
  tweens: Phaser.Tweens.Tween[],
): void {
  const innerAura = scene.add
    .rectangle(x, y, width * 0.9, height * 0.9, 0xfff6d6, 0.035)
    .setDepth(44)
    .setBlendMode(Phaser.BlendModes.ADD);
  const sweep = scene.add
    .rectangle(x - width * 0.36, y, width * 0.16, height * 1.18, 0xfff6d6, 0)
    .setDepth(46)
    .setAngle(17)
    .setBlendMode(Phaser.BlendModes.ADD);
  const glint = scene.add
    .text(x + width * 0.22, y - height * 0.22, "✦", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${ss(12)}px`,
      color: "#fff6d6",
      stroke: "#09071a",
      strokeThickness: ss(1),
    })
    .setOrigin(0.5)
    .setAlpha(0)
    .setDepth(47)
    .setBlendMode(Phaser.BlendModes.ADD);

  tweens.push(
    scene.tweens.add({
      targets: innerAura,
      alpha: 0.13,
      duration: 1500 + index * 120,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    }),
  );
  tweens.push(
    scene.tweens.add({
      targets: sweep,
      x: x + width * 0.36,
      alpha: { from: 0, to: 0.22 },
      duration: 1450 + index * 80,
      delay: 280 + index * 160,
      repeat: -1,
      repeatDelay: 1500 + index * 120,
      ease: "Sine.easeInOut",
    }),
  );
  tweens.push(
    scene.tweens.add({
      targets: glint,
      alpha: 0.62,
      scale: 1.14,
      duration: 760 + index * 80,
      delay: 420 + index * 170,
      yoyo: true,
      repeat: -1,
      repeatDelay: 1320 + index * 120,
      ease: "Sine.easeInOut",
    }),
  );

  objects.push(innerAura, sweep, glint);
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
  const card = scene.add.image(x, y, CARD_BACK_TEXTURE_KEY).setDepth(42).setDisplaySize(width, height);
  const luminousCard = scene.add
    .image(x, y, CARD_BACK_TEXTURE_KEY)
    .setDepth(43)
    .setDisplaySize(width, height)
    .setAlpha(0.08)
    .setBlendMode(Phaser.BlendModes.ADD);
  const frame = addCardFrame(scene, x, y, width, height);
  addChapterStyleCardShine(scene, x, y, width, height, index, objects, tweens);

  tweens.push(
    scene.tweens.add({
      targets: [card, luminousCard, frame],
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
      alpha: 0.28,
      duration: 1200 + index * 120,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    }),
  );

  objects.push(card, luminousCard, frame);
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
  const card = scene.add.graphics().setDepth(42);
  card.fillStyle(0x120b2b, 0.98);
  card.fillRoundedRect(x - width / 2, y - height / 2, width, height, ss(8));
  card.lineStyle(ss(2), 0xf6d365, 0.86);
  card.strokeRoundedRect(x - width / 2, y - height / 2, width, height, ss(8));
  card.lineStyle(ss(1), 0x6d4aff, 0.72);
  card.strokeRoundedRect(x - width / 2 + sx(5), y - height / 2 + sy(5), width - sx(10), height - sy(10), ss(6));
  const frame = addCardFrame(scene, x, y, width, height);
  const sigil = scene.add
    .text(x, y, "✦", { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${ss(16)}px`, color: "#fff6d6" })
    .setOrigin(0.5)
    .setDepth(44)
    .setBlendMode(Phaser.BlendModes.ADD);
  addChapterStyleCardShine(scene, x, y, width, height, index, objects, tweens);

  tweens.push(
    scene.tweens.add({
      targets: sigil,
      alpha: 0.46,
      duration: 920 + index * 100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    }),
  );
  objects.push(card, frame, sigil);
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
