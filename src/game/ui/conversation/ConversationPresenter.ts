import type { ReadingResponse } from "../../../api/types";
import { DialoguePanel, NpcReactionBadge, ProgressPulse } from "./components";
import type { ConversationSettings } from "./ConversationSettings";

type StepCard = {
  chapterTitle: string;
  whisper: string;
  reading: string;
  imageUrl: string;
  displayName: string;
  koreanName: string;
  name: string;
  symbol: string;
  isReversed: boolean;
};

const esc = (v: string) =>
  v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

export class ConversationPresenter {
  constructor(private readonly settings: ConversationSettings) {}

  getAutoRevealDelayMs(): number {
    return this.settings.autoRevealDelayMs;
  }

  getTapUnlockDelayMs(): number {
    return this.settings.tapUnlockAfterRevealMs;
  }

  renderCardStep(card: StepCard, question: string, stepLabel: string): string {
    const imageClass = card.isReversed ? "arcana-card-image is-reversed" : "arcana-card-image";
    return `
      ${ProgressPulse(stepLabel)}
      <div class="arcana-step-stage card-only card-aura-preset present-aura">
        <div class="arcana-card-title-area">
          <h1 class="arcana-reading-title hero-title chapter-title">${esc(card.chapterTitle)}</h1>
          <p class="arcana-chapter-whisper">${esc(card.whisper)}</p>
        </div>
        <div class="arcana-big-card-wrap hero-card-wrap">
          <div class="arcana-reading-card-stack chapter-card aura-card-stack">
            <div class="arcana-card-aura-glow" aria-hidden="true"></div>
            <article class="arcana-big-card hero-card image-card aura-card">
              ${card.imageUrl ? `<img class="${imageClass}" src="${esc(card.imageUrl)}" alt="${esc(card.displayName)}" />` : `<div class="arcana-big-card-symbol">${esc(card.symbol)}</div>`}
            </article>
            <div class="arcana-reading-card-caption">
              <div class="arcana-reading-card-name-ko">${esc(card.koreanName)}</div>
              <div class="arcana-reading-card-name-en">${esc(card.name)}</div>
            </div>
          </div>
        </div>
        <div class="arcana-dialogue-slot">
          ${DialoguePanel("점술사", this.formatDialogueText(card.reading))}
          ${NpcReactionBadge(`봉인된 질문\n${esc(question)}`)}
        </div>
      </div>
    `;
  }

  renderAdviceStep(reading: ReadingResponse, spreadName: string): string {
    return `<div class="arcana-finale-stage fusion-finale-step"><h1 class="arcana-reading-title hero-title advice-title">종장. ${esc(spreadName)}</h1><div class="arcana-advice-lines fusion-lines finale-advice-lines">${this.renderAdviceLines(reading.advice)}</div></div>`;
  }

  private formatDialogueText(text: string): string {
    return esc(text).replace(/([.!?。！？]|다\.)\s+/g, "$1<br />").replace(/(요\.)\s+/g, "$1<br />");
  }

  private renderAdviceLines(advice: string): string {
    return advice
      .split(/(?<=[.!?。！？]|다\.|요\.)\s+/)
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, 4)
      .map((line, index) => `<p class="arcana-advice-line" style="animation-delay: ${2850 + index * 1150}ms">${esc(line)}</p>`)
      .join("");
  }
}
