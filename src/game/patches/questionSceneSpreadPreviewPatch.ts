import Phaser from "phaser";
import { GAME_WIDTH, sy } from "../GameConfig";
import { QuestionScene } from "../scenes/QuestionScene";

const CARD_BACK_TEXTURE_KEY = "tarot-card-back";
const PREVIEW_OBJECTS_KEY = "__dialogueSpreadPreviewObjects";
const PREVIEW_TWEENS_KEY = "__dialogueSpreadPreviewTweens";

type PreviewPosition = { x: number; y: number };
type PreviewLayout = { width: number; height: number; positions: PreviewPosition[] };

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
  const target = scene as Phaser.Scene & Record<string, unknown>;
  const tweens = (target[PREVIEW_TWEENS_KEY] as Phaser.Tweens.Tween[] | undefined) ?? [];
  const objects = (target[PREVIEW_OBJECTS_KEY] as Phaser.GameObjects.GameObject[] | undefined) ?? [];
  tweens.forEach((tween) => tween.stop());
  objects.forEach((object) => object.destroy());
  target[PREVIEW_TWEENS_KEY] = [];
  target[PREVIEW_OBJECTS_KEY] = [];
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

  const target = scene as Phaser.Scene & Record<string, unknown>;
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
