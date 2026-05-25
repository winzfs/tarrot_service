import Phaser from "phaser";
import cardBackImageUrl from "../../../images/back.png?url";
import { GAME_WIDTH, sy } from "../GameConfig";
import { QuestionScene } from "../scenes/QuestionScene";

const PREVIEW_OBJECTS_KEY = "__dialogueSpreadPreviewObjects";

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
  const objects = (target[PREVIEW_OBJECTS_KEY] as Phaser.GameObjects.GameObject[] | undefined) ?? [];
  objects.forEach((object) => object.destroy());
  target[PREVIEW_OBJECTS_KEY] = [];
}

function ensurePreviewStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById("arcana-spread-preview-dom-style")) return;

  const style = document.createElement("style");
  style.id = "arcana-spread-preview-dom-style";
  style.textContent = `
    .arcana-spread-preview-dom {
      width: 920px;
      height: 570px;
      display: grid;
      place-items: center;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none;
    }

    .arcana-spread-preview-grid {
      display: grid;
      justify-content: center;
      align-items: center;
      justify-items: center;
      gap: 36px;
    }

    .arcana-spread-preview-grid.count-1 {
      grid-template-columns: 1fr;
      transform: translateY(-22px);
    }

    .arcana-spread-preview-grid.count-3 {
      grid-template-columns: repeat(3, auto);
      gap: 44px;
    }

    .arcana-spread-preview-grid.count-5 {
      grid-template-columns: repeat(6, auto);
      column-gap: 44px;
      row-gap: 34px;
      transform: translateY(-22px);
    }

    .arcana-spread-preview-grid.count-5 .arcana-spread-preview-card:nth-child(1) { grid-column: 2 / span 2; }
    .arcana-spread-preview-grid.count-5 .arcana-spread-preview-card:nth-child(2) { grid-column: 4 / span 2; }
    .arcana-spread-preview-grid.count-5 .arcana-spread-preview-card:nth-child(3) { grid-column: 1 / span 2; }
    .arcana-spread-preview-grid.count-5 .arcana-spread-preview-card:nth-child(4) { grid-column: 3 / span 2; }
    .arcana-spread-preview-grid.count-5 .arcana-spread-preview-card:nth-child(5) { grid-column: 5 / span 2; }

    .arcana-spread-preview-card.arcana-big-card.image-card {
      position: relative;
      display: block;
      box-sizing: border-box;
      overflow: hidden;
      margin: 0;
      padding: 5px;
      border: 3px solid rgba(246, 211, 101, 0.92);
      border-radius: 0;
      background: rgba(7, 4, 15, 0.98);
      box-shadow:
        0 0 16px rgba(246, 211, 101, 0.12),
        0 0 28px rgba(181, 140, 255, 0.08),
        inset 0 0 14px rgba(181, 140, 255, 0.06);
      filter: none;
    }

    .arcana-spread-preview-card:nth-child(1)::after { animation-delay: 0ms; }
    .arcana-spread-preview-card:nth-child(2)::after { animation-delay: 520ms; }
    .arcana-spread-preview-card:nth-child(3)::after { animation-delay: 1040ms; }
    .arcana-spread-preview-card:nth-child(4)::after { animation-delay: 1560ms; }
    .arcana-spread-preview-card:nth-child(5)::after { animation-delay: 2080ms; }

    .arcana-spread-preview-card.arcana-big-card.image-card::before {
      content: "";
      position: absolute;
      inset: 5px;
      pointer-events: none;
      background: linear-gradient(120deg, rgba(255, 246, 214, 0.055), transparent 34%, transparent 68%, rgba(181, 140, 255, 0.045));
    }

    .arcana-spread-preview-card.arcana-big-card.image-card::after {
      content: "";
      position: absolute;
      inset: 5px;
      pointer-events: none;
      background: rgba(255, 246, 214, 0.16);
      opacity: 0.02;
      animation: arcana-spread-preview-breathe-overlay 3600ms ease-in-out infinite;
    }

    .arcana-spread-preview-grid.count-1 .arcana-spread-preview-card { width: 248px; height: 384px; }
    .arcana-spread-preview-grid.count-3 .arcana-spread-preview-card { width: 198px; height: 306px; }
    .arcana-spread-preview-grid.count-5 .arcana-spread-preview-card { width: 138px; height: 214px; }

    .arcana-spread-preview-card .arcana-card-image {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      border-radius: 0;
      box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.22);
      filter: none;
    }

    @keyframes arcana-spread-preview-breathe-overlay {
      0%, 100% { opacity: 0.02; }
      50% { opacity: 0.14; }
    }
  `;
  document.head.appendChild(style);
}

function buildCardsHtml(count: number): string {
  return Array.from({ length: count }, (_, index) => `
    <article class="arcana-spread-preview-card arcana-big-card image-card">
      <img class="arcana-card-image" src="${cardBackImageUrl}" alt="카드 뒷면 ${index + 1}" />
    </article>
  `).join("");
}

function addPreview(scene: Phaser.Scene, count: number): void {
  clearPreview(scene);
  ensurePreviewStyles();

  const root = document.createElement("section");
  root.className = "arcana-spread-preview-dom";
  root.innerHTML = `
    <div class="arcana-spread-preview-grid count-${count}">
      ${buildCardsHtml(count)}
    </div>
  `;

  const previewY = count === 1 ? sy(528) : count === 5 ? sy(522) : sy(552);
  const preview = scene.add.dom(GAME_WIDTH / 2, previewY, root).setOrigin(0.5).setDepth(42);
  const target = scene as Phaser.Scene & Record<string, unknown>;
  target[PREVIEW_OBJECTS_KEY] = [preview];
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
