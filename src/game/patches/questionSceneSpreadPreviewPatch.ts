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
      height: 360px;
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
      gap: 24px;
    }

    .arcana-spread-preview-grid.count-1 {
      grid-template-columns: 1fr;
    }

    .arcana-spread-preview-grid.count-3 {
      grid-template-columns: repeat(3, auto);
      gap: 30px;
    }

    .arcana-spread-preview-grid.count-5 {
      grid-template-columns: repeat(6, auto);
      column-gap: 28px;
      row-gap: 22px;
    }

    .arcana-spread-preview-grid.count-5 .arcana-spread-preview-card:nth-child(1) {
      grid-column: 2 / span 2;
    }

    .arcana-spread-preview-grid.count-5 .arcana-spread-preview-card:nth-child(2) {
      grid-column: 4 / span 2;
    }

    .arcana-spread-preview-grid.count-5 .arcana-spread-preview-card:nth-child(3) {
      grid-column: 1 / span 2;
    }

    .arcana-spread-preview-grid.count-5 .arcana-spread-preview-card:nth-child(4) {
      grid-column: 3 / span 2;
    }

    .arcana-spread-preview-grid.count-5 .arcana-spread-preview-card:nth-child(5) {
      grid-column: 5 / span 2;
    }

    .arcana-spread-preview-card.arcana-big-card.image-card {
      position: relative;
      display: block;
      box-sizing: border-box;
      overflow: hidden;
      margin: 0;
      padding: 5px;
      border: 3px solid rgba(246, 211, 101, 0.92);
      border-radius: 18px;
      background: rgba(7, 4, 15, 0.98);
      box-shadow:
        0 0 18px rgba(246, 211, 101, 0.18),
        0 0 30px rgba(181, 140, 255, 0.14),
        inset 0 0 18px rgba(181, 140, 255, 0.1);
      animation:
        arcana-spread-preview-enter 900ms cubic-bezier(0.2, 0.9, 0.22, 1) both,
        arcana-spread-preview-float 1800ms ease-in-out infinite;
    }

    .arcana-spread-preview-card.arcana-big-card.image-card::after {
      content: "";
      position: absolute;
      inset: -55% -70%;
      background: linear-gradient(110deg, transparent 36%, rgba(255, 246, 214, 0.24), transparent 64%);
      animation: arcana-card-shine 1500ms ease 650ms both;
      pointer-events: none;
    }

    .arcana-spread-preview-grid.count-1 .arcana-spread-preview-card {
      width: 132px;
      height: 204px;
    }

    .arcana-spread-preview-grid.count-3 .arcana-spread-preview-card {
      width: 110px;
      height: 170px;
    }

    .arcana-spread-preview-grid.count-5 .arcana-spread-preview-card {
      width: 78px;
      height: 120px;
    }

    .arcana-spread-preview-card .arcana-card-image {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      border-radius: 13px;
      box-shadow: inset 0 0 16px rgba(0, 0, 0, 0.28);
    }

    @keyframes arcana-spread-preview-enter {
      0% {
        opacity: 0;
        transform: translateY(26px) scale(0.9) rotateY(40deg);
        filter: brightness(2.2) blur(3px);
      }
      56% {
        opacity: 1;
        filter: brightness(2.4) blur(1px);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1) rotateY(0deg);
        filter: brightness(1) blur(0);
      }
    }

    @keyframes arcana-spread-preview-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
  `;
  document.head.appendChild(style);
}

function buildCardsHtml(count: number): string {
  return Array.from({ length: count }, (_, index) => `
    <article class="arcana-spread-preview-card arcana-big-card image-card" style="animation-delay:${index * 90}ms, ${index * 120}ms">
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

  const preview = scene.add.dom(GAME_WIDTH / 2, sy(count === 5 ? 548 : 530), root).setOrigin(0.5).setDepth(42);
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
