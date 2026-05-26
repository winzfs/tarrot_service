import { QuestionScene } from "../scenes/QuestionScene";

type AssistOption = { label: string; appendText: string };

type PatchedQuestionScene = QuestionScene & {
  __questionAssistWaitingPatchInstalled?: boolean;
  __questionAssistWaitingTimerId?: number;
  dialogueStep?: string;
  assistGuidance?: string;
  assistFollowUpQuestion?: string;
  assistOptions?: AssistOption[];
  assistSelections?: number;
  applyDialogueVisibilityForStep?: (step: string) => void;
  setPhase?: (phase: string) => void;
  refreshQuestionAssist?: () => void;
  setDialogue?: (title: string, lines: string[]) => void;
  setChoices?: (choices: unknown[]) => void;
  goDialogueStep?: (step: string) => void;
};

const MAX_ASSIST_SELECTIONS = 2;
const QUESTION_ASSIST_TIMEOUT_MS = 15000;
const FALLBACK_ASSIST_OPTIONS: AssistOption[] = [
  { label: "앞으로의 흐름", appendText: "앞으로 이 일이 어떤 흐름으로 이어질지도 알고 싶어." },
  { label: "내가 할 일", appendText: "지금 내가 취하면 좋은 태도와 다음 행동도 함께 보고 싶어." },
  { label: "막힌 이유", appendText: "현재 흐름을 막고 있는 요소가 무엇인지도 알고 싶어." },
];

function clearWaitingTimer(scene: PatchedQuestionScene): void {
  if (scene.__questionAssistWaitingTimerId !== undefined) {
    window.clearTimeout(scene.__questionAssistWaitingTimerId);
    scene.__questionAssistWaitingTimerId = undefined;
  }
}

function hasAssistOptions(scene: PatchedQuestionScene): boolean {
  return Array.isArray(scene.assistOptions) && scene.assistOptions.length > 0;
}

export function installQuestionAssistWaitingPatch(): void {
  const proto = QuestionScene.prototype as PatchedQuestionScene;
  if (proto.__questionAssistWaitingPatchInstalled) return;
  proto.__questionAssistWaitingPatchInstalled = true;

  const originalGoDialogueStep = proto.goDialogueStep;
  if (!originalGoDialogueStep) return;

  proto.goDialogueStep = function patchedGoDialogueStep(this: PatchedQuestionScene, step: string): void {
    if (step !== "refineChoice") clearWaitingTimer(this);

    if (step === "refineChoice") {
      const assistSelections = Number(this.assistSelections ?? 0);
      const isWaitingForAssist = !hasAssistOptions(this) && assistSelections < MAX_ASSIST_SELECTIONS;

      if (isWaitingForAssist) {
        this.dialogueStep = step;
        this.applyDialogueVisibilityForStep?.(step);
        this.setPhase?.("assist");
        this.refreshQuestionAssist?.();
        this.setDialogue?.("의식 2/5 · 다듬기", [
          "점술사가 질문의 결을 더듬고 있습니다...",
          "잠시만 기다려주세요. 별빛이 대답을 모으는 중입니다.",
        ]);
        this.setChoices?.([]);

        clearWaitingTimer(this);
        this.__questionAssistWaitingTimerId = window.setTimeout(() => {
          if (this.dialogueStep !== "refineChoice" || hasAssistOptions(this)) return;
          this.assistGuidance = "별빛이 잠시 흐려 기본 질문 갈래를 먼저 열었습니다.";
          this.assistFollowUpQuestion = "어느 갈래를 더 깊게 비춰볼까요?";
          this.assistOptions = FALLBACK_ASSIST_OPTIONS;
          this.refreshQuestionAssist?.();
          clearWaitingTimer(this);
          originalGoDialogueStep.call(this, "refineChoice");
        }, QUESTION_ASSIST_TIMEOUT_MS);
        return;
      }
    }

    clearWaitingTimer(this);
    originalGoDialogueStep.call(this, step);
  };
}
