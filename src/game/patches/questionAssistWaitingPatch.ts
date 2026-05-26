import { QuestionScene } from "../scenes/QuestionScene";

type PatchedQuestionScene = QuestionScene & {
  __questionAssistWaitingPatchInstalled?: boolean;
  dialogueStep?: string;
  assistOptions?: unknown[];
  assistSelections?: number;
  applyDialogueVisibilityForStep?: (step: string) => void;
  setPhase?: (phase: string) => void;
  refreshQuestionAssist?: () => void;
  setDialogue?: (title: string, lines: string[]) => void;
  setChoices?: (choices: unknown[]) => void;
  goDialogueStep?: (step: string) => void;
};

const MAX_ASSIST_SELECTIONS = 2;

export function installQuestionAssistWaitingPatch(): void {
  const proto = QuestionScene.prototype as PatchedQuestionScene;
  if (proto.__questionAssistWaitingPatchInstalled) return;
  proto.__questionAssistWaitingPatchInstalled = true;

  const originalGoDialogueStep = proto.goDialogueStep;
  if (!originalGoDialogueStep) return;

  proto.goDialogueStep = function patchedGoDialogueStep(this: PatchedQuestionScene, step: string): void {
    if (step === "refineChoice") {
      const assistOptions = Array.isArray(this.assistOptions) ? this.assistOptions : [];
      const assistSelections = Number(this.assistSelections ?? 0);
      const isWaitingForFirstAssist = assistOptions.length === 0 && assistSelections < MAX_ASSIST_SELECTIONS;

      if (isWaitingForFirstAssist) {
        this.dialogueStep = step;
        this.applyDialogueVisibilityForStep?.(step);
        this.setPhase?.("assist");
        this.refreshQuestionAssist?.();
        this.setDialogue?.("의식 2/5 · 다듬기", [
          "점술사가 질문의 결을 더듬고 있습니다...",
          "잠시만 기다려주세요. 별빛이 대답을 모으는 중입니다.",
        ]);
        this.setChoices?.([]);
        return;
      }
    }

    originalGoDialogueStep.call(this, step);
  };
}
