export type ConversationUiEvents = {
  onChoiceSelected?: (choiceId: string) => void;
  onSkip?: () => void;
  onAutoAdvanceChanged?: (enabled: boolean) => void;
};

const esc = (v: string) =>
  v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

export const ProgressPulse = (stepLabel: string): string => `<div class="arcana-ai-badge floating reading-progress-badge">${esc(stepLabel)}</div>`;

export const NpcReactionBadge = (label: string): string => `<div class="arcana-question-ghost" data-npc-reaction>${esc(label)}</div>`;

export const ChoiceList = (choices: { id: string; label: string }[]): string => `
  <div class="arcana-choice-list" data-choice-list>
    ${choices.map((c) => `<button class="arcana-button" data-choice-id="${esc(c.id)}" type="button">${esc(c.label)}</button>`).join("")}
  </div>
`;

export const DialoguePanel = (speaker: string, text: string): string => `
  <div class="arcana-dialogue-box hero-dialogue is-visible" data-dialogue>
    <p class="arcana-dialogue-speaker">${esc(speaker)}</p>
    <p class="arcana-dialogue-text">${text}</p>
  </div>
`;

export function wireConversationEvents(root: HTMLElement, events: ConversationUiEvents): void {
  root.querySelectorAll<HTMLElement>("[data-choice-id]").forEach((node) => {
    node.addEventListener("click", () => events.onChoiceSelected?.(node.dataset.choiceId ?? ""));
  });

  root.querySelector<HTMLElement>("[data-skip]")?.addEventListener("click", () => events.onSkip?.());

  const auto = root.querySelector<HTMLInputElement>("[data-auto-advance]");
  auto?.addEventListener("change", () => events.onAutoAdvanceChanged?.(auto.checked));
}
