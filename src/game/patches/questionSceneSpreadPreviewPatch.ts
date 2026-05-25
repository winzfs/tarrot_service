import Phaser from "phaser";
import { GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import { QuestionScene } from "../scenes/QuestionScene";

const PREVIEW_OBJECTS_KEY = "__dialogueSpreadPreviewObjects";
const PREVIEW_TWEENS_KEY = "__dialogueSpreadPreviewTweens";

function getSpreadReason(firstLine: string, originalReason?: string): string {
  if (originalReason && originalReason !== "질문에 맞는 문이 열렸습니다.") return originalReason;
  if (firstLine.includes("오늘") || firstLine.includes("한 장")) return "지금 가장 가까운 기운 하나를 조용히 비춥니다.";
  if (firstLine.includes("상황") || firstLine.includes("조언")) return "현재 상황, 막힌 지점, 다음 조언을 세 갈래로 엽니다.";
  if (firstLine.includes("시간") || firstLine.includes("세 문")) return "지나온 흐름, 지금의 자리, 다가오는 기운을 차례로 읽어냅니다.";
  if (firstLine.includes("관계") || firstLine.includes("거울")) return "나와 상대의 마음, 관계의 결, 두 사람 사이의 다음 문을 깊게 비춥니다.";
  if (firstLine.includes("선택") || firstLine.includes("갈림길")) return "두 갈래 선택이 품은 가능성과 각 길 끝의 조언을 비교합니다.";
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

function addPreview(scene: Phaser.Scene, count: number): void {
  const target = scene as Phaser.Scene & Record<string, unknown>;
  clearPreview(scene);

  const objects: Phaser.GameObjects.GameObject[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];
  const cardWidth = sx(count >= 5 ? 42 : 50);
  const cardHeight = sy(count >= 5 ? 66 : 78);
  const gap = sx(count >= 5 ? 9 : 13);
  const totalWidth = count * cardWidth + (count - 1) * gap;
  const startX = GAME_WIDTH / 2 - totalWidth / 2 + cardWidth / 2;
  const y = sy(500);

  for (let index = 0; index < count; index += 1) {
    const x = startX + index * (cardWidth + gap);
    const halo = scene.add.circle(x, y, ss(30), 0x6d4aff, 0.1).setDepth(40);
    const glow = scene.add.circle(x, y, ss(34), 0xf6d365, 0.12).setDepth(41);
    tweens.push(scene.tweens.add({ targets: halo, alpha: 0.22, scale: 1.18, duration: 1450 + index * 100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }));
    tweens.push(scene.tweens.add({ targets: glow, alpha: 0.28, scale: 1.12, duration: 1180 + index * 110, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }));
    objects.push(halo, glow);

    if (scene.textures.exists("tarot-card-back")) {
      const card = scene.add.image(x, y, "tarot-card-back").setDepth(42).setDisplaySize(cardWidth, cardHeight);
      tweens.push(scene.tweens.add({ targets: card, y: y - sy(4), duration: 1520 + index * 90, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }));
      objects.push(card);
    } else {
      const card = scene.add.graphics().setDepth(42);
      card.fillStyle(0x120b2b, 0.98);
      card.fillRoundedRect(x - cardWidth / 2, y - cardHeight / 2, cardWidth, cardHeight, ss(8));
      card.lineStyle(ss(2), 0xf6d365, 0.86);
      card.strokeRoundedRect(x - cardWidth / 2, y - cardHeight / 2, cardWidth, cardHeight, ss(8));
      card.lineStyle(ss(1), 0x6d4aff, 0.72);
      card.strokeRoundedRect(x - cardWidth / 2 + sx(5), y - cardHeight / 2 + sy(5), cardWidth - sx(10), cardHeight - sy(10), ss(6));
      const sigil = scene.add.text(x, y, "✦", { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${ss(16)}px`, color: "#fff6d6" }).setOrigin(0.5).setDepth(43);
      tweens.push(scene.tweens.add({ targets: sigil, alpha: 0.5, duration: 920 + index * 100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }));
      objects.push(card, sigil);
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
      const reason = getSpreadReason(firstLine, lines[1]);
      originalSetDialogue.call(this, title, [firstLine, reason]);
      addPreview(this, getSpreadCount(firstLine));
      return;
    }
    originalSetDialogue.call(this, title, lines);
  };
}
