import Phaser from "phaser";
import { requestQuestionAssist, requestSpreadRecommendation } from "../../api/client";
import type { QuestionAssistOption } from "../../api/types";
import { DESIGN_GAME_HEIGHT, GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import type { ReadingCategory, ReadingDraft } from "../state/ReadingDraft";
import { drawMysticBackground, drawRoundedPanel } from "../ui/drawPanel";
import { addRuneRing, addSigil, addSoftGlow, playBurst, spawnTextureSparkles } from "../vfx/vfxEffects";
import {
  CHOICE_FIVE_SPREAD_ID,
  DAILY_ONE_CARD_SPREAD_ID,
  DEFAULT_SPREAD_ID,
  RELATIONSHIP_FIVE_SPREAD_ID,
  SITUATION_ADVICE_SPREAD_ID,
  getRecommendedSpreadId,
  getTarotSpread,
} from "../../tarot/spreads";
import { conversationFlowMachine } from "../flow/ConversationFlowMachine";

const DEFAULT_AI_CATEGORY: ReadingCategory = "free";
const MAX_ASSIST_SELECTIONS = 2;
const SEALING_TRANSITION_END_DELAY_MS = 3340;
const SEALING_TRANSITION_END_DURATION_MS = 420;
const SEALING_TRANSITION_FAILSAFE_BUFFER_MS = 440;
const selectableSpreadIds = [DAILY_ONE_CARD_SPREAD_ID, SITUATION_ADVICE_SPREAD_ID, DEFAULT_SPREAD_ID, RELATIONSHIP_FIVE_SPREAD_ID, CHOICE_FIVE_SPREAD_ID];
const spreadButtonLabels: Record<string, string> = {
  [DAILY_ONE_CARD_SPREAD_ID]: "한 장",
  [SITUATION_ADVICE_SPREAD_ID]: "상황",
  [DEFAULT_SPREAD_ID]: "시간",
  [RELATIONSHIP_FIVE_SPREAD_ID]: "관계",
  [CHOICE_FIVE_SPREAD_ID]: "선택",
};

type QuestionPhase = "question" | "assist" | "spread";
type VisibleGameObject = Phaser.GameObjects.GameObject & { setVisible(visible: boolean): VisibleGameObject };

type SpreadButtonView = {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  hitZone: Phaser.GameObjects.Zone;
  width: number;
  height: number;
};

type SpreadPreviewSlotView = {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  width: number;
  height: number;
};

type AssistOptionButtonView = {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  hitZone: Phaser.GameObjects.Zone;
  width: number;
  height: number;
};



type DialogueStepId = "greeting" | "askQuestion" | "confirmQuestion" | "refineIntro" | "refineChoice" | "refineResult" | "spreadThinking" | "spreadReveal" | "spreadChoice" | "sealIntro";

type DialogueChoice = { label: string; description?: string; primary?: boolean; action: () => void };
export class QuestionScene extends Phaser.Scene {
  private currentPhase: QuestionPhase = "question";
  private selectedCategory: ReadingCategory = DEFAULT_AI_CATEGORY;
  private selectedSpreadId?: string;
  private aiRecommendedSpreadId?: string;
  private aiRecommendationReason?: string;
  private aiRefinedQuestion?: string;
  private aiDetectedThemes: string[] = [];
  private assistGuidance?: string;
  private assistFollowUpQuestion?: string;
  private assistOptions: QuestionAssistOption[] = [];
  private assistSelections = 0;
  private assistRequestSeq = 0;
  private spreadRecommendationTimer?: Phaser.Time.TimerEvent;
  private spreadRecommendationSeq = 0;
  private isManualSpreadSelection = false;
  private spreadButtons: Record<string, SpreadButtonView> = {};
  private spreadPreviewSlots: SpreadPreviewSlotView[] = [];
  private assistOptionButtons: AssistOptionButtonView[] = [];
  private phaseQuestionObjects: VisibleGameObject[] = [];
  private phaseAssistObjects: VisibleGameObject[] = [];
  private phaseSpreadObjects: VisibleGameObject[] = [];
  private spreadChoiceObjects: VisibleGameObject[] = [];
  private phaseGuideText?: Phaser.GameObjects.Text;
  private questionInput?: Phaser.GameObjects.DOMElement;
  private questionPreviewText?: Phaser.GameObjects.Text;
  private warningText?: Phaser.GameObjects.Text;
  private assistGuidanceText?: Phaser.GameObjects.Text;
  private assistFollowUpText?: Phaser.GameObjects.Text;
  private assistCounterText?: Phaser.GameObjects.Text;
  private recommendedSpreadTitle?: Phaser.GameObjects.Text;
  private spreadThemeValue?: Phaser.GameObjects.Text;
  private spreadRefinedQuestionValue?: Phaser.GameObjects.Text;
  private spreadPositionValue?: Phaser.GameObjects.Text;
  private spreadReasonValue?: Phaser.GameObjects.Text;
  private nextButtonBg?: Phaser.GameObjects.Graphics;
  private nextButtonLabel?: Phaser.GameObjects.Text;
  private nextButtonHitZone?: Phaser.GameObjects.Zone;
  private backButtonBg?: Phaser.GameObjects.Graphics;
  private backButtonLabel?: Phaser.GameObjects.Text;
  private backButtonHitZone?: Phaser.GameObjects.Zone;
  private isSubmitting = false;
  private sealingTransitionFailsafe?: Phaser.Time.TimerEvent;
  private sealingTransitionHardFailsafeId?: number;
  private dialogueStep: DialogueStepId = "greeting";
  private dialogueTitleText?: Phaser.GameObjects.Text;
  private dialogueBodyText?: Phaser.GameObjects.Text;
  private choiceButtons: { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; hit: Phaser.GameObjects.Zone }[] = [];

  constructor() { super("QuestionScene"); }

  create(): void {
    try {
      conversationFlowMachine.setState("Questioning");
      this.currentPhase = "question";
    this.selectedCategory = DEFAULT_AI_CATEGORY;
    this.isSubmitting = false;
    this.sealingTransitionFailsafe?.remove(false);
    this.sealingTransitionFailsafe = undefined;
    if (this.sealingTransitionHardFailsafeId !== undefined) {
      window.clearTimeout(this.sealingTransitionHardFailsafeId);
      this.sealingTransitionHardFailsafeId = undefined;
    }
    this.selectedSpreadId = undefined;
    this.clearAiRecommendationState();
    this.clearQuestionAssistState();
    this.spreadRecommendationSeq = 0;
    this.assistRequestSeq = 0;
    this.assistSelections = 0;
    this.isManualSpreadSelection = false;
    this.spreadButtons = {};
    this.spreadPreviewSlots = [];
    this.assistOptionButtons = [];
    this.phaseQuestionObjects = [];
    this.phaseAssistObjects = [];
    this.phaseSpreadObjects = [];
    this.spreadChoiceObjects = [];

    drawMysticBackground(this, GAME_WIDTH, GAME_HEIGHT);
    this.createHeader();
    this.createFortuneTellerPanel();
    this.createPhaseGuide();
    this.createDialogueUI();
    this.createQuestionInput();
    this.createQuestionAssistPanel();
    this.createRecommendedSpreadPanel();
    this.createSpreadChoiceButtons();
    this.createNextButton();
    this.createBackButton();
    this.setPhase("question");
    this.goDialogueStep("greeting");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`QuestionScene.create failed: ${message}`);
    }
  }



  private createDialogueUI(): void {
    this.dialogueTitleText = this.add.text(sx(32), sy(258), "", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(14)}px`, color: "#f6d365", fontStyle: "bold" }).setOrigin(0, 0);
    this.dialogueBodyText = this.add.text(sx(32), sy(286), "", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(14)}px`, color: "#f8f0ff", lineSpacing: ss(6), wordWrap: { width: sx(320) } }).setOrigin(0, 0);
    const startY = DESIGN_GAME_HEIGHT - sy(194);
    for (let i = 0; i < 3; i += 1) {
      const bg = this.add.graphics().setDepth(50);
      const y = startY + i * sy(58);
      const label = this.add.text(GAME_WIDTH / 2, y, "", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(15)}px`, color: "#fff6d6", fontStyle: "bold", align: "center" }).setOrigin(0.5).setDepth(51);
      const hit = this.add.zone(GAME_WIDTH / 2, y, sx(320), sy(50)).setDepth(52);
      this.choiceButtons.push({ bg, label, hit });
    }
  }

  private setDialogue(title: string, lines: string[]): void {
    this.dialogueTitleText?.setText(title);
    this.dialogueBodyText?.setText(lines.join("\n"));
  }

  private setChoices(choices: DialogueChoice[]): void {
    this.choiceButtons.forEach((button, index) => {
      const choice = choices[index];
      button.bg.clear();
      button.hit.removeAllListeners();
      if (!choice) {
        button.label.setVisible(false);
        button.hit.disableInteractive();
        return;
      }
      const y = DESIGN_GAME_HEIGHT - sy(194) + index * sy(58);
      const width = sx(300), height = sy(46), x = GAME_WIDTH / 2;
      button.bg.fillStyle(choice.primary ? 0x2a1a58 : 0x1b1238, 0.94);
      button.bg.fillRoundedRect(x - width / 2, y - height / 2, width, height, ss(14));
      button.bg.lineStyle(ss(2), choice.primary ? 0xf6d365 : 0x6d4aff, choice.primary ? 0.95 : 0.6);
      button.bg.strokeRoundedRect(x - width / 2, y - height / 2, width, height, ss(14));
      button.label.setText(choice.label).setVisible(true);
      button.hit.setInteractive({ useHandCursor: true });
      button.hit.once("pointerdown", choice.action);
    });
  }

  private goDialogueStep(step: DialogueStepId): void {
    this.dialogueStep = step;
    if (step === "greeting") {
      this.setPhase("question");
      this.setDialogue("의식 1/5 · 인사", ["어서 오세요, 여행자여.", "먼저 별빛에 질문을 속삭여주세요."]);
      this.questionInput?.setVisible(false);
      this.setChoices([{ label: "질문을 별빛에 속삭인다", primary: true, action: () => this.goDialogueStep("askQuestion") }]);
      return;
    }
    if (step === "askQuestion") {
      this.setPhase("question");
      this.questionInput?.setVisible(true);
      this.setDialogue("의식 1/5 · 질문", ["긴 설명은 필요 없습니다.", "지금 가장 중요한 물음 한 줄이면 충분해요."]);
      this.setChoices([{ label: "이 질문을 건넨다", primary: true, action: () => this.handleAskQuestionSubmit() }]);
      return;
    }
    if (step === "confirmQuestion") {
      const q = this.getCurrentQuestionText();
      this.setDialogue("의식 2/5 · 확인", ["좋아요. 이 질문으로 문을 열까요?", `“${q.slice(0, 64)}${q.length > 64 ? "…" : ""}”`]);
      this.setChoices([
        { label: "이대로 묻는다", primary: true, action: () => this.goDialogueStep("refineIntro") },
        { label: "다시 적는다", action: () => this.goDialogueStep("askQuestion") },
      ]);
      return;
    }
    if (step === "refineIntro") {
      this.setPhase("assist");
      this.setDialogue("의식 2/5 · 다듬기", ["질문을 한 갈래 더 선명하게 만들 수 있어요.", "점술사의 물음을 들을까요?"]);
      this.setChoices([
        { label: "점술사의 질문을 듣는다", primary: true, action: () => { this.requestQuestionAssistForCurrentQuestion(); this.goDialogueStep("refineChoice"); } },
        { label: "바로 배열을 청한다", action: () => this.goDialogueStep("spreadThinking") },
      ]);
      return;
    }
    if (step === "refineChoice") {
      this.setDialogue("의식 2/5 · 선택", [this.assistFollowUpQuestion ?? "어느 갈래를 더 깊게 비춰볼까요?"]);
      const choices = this.assistOptions.slice(0,3).map((opt, idx)=>({label: opt.label, primary: idx===0, action: ()=>{this.applyAssistOption(idx); this.goDialogueStep("refineResult");}}));
      this.setChoices(choices.length ? choices : [{label:"별의 배열을 청한다", primary:true, action:()=>this.goDialogueStep("spreadThinking")}]);
      return;
    }
    if (step === "refineResult") {
      this.setDialogue("의식 3/5 · 정리", ["좋아요. 카드가 바라볼 방향이 또렷해졌습니다.", "한 갈래 더 정하거나, 배열을 청할 수 있어요."]);
      this.setChoices([
        { label: "한 갈래 더 정한다", primary: true, action: () => this.goDialogueStep("refineChoice") },
        { label: "별의 배열을 청한다", action: () => this.goDialogueStep("spreadThinking") },
      ]);
      return;
    }
    if (step === "spreadThinking") {
      this.goToSpreadPhase();
      this.setDialogue("의식 3/5 · 별의 저울", ["별들이 질문의 무게를 재고 있습니다...", "점술사가 가장 어울리는 문을 고르고 있어요."]);
      this.setChoices([]);
      this.time.delayedCall(820, () => {
        if (this.dialogueStep === "spreadThinking") this.goDialogueStep("spreadReveal");
      });
      return;
    }
    if (step === "spreadReveal") {
      const spreadId = this.selectedSpreadId ?? this.aiRecommendedSpreadId ?? getRecommendedSpreadId(DEFAULT_AI_CATEGORY, this.getCurrentQuestionText());
      const spread = getTarotSpread(spreadId);
      this.setDialogue("의식 3/5 · 배열 제안", [`${spread.name} (${spread.cardsToDraw}장)`, (this.aiRecommendationReason ?? "질문에 맞는 문이 열렸습니다.").slice(0, 64)]);
      this.setChoices([
        { label: "이 배열을 받아들인다", primary: true, action: () => this.goDialogueStep("sealIntro") },
        { label: "다른 배열을 살펴본다", action: () => this.goDialogueStep("spreadChoice") },
      ]);
      return;
    }
    if (step === "spreadChoice") {
      this.setDialogue("의식 3/5 · 다른 문", ["원한다면 다른 배열의 문을 직접 고를 수 있습니다."]);
      this.setChoices([
        { label: "오늘의 한 장 · 1장", action: ()=>{this.selectedSpreadId = DAILY_ONE_CARD_SPREAD_ID; this.isManualSpreadSelection = true; this.refreshRecommendedSpread(); this.goDialogueStep("spreadReveal");} },
        { label: "시간의 세 문 · 3장", primary: true, action: ()=>{this.selectedSpreadId = DEFAULT_SPREAD_ID; this.isManualSpreadSelection = true; this.refreshRecommendedSpread(); this.goDialogueStep("spreadReveal");} },
        { label: "관계의 거울 · 5장", action: ()=>{this.selectedSpreadId = RELATIONSHIP_FIVE_SPREAD_ID; this.isManualSpreadSelection = true; this.refreshRecommendedSpread(); this.goDialogueStep("spreadReveal");} },
      ]);
      return;
    }
    if (step === "sealIntro") {
      this.setDialogue("의식 4/5 · 봉인", ["이제 질문을 별빛에 봉인하겠습니다.", "봉인이 열리면 카드가 순서대로 말을 시작합니다."]);
      this.setChoices([
        { label: "질문을 별빛에 봉인한다", primary: true, action: () => this.submitQuestion() },
        { label: "질문을 다시 다듬는다", action: () => this.goDialogueStep("refineIntro") },
      ]);
    }
  }

  private handleAskQuestionSubmit(): void {
    const question = this.getCurrentQuestionText();
    if (question.length < 3) {
      this.warningText?.setText("아직 별빛이 말을 붙잡지 못했어요. 조금만 더 속삭여주세요.");
      return;
    }
    this.warningText?.setText("");
    this.goDialogueStep("confirmQuestion");
  }

  private trackQuestionObject<T extends VisibleGameObject>(object: T): T { this.phaseQuestionObjects.push(object); return object; }
  private trackAssistObject<T extends VisibleGameObject>(object: T): T { this.phaseAssistObjects.push(object); return object; }
  private trackSpreadObject<T extends VisibleGameObject>(object: T): T { this.phaseSpreadObjects.push(object); return object; }
  private trackSpreadChoiceObject<T extends VisibleGameObject>(object: T): T { this.phaseSpreadObjects.push(object); this.spreadChoiceObjects.push(object); return object; }

  private clearAiRecommendationState(): void {
    this.aiRecommendedSpreadId = undefined;
    this.aiRecommendationReason = undefined;
    this.aiRefinedQuestion = undefined;
    this.aiDetectedThemes = [];
  }

  private clearQuestionAssistState(): void {
    this.assistGuidance = undefined;
    this.assistFollowUpQuestion = undefined;
    this.assistOptions = [];
  }

  private createHeader(): void {
    this.add.text(GAME_WIDTH / 2, sy(44), "속삭임의 방", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${ss(30)}px`,
      color: "#f8f0ff",
      stroke: "#2c174f",
      strokeThickness: ss(5),
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, sy(74), "의식 1/5부터 3/5까지, 점술사와 대화하며 질문의 문을 엽니다.", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(12)}px`,
      color: "#cdbdff",
      align: "center",
    }).setOrigin(0.5);
  }

  private createFortuneTellerPanel(): void {
    drawRoundedPanel(this, sx(24), sy(102), GAME_WIDTH - sx(48), sy(116), ss(18));
    this.add.circle(sx(60), sy(138), ss(22), 0x6d4aff, 0.22).setStrokeStyle(ss(2), 0xf6d365, 0.76);
    this.add.text(sx(60), sy(138), "✦", { fontSize: `${ss(21)}px`, color: "#fff6d6" }).setOrigin(0.5);
    this.add.text(sx(94), sy(122), "점술사", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(14)}px`, color: "#f6d365", fontStyle: "bold" }).setOrigin(0, 0.5);
    this.add.text(sx(94), sy(146), "짧게 적어도 괜찮습니다.\n제가 최대 두 번 더 물어보고 질문을 선명하게 다듬어드릴게요.", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(13)}px`,
      color: "#f8f0ff",
      lineSpacing: ss(5),
      wordWrap: { width: sx(246) },
    }).setOrigin(0, 0);
  }

  private createPhaseGuide(): void {
    this.phaseGuideText = this.add.text(GAME_WIDTH / 2, sy(244), "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(13)}px`,
      color: "#d9c8ff",
      align: "center",
      lineSpacing: ss(4),
      wordWrap: { width: sx(310) },
    }).setOrigin(0.5);
  }

  private createQuestionInput(): void {
    this.trackQuestionObject(this.add.text(sx(28), sy(302), "별빛에 속삭일 질문", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(15)}px`, color: "#f6d365", fontStyle: "bold" }).setOrigin(0, 0.5));
    this.trackQuestionObject(this.add.text(sx(28), sy(328), "예: 요즘 연락이 뜸한데, 이 관계가 어떻게 흘러갈지 궁금해.", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(11)}px`, color: "#bfb0ef", wordWrap: { width: sx(310) } }).setOrigin(0, 0));

    const textarea = document.createElement("textarea");
    textarea.className = "arcana-question-input";
    textarea.maxLength = 500;
    textarea.placeholder = "지금 가장 궁금한 일을 자유롭게 적어주세요.";
    textarea.addEventListener("input", () => {
      this.warningText?.setText("");
      this.clearAiRecommendationState();
      this.clearQuestionAssistState();
      this.selectedSpreadId = undefined;
      this.isManualSpreadSelection = false;
      this.assistSelections = 0;
      this.refreshQuestionAssist();
      if (this.dialogueStep === "refineChoice") this.goDialogueStep("refineChoice");
      this.refreshRecommendedSpread();
      this.updateNextButtonVisibility();
    });

    this.questionInput = this.trackQuestionObject(this.add.dom(GAME_WIDTH / 2, sy(440), textarea).setOrigin(0.5));
    this.warningText = this.trackQuestionObject(this.add.text(GAME_WIDTH / 2, sy(534), "", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(12)}px`, color: "#ffb6c8", align: "center" }).setOrigin(0.5));
  }

  private createQuestionAssistPanel(): void {
    const previewBg = this.trackAssistObject(this.add.graphics());
    previewBg.fillStyle(0x1b1238, 0.76);
    previewBg.fillRoundedRect(sx(22), sy(276), GAME_WIDTH - sx(44), sy(136), ss(20));
    previewBg.lineStyle(ss(2), 0x6d4aff, 0.44);
    previewBg.strokeRoundedRect(sx(22), sy(276), GAME_WIDTH - sx(44), sy(136), ss(20));
    this.trackAssistObject(this.add.text(sx(46), sy(298), "현재 질문", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(14)}px`, color: "#f6d365", fontStyle: "bold" }).setOrigin(0, 0));
    this.questionPreviewText = this.trackAssistObject(this.add.text(sx(46), sy(334), "", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(14)}px`, color: "#f8f0ff", lineSpacing: ss(5), wordWrap: { width: sx(300) } }).setOrigin(0, 0));

    const panelBg = this.trackAssistObject(this.add.graphics());
    panelBg.fillStyle(0x1b1238, 0.88);
    panelBg.fillRoundedRect(sx(22), sy(424), GAME_WIDTH - sx(44), sy(288), ss(20));
    panelBg.lineStyle(ss(2), 0x6d4aff, 0.54);
    panelBg.strokeRoundedRect(sx(22), sy(424), GAME_WIDTH - sx(44), sy(288), ss(20));
    this.assistGuidanceText = this.trackAssistObject(this.add.text(sx(46), sy(446), "점술사가 질문의 결을 더듬고 있습니다...", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(13)}px`, color: "#d9c8ff", lineSpacing: ss(5), wordWrap: { width: sx(300) } }).setOrigin(0, 0));
    this.assistFollowUpText = this.trackAssistObject(this.add.text(sx(46), sy(502), "좋아, 어느 갈래를 더 깊게 비춰볼까요?", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(16)}px`, color: "#fff6d6", fontStyle: "bold", lineSpacing: ss(5), wordWrap: { width: sx(300) } }).setOrigin(0, 0));
    this.assistCounterText = this.trackAssistObject(this.add.text(sx(46), sy(546), "선택 0 / 2", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(12)}px`, color: "#bfb0ef" }).setOrigin(0, 0));

    const startY = sy(582);
    for (let index = 0; index < 3; index += 1) this.assistOptionButtons.push(this.createAssistOptionButton(index, sx(46), startY + index * sy(38), sx(276), sy(32)));
  }

  private createAssistOptionButton(index: number, x: number, y: number, width: number, height: number): AssistOptionButtonView {
    const container = this.trackAssistObject(this.add.container(x, y));
    const bg = this.add.graphics();
    const label = this.add.text(width / 2, height / 2, "", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(12)}px`, color: "#f8f0ff", fontStyle: "bold" }).setOrigin(0.5);
    container.add([bg, label]);
    const hitZone = this.trackAssistObject(this.add.zone(x + width / 2, y + height / 2, width + sx(22), height + sy(16)).setInteractive({ useHandCursor: true }));
    hitZone.on("pointerdown", () => this.applyAssistOption(index));
    return { container, bg, label, hitZone, width, height };
  }

  private refreshQuestionAssist(): void {
    const assistLimitReached = this.assistSelections >= MAX_ASSIST_SELECTIONS;
    this.questionPreviewText?.setText(this.getCurrentQuestionText());
    this.assistGuidanceText?.setText(assistLimitReached ? "질문이 충분히 선명해졌습니다. 이제 배열 추천으로 넘어갈 수 있어요." : this.assistGuidance ?? "점술사가 질문의 결을 더듬고 있습니다...");
    this.assistFollowUpText?.setText(assistLimitReached ? "이 질문으로 배열을 추천받아볼까요?" : this.assistFollowUpQuestion ?? "좋아, 어느 갈래를 더 깊게 비춰볼까요?");
    this.assistCounterText?.setText(`선택 ${Math.min(this.assistSelections, MAX_ASSIST_SELECTIONS)} / ${MAX_ASSIST_SELECTIONS}`);
    this.assistOptionButtons.forEach((button, index) => {
      const option = this.assistOptions[index];
      const visible = this.currentPhase === "assist" && !!option && !assistLimitReached;
      button.bg.clear();
      if (visible) {
        button.bg.fillStyle(0x26184f, 0.88);
        button.bg.fillRoundedRect(0, 0, button.width, button.height, ss(11));
        button.bg.lineStyle(ss(2), 0xf6d365, 0.68);
        button.bg.strokeRoundedRect(0, 0, button.width, button.height, ss(11));
        button.label.setText(option.label);
      } else button.label.setText("");
      button.container.setVisible(visible);
      button.hitZone.setVisible(visible);
    });
    this.updateNextButtonVisibility();
  }

  private applyAssistOption(index: number): void {
    if (this.assistSelections >= MAX_ASSIST_SELECTIONS) return;
    const option = this.assistOptions[index];
    const node = this.questionInput?.node as HTMLTextAreaElement | undefined;
    if (!option || !node) return;
    const current = node.value.trim();
    node.value = `${current}${current.endsWith(".") || current.endsWith("?") || current.endsWith("!") ? " " : ". "}${option.appendText}`;
    this.assistSelections += 1;
    this.selectedSpreadId = undefined;
    this.clearAiRecommendationState();
    this.clearQuestionAssistState();
    this.isManualSpreadSelection = false;
    this.assistRequestSeq += 1;
    this.refreshQuestionAssist();
    this.updateNextButtonVisibility();
    if (this.assistSelections < MAX_ASSIST_SELECTIONS) this.requestQuestionAssistForCurrentQuestion();
  }

  private requestQuestionAssistForCurrentQuestion(): void {
    if (this.currentPhase !== "assist" || this.isSubmitting || this.assistSelections >= MAX_ASSIST_SELECTIONS) return;
    const question = this.getCurrentQuestionText();
    if (question.length < 3) return;
    const requestSeq = ++this.assistRequestSeq;
    void this.fetchQuestionAssist(question, requestSeq);
  }

  private async fetchQuestionAssist(question: string, requestSeq: number): Promise<Response | void> {
    try {
      const assist = await requestQuestionAssist({ question });
      if (requestSeq !== this.assistRequestSeq) return;
      if (this.currentPhase !== "assist" || this.isSubmitting || this.assistSelections >= MAX_ASSIST_SELECTIONS) return;
      if (question !== this.getCurrentQuestionText()) return;
      this.assistGuidance = assist.guidance;
      this.assistFollowUpQuestion = assist.followUpQuestion;
      this.assistOptions = Array.isArray(assist.assistOptions) ? assist.assistOptions.slice(0, 3) : [];
      this.refreshQuestionAssist();
      if (this.dialogueStep === "refineChoice") this.goDialogueStep("refineChoice");
    } catch {
      if (requestSeq !== this.assistRequestSeq) return;
      this.assistGuidance = "질문을 조금 더 선명하게 만들 수 있어요.";
      this.assistFollowUpQuestion = "좋아, 어느 갈래를 더 깊게 비춰볼까요?";
      this.assistOptions = [
        { label: "앞으로의 흐름", appendText: "앞으로 이 일이 어떤 흐름으로 이어질지도 알고 싶어." },
        { label: "내가 할 일", appendText: "지금 내가 취하면 좋은 태도와 다음 행동도 함께 보고 싶어." },
        { label: "막힌 이유", appendText: "현재 흐름을 막고 있는 요소가 무엇인지도 알고 싶어." },
      ];
      this.refreshQuestionAssist();
      if (this.dialogueStep === "refineChoice") this.goDialogueStep("refineChoice");
    }
  }

  private createRecommendedSpreadPanel(): void {
    const panelBg = this.trackSpreadObject(this.add.graphics());
    panelBg.fillStyle(0x1b1238, 0.94);
    panelBg.fillRoundedRect(sx(20), sy(104), GAME_WIDTH - sx(40), sy(530), ss(22));
    panelBg.lineStyle(ss(2), 0x6d4aff, 0.6);
    panelBg.strokeRoundedRect(sx(20), sy(104), GAME_WIDTH - sx(40), sy(530), ss(22));

    this.recommendedSpreadTitle = this.trackSpreadObject(this.add.text(sx(46), sy(132), "", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(22)}px`, color: "#fff6d6", fontStyle: "bold" }).setOrigin(0, 0));
    this.createSpreadPreviewSlots();
    this.spreadThemeValue = this.createSpreadInfoRow("읽힌 기운", sy(230));
    this.spreadRefinedQuestionValue = this.createSpreadInfoRow("다듬은 질문", sy(306));
    this.spreadPositionValue = this.createSpreadInfoRow("위치", sy(410));
    this.spreadReasonValue = this.createSpreadInfoRow("추천 이유", sy(500));
  }

  private createSpreadPreviewSlots(): void {
    const maxSlots = 5;
    const slotWidth = sx(56);
    const slotHeight = sy(46);
    const gap = sx(6);
    const totalWidth = maxSlots * slotWidth + (maxSlots - 1) * gap;
    const startX = GAME_WIDTH / 2 - totalWidth / 2;
    const y = sy(170);
    for (let index = 0; index < maxSlots; index += 1) {
      const container = this.trackSpreadObject(this.add.container(startX + index * (slotWidth + gap), y));
      const bg = this.add.graphics();
      const label = this.add.text(slotWidth / 2, slotHeight / 2, "", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(10)}px`, color: "#fff6d6", fontStyle: "bold", align: "center", wordWrap: { width: slotWidth - sx(6) } }).setOrigin(0.5);
      container.add([bg, label]);
      this.spreadPreviewSlots.push({ container, bg, label, width: slotWidth, height: slotHeight });
    }
  }

  private createSpreadInfoRow(label: string, y: number): Phaser.GameObjects.Text {
    this.trackSpreadObject(this.add.text(sx(46), y, `${label} :`, { fontFamily: "system-ui, sans-serif", fontSize: `${ss(15)}px`, color: "#f6d365", fontStyle: "bold" }).setOrigin(0, 0));
    return this.trackSpreadObject(this.add.text(sx(46), y + sy(24), "", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(14)}px`, color: "#d9c8ff", lineSpacing: ss(5), wordWrap: { width: sx(300) } }).setOrigin(0, 0));
  }

  private createSpreadChoiceButtons(): void {
    this.trackSpreadChoiceObject(this.add.text(sx(24), sy(648), "다른 별의 문을 살펴본다", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(14)}px`, color: "#f6d365", fontStyle: "bold" }).setOrigin(0, 0.5));
    const buttonWidth = sx(104), buttonHeight = sy(40), touchWidth = sx(114), touchHeight = sy(52), startX = sx(24), startY = sy(672), gapX = sx(8), gapY = sy(8);
    selectableSpreadIds.forEach((spreadId, index) => {
      const col = index % 3, row = Math.floor(index / 3), x = startX + col * (buttonWidth + gapX), y = startY + row * (buttonHeight + gapY);
      const button = this.createSpreadButton(spreadId, x, y, buttonWidth, buttonHeight, touchWidth, touchHeight);
      this.spreadButtons[spreadId] = button;
    });
  }

  private createSpreadButton(spreadId: string, x: number, y: number, width: number, height: number, touchWidth: number, touchHeight: number): SpreadButtonView {
    const container = this.trackSpreadChoiceObject(this.add.container(x, y));
    const bg = this.add.graphics();
    const label = this.add.text(width / 2, height / 2, spreadButtonLabels[spreadId] ?? getTarotSpread(spreadId).name, { fontFamily: "system-ui, sans-serif", fontSize: `${ss(12)}px`, color: "#f8f0ff", fontStyle: "bold" }).setOrigin(0.5);
    container.add([bg, label]);
    const hitZone = this.trackSpreadChoiceObject(this.add.zone(x + width / 2, y + height / 2, touchWidth, touchHeight).setInteractive({ useHandCursor: true }));
    hitZone.on("pointerdown", () => {
      if (this.currentPhase !== "spread" || !this.aiRecommendedSpreadId) return;
      this.selectedSpreadId = spreadId;
      this.isManualSpreadSelection = true;
      this.spreadRecommendationTimer?.remove(false);
      this.refreshRecommendedSpread();
    });
    return { container, bg, label, hitZone, width, height };
  }

  private refreshSpreadButtons(activeSpreadId: string): void {
    const showManualSpreadChoices = this.currentPhase === "spread" && !!this.aiRecommendedSpreadId;
    this.spreadChoiceObjects.forEach((object) => object.setVisible(showManualSpreadChoices));
    selectableSpreadIds.forEach((spreadId) => {
      const button = this.spreadButtons[spreadId];
      if (!button) return;
      const selected = spreadId === activeSpreadId;
      button.bg.clear();
      if (showManualSpreadChoices) {
        button.bg.fillStyle(selected ? 0x6d4aff : 0x1b1238, selected ? 0.88 : 0.76);
        button.bg.fillRoundedRect(0, 0, button.width, button.height, ss(12));
        button.bg.lineStyle(ss(2), selected ? 0xf6d365 : 0x6d4aff, selected ? 0.94 : 0.5);
        button.bg.strokeRoundedRect(0, 0, button.width, button.height, ss(12));
      }
      button.label.setColor(selected ? "#fff6d6" : "#f8f0ff");
    });
    this.updateNextButtonVisibility();
  }

  private refreshSpreadPreview(spreadId: string, showPreview: boolean): void {
    const spread = getTarotSpread(spreadId);
    this.spreadPreviewSlots.forEach((slot, index) => {
      const position = spread.positions[index];
      const visible = this.currentPhase === "spread" && showPreview && !!position;
      slot.bg.clear();
      slot.container.setVisible(visible);
      slot.label.setText("");
      if (!visible || !position) return;
      slot.bg.fillStyle(0x26184f, 0.86);
      slot.bg.fillRoundedRect(0, 0, slot.width, slot.height, ss(10));
      slot.bg.lineStyle(ss(2), 0xf6d365, 0.72);
      slot.bg.strokeRoundedRect(0, 0, slot.width, slot.height, ss(10));
      slot.label.setText(position.label);
    });
  }

  private refreshRecommendedSpread(): void {
    const question = this.getCurrentQuestionText();
    const hasAiRecommendation = !!this.aiRecommendedSpreadId;
    const spreadId = this.selectedSpreadId ?? this.aiRecommendedSpreadId ?? getRecommendedSpreadId(DEFAULT_AI_CATEGORY, question);
    const spread = getTarotSpread(spreadId);
    const positionLabels = spread.positions.map((position) => position.label).join(" · ");
    const reason = this.getRecommendationReason(question);
    const refinedQuestion = this.getRefinedQuestionText(question);
    const themes = this.getDetectedThemeText();
    this.recommendedSpreadTitle?.setText(hasAiRecommendation ? `${spread.name} (${spread.cardsToDraw}장)` : "점술사가 별자리의 결을 읽는 중...");
    this.spreadThemeValue?.setText(hasAiRecommendation ? themes : "질문 전체의 맥락을 읽고 있습니다.");
    this.spreadRefinedQuestionValue?.setText(hasAiRecommendation ? refinedQuestion : "추천 배열이 열리면, 다른 별의 문도 함께 살펴볼 수 있습니다.");
    this.spreadPositionValue?.setText(hasAiRecommendation ? positionLabels : "별빛이 위치를 정렬하는 중");
    this.spreadReasonValue?.setText(hasAiRecommendation ? reason : "잠시만 기다려주세요.");
    this.refreshSpreadPreview(spread.id, hasAiRecommendation);
    this.refreshSpreadButtons(spread.id);
  }

  private getRefinedQuestionText(question: string): string { if (this.isManualSpreadSelection) return question; if (this.aiRefinedQuestion) return this.aiRefinedQuestion; return question; }
  private getDetectedThemeText(): string { if (this.isManualSpreadSelection) return "직접 선택"; if (this.aiDetectedThemes.length > 0) return this.aiDetectedThemes.join(" · "); return "촛불 위에서 확인 중"; }
  private getRecommendationReason(question: string): string { if (this.isManualSpreadSelection) return "여행자가 직접 고른 별의 문입니다."; if (this.aiRecommendationReason) return this.aiRecommendationReason; if (question.length >= 3) return "점술사가 질문 전체의 흐름을 읽고 있습니다."; return "질문을 속삭이면 점술사가 어울리는 별의 문을 제안합니다."; }

  private scheduleAiSpreadRecommendation(): void {
    if (this.currentPhase !== "spread" || this.isManualSpreadSelection || this.isSubmitting) return;
    const question = this.getCurrentQuestionText();
    if (question.length < 3) return;
    this.spreadRecommendationTimer?.remove(false);
    const requestSeq = ++this.spreadRecommendationSeq;
    const category = DEFAULT_AI_CATEGORY;
    this.spreadRecommendationTimer = this.time.delayedCall(720, () => void this.fetchAiSpreadRecommendation(category, question, requestSeq));
  }

  private async fetchAiSpreadRecommendation(category: ReadingCategory, question: string, requestSeq: number): Promise<void> {
    try {
      const recommendation = await requestSpreadRecommendation({ category, question });
      if (requestSeq !== this.spreadRecommendationSeq) return;
      if (this.currentPhase !== "spread" || this.isManualSpreadSelection || this.isSubmitting) return;
      if (question !== this.getCurrentQuestionText()) return;
      this.aiRecommendedSpreadId = recommendation.spreadId;
      this.aiRecommendationReason = recommendation.reason;
      this.aiRefinedQuestion = recommendation.refinedQuestion;
      this.aiDetectedThemes = Array.isArray(recommendation.detectedThemes) ? recommendation.detectedThemes.slice(0, 4) : [];
      this.refreshRecommendedSpread();
    } catch {
      if (requestSeq !== this.spreadRecommendationSeq) return;
      if (this.currentPhase !== "spread" || this.isManualSpreadSelection || this.isSubmitting) return;
      this.aiRecommendedSpreadId = getRecommendedSpreadId(DEFAULT_AI_CATEGORY, question);
      this.aiRecommendationReason = "별빛이 흐려 기본 의식으로 가장 안정적인 배열을 먼저 열었습니다.";
      this.aiRefinedQuestion = question;
      this.aiDetectedThemes = ["현재 흐름", "가능성", "조언"];
      this.refreshRecommendedSpread();
    }
  }

  private getCurrentQuestionText(): string { const node = this.questionInput?.node as HTMLTextAreaElement | undefined; return node?.value.trim() ?? ""; }
  private shouldShowNextButton(): boolean { if (this.currentPhase === "assist") return this.assistSelections > 0; if (this.currentPhase === "spread") return !!this.aiRecommendedSpreadId; return true; }
  private updateNextButtonVisibility(): void {
    // 대화형 선택 버튼 시스템으로 통일: 기존 하단 next 버튼은 항상 숨긴다.
    this.nextButtonBg?.setVisible(false);
    this.nextButtonLabel?.setVisible(false);
    this.nextButtonHitZone?.setVisible(false);
    this.nextButtonHitZone?.disableInteractive();
  }

  private createNextButton(): void {
    const width = sx(264), height = sy(50), x = GAME_WIDTH / 2, y = DESIGN_GAME_HEIGHT - sy(42);
    this.nextButtonBg = this.add.graphics();
    this.nextButtonBg.fillStyle(0x1b1238, 0.94);
    this.nextButtonBg.fillRoundedRect(x - width / 2, y - height / 2, width, height, ss(16));
    this.nextButtonBg.lineStyle(ss(3), 0xf6d365, 0.9);
    this.nextButtonBg.strokeRoundedRect(x - width / 2, y - height / 2, width, height, ss(16));
    this.nextButtonLabel = this.add.text(x, y, "", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(16)}px`, color: "#fff6d6", fontStyle: "bold" }).setOrigin(0.5);
    this.nextButtonHitZone = this.add.zone(x, y, width + sx(44), height + sy(28)).setInteractive({ useHandCursor: true });
    this.nextButtonHitZone.on("pointerdown", () => this.handlePrimaryAction());
  }

  private createBackButton(): void {
    const x = sx(18), y = sy(18), size = sx(44);
    this.backButtonBg = this.add.graphics().setDepth(20);
    this.backButtonLabel = this.add.text(x + size / 2, y + size / 2, "←", { fontFamily: "system-ui, sans-serif", fontSize: `${ss(24)}px`, color: "#fff6d6", fontStyle: "bold" }).setOrigin(0.5).setDepth(21);
    this.backButtonHitZone = this.add.zone(x + size / 2, y + size / 2, size + sx(14), size + sy(14)).setInteractive({ useHandCursor: true }).setDepth(22);
    this.backButtonHitZone.on("pointerdown", () => this.handleBackAction());
  }

  private updateBackButton(): void {
    if (!this.backButtonBg || !this.backButtonLabel || !this.backButtonHitZone) return;
    const visible = false, x = sx(18), y = sy(18), size = sx(44);
    this.backButtonBg.clear();
    if (visible) {
      this.backButtonBg.fillStyle(0x1b1238, 0.82);
      this.backButtonBg.fillRoundedRect(x, y, size, size, ss(14));
      this.backButtonBg.lineStyle(ss(2), 0xf6d365, 0.52);
      this.backButtonBg.strokeRoundedRect(x, y, size, size, ss(14));
    }
    this.backButtonBg.setVisible(visible);
    this.backButtonLabel.setVisible(visible);
    this.backButtonHitZone.setVisible(visible);
  }

  private handleBackAction(): void { if (this.currentPhase === "spread") { this.spreadRecommendationTimer?.remove(false); this.setPhase("assist"); return; } if (this.currentPhase === "assist") { this.assistRequestSeq += 1; this.setPhase("question"); } }
  private handlePrimaryAction(): void { if (!this.shouldShowNextButton()) return; if (this.currentPhase === "question") { this.handleAskQuestionSubmit(); return; } if (this.currentPhase === "assist") { this.goDialogueStep("spreadThinking"); return; } this.goDialogueStep("sealIntro"); }

  private goToAssistPhase(): void {
    const question = this.getCurrentQuestionText();
    if (question.length < 3) { this.warningText?.setText("별빛이 질문을 들을 수 있도록 한 줄만 더 속삭여주세요."); return; }
    this.warningText?.setText("");
    this.selectedCategory = DEFAULT_AI_CATEGORY;
    this.selectedSpreadId = undefined;
    this.clearAiRecommendationState();
    this.clearQuestionAssistState();
    this.isManualSpreadSelection = false;
    this.assistSelections = 0;
    this.assistRequestSeq += 1;
    (this.questionInput?.node as HTMLTextAreaElement | undefined)?.blur();
    this.setPhase("assist");
    this.refreshQuestionAssist();
    this.requestQuestionAssistForCurrentQuestion();
  }

  private goToSpreadPhase(): void {
    const question = this.getCurrentQuestionText();
    if (question.length < 3) { this.setPhase("question"); this.warningText?.setText("별빛이 질문을 들을 수 있도록 한 줄만 더 속삭여주세요."); return; }
    this.selectedCategory = DEFAULT_AI_CATEGORY;
    this.selectedSpreadId = undefined;
    this.clearAiRecommendationState();
    this.isManualSpreadSelection = false;
    this.spreadRecommendationSeq += 1;
    this.setPhase("spread");
    this.refreshRecommendedSpread();
    this.scheduleAiSpreadRecommendation();
  }

  private setPhase(phase: QuestionPhase): void {
    this.currentPhase = phase;
    const isQuestionPhase = phase === "question", isAssistPhase = phase === "assist", isSpreadPhase = phase === "spread";
    this.phaseQuestionObjects.forEach((object) => object.setVisible(isQuestionPhase));
    this.phaseAssistObjects.forEach((object) => object.setVisible(isAssistPhase));
    this.phaseSpreadObjects.forEach((object) => object.setVisible(isSpreadPhase));
    if (isQuestionPhase) { this.phaseGuideText?.setText("의식 1/5 · 질문을 정하다"); this.nextButtonLabel?.setText("이 질문을 건넨다"); }
    else if (isAssistPhase) { this.phaseGuideText?.setText("의식 2/5 · 질문의 결을 다듬다"); this.nextButtonLabel?.setText("별의 배열을 청한다"); this.refreshQuestionAssist(); }
    else { this.phaseGuideText?.setText("의식 3/5 · 별의 배열을 받다"); this.nextButtonLabel?.setText("질문을 별빛에 봉인한다"); this.refreshRecommendedSpread(); }
    this.updateBackButton();
    this.updateNextButtonVisibility();
  }

  private submitQuestion(): void {
    if (this.isSubmitting) return;
    const node = this.questionInput?.node as HTMLTextAreaElement | undefined;
    const question = node?.value.trim() ?? "";
    if (question.length < 3) { this.warningText?.setText("별빛이 질문을 들을 수 있도록 한 줄만 더 속삭여주세요."); this.setPhase("question"); return; }
    this.isSubmitting = true;
    this.spreadRecommendationTimer?.remove(false);
    const draft: ReadingDraft = { category: DEFAULT_AI_CATEGORY, question, spreadId: this.selectedSpreadId ?? this.aiRecommendedSpreadId ?? getRecommendedSpreadId(DEFAULT_AI_CATEGORY, question) };
    node?.blur();
    this.warningText?.setText("");
    this.playSealingTransition(question, draft);
  }

  private getSealingPaperHeight(question: string): number { const estimatedLines = Math.max(2, Math.ceil(question.length / 24)); return sy(92) + sy(Math.min(5, estimatedLines - 2) * 24); }

  private playSealingTransition(question: string, draft: ReadingDraft): void {
    conversationFlowMachine.setState("Sealing");
    this.questionInput?.setVisible(false);
    const spread = getTarotSpread(draft.spreadId);
    const spreadGuide = spread.cardsToDraw === 1 ? "접힌 기도문은 이제 한 장의 카드에게 전해집니다." : `접힌 기도문은 이제 ${spread.name}의 카드들에게 전해집니다.`;
    const darkness = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x010008, 1).setDepth(99).setAlpha(0);
    const veil = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x03020a, 0).setDepth(100);
    const vignette = this.add.graphics().setDepth(101).setAlpha(0);
    vignette.fillGradientStyle(0x000000, 0x000000, 0x080313, 0x080313, 1, 1, 0.82, 0.82);
    vignette.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const centerX = GAME_WIDTH / 2, centerY = sy(432);
    const sealGlow = addSoftGlow(this, centerX, centerY, 104, 0.78);
    const sealRing = addRuneRing(this, centerX, centerY, 105, 0.48);
    const sealMark = addSigil(this, centerX, centerY, 106, 0.56);
    const paperHeight = this.getSealingPaperHeight(question);
    const prayerStartY = sy(330) + Math.max(0, paperHeight - sy(102)) / 2;
    const title = this.add.text(GAME_WIDTH / 2, sy(232), "기도문이 별빛에 접힙니다", { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${ss(31)}px`, color: "#fff6d6", align: "center", stroke: "#2c174f", strokeThickness: ss(5) }).setOrigin(0.5).setDepth(107).setAlpha(0);
    const prayerPanel = this.add.container(GAME_WIDTH / 2, prayerStartY).setDepth(107).setAlpha(0);
    const paperWidth = sx(304);
    const paper = this.add.graphics();
    paper.fillStyle(0x1b1238, 0.94);
    paper.fillRoundedRect(-paperWidth / 2, -paperHeight / 2, paperWidth, paperHeight, ss(18));
    paper.lineStyle(ss(2), 0xf6d365, 0.78);
    paper.strokeRoundedRect(-paperWidth / 2, -paperHeight / 2, paperWidth, paperHeight, ss(18));
    const questionText = this.add.text(0, 0, `“${question}”`, { fontFamily: "system-ui, sans-serif", fontSize: `${ss(16)}px`, color: "#f8f0ff", align: "center", lineSpacing: ss(7), wordWrap: { width: sx(268) } }).setOrigin(0.5);
    prayerPanel.add([paper, questionText]);
    const guide = this.add.text(GAME_WIDTH / 2, sy(594), spreadGuide, { fontFamily: "system-ui, sans-serif", fontSize: `${ss(15)}px`, color: "#d9c8ff", align: "center" }).setOrigin(0.5).setDepth(107).setAlpha(0);
    let hasStartedCardSelect = false;
    const startCardSelect = () => {
      if (hasStartedCardSelect) return;
      hasStartedCardSelect = true;
      this.sealingTransitionFailsafe?.remove(false);
      this.sealingTransitionFailsafe = undefined;
      if (this.sealingTransitionHardFailsafeId !== undefined) {
        window.clearTimeout(this.sealingTransitionHardFailsafeId);
        this.sealingTransitionHardFailsafeId = undefined;
      }
      conversationFlowMachine.requestTransition(
        this,
        "Shuffling",
        () => this.scene.start("CardShuffleScene", draft),
        { transitionTimeoutMs: 3800, forcedFallbackState: "Shuffling" },
      );
    };
    this.tweens.add({ targets: darkness, alpha: 1, duration: 420, ease: "Sine.easeOut" });
    this.tweens.add({ targets: veil, alpha: 0.98, duration: 620, ease: "Sine.easeOut" });
    this.tweens.add({ targets: vignette, alpha: 1, duration: 720, ease: "Sine.easeOut" });
    this.tweens.add({ targets: [title, prayerPanel], alpha: 1, y: "-=8", delay: 320, duration: 820, ease: "Sine.easeOut" });
    this.tweens.add({ targets: [sealGlow, sealRing, sealMark], alpha: 1, delay: 780, duration: 960, ease: "Sine.easeOut" });
    this.tweens.add({ targets: sealRing, angle: 180, delay: 780, duration: 1850, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: prayerPanel, scaleY: 0.12, y: centerY - sy(10), delay: 1320, duration: 620, ease: "Cubic.easeInOut" });
    this.tweens.add({ targets: prayerPanel, scaleX: 0.16, y: centerY, alpha: 0, delay: 1940, duration: 720, ease: "Cubic.easeInOut" });
    this.tweens.add({ targets: sealGlow, scale: 1.75, alpha: 0.2, delay: 1940, duration: 940, ease: "Sine.easeOut" });
    this.time.delayedCall(2300, () => { playBurst(this, centerX, centerY, 108, 0.88); spawnTextureSparkles(this, centerX, centerY, 109, 34, ss(28), ss(150)); });
    this.tweens.add({ targets: guide, alpha: 1, y: "-=6", delay: 2400, duration: 620, ease: "Sine.easeOut" });
    this.tweens.add({
      targets: [title, guide, sealGlow, sealRing, sealMark],
      alpha: 0,
      delay: SEALING_TRANSITION_END_DELAY_MS,
      duration: SEALING_TRANSITION_END_DURATION_MS,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({
      targets: veil,
      alpha: 1,
      delay: SEALING_TRANSITION_END_DELAY_MS,
      duration: SEALING_TRANSITION_END_DURATION_MS,
      ease: "Sine.easeInOut",
      onComplete: startCardSelect,
    });

    // 일부 저사양/백그라운드 환경에서 tween onComplete가 누락될 수 있어, 연출 종료 시각 기반 fallback을 둔다.
    const sealingTransitionTotalMs = SEALING_TRANSITION_END_DELAY_MS + SEALING_TRANSITION_END_DURATION_MS;
    this.sealingTransitionFailsafe?.remove(false);
    this.sealingTransitionFailsafe = this.time.delayedCall(
      sealingTransitionTotalMs + SEALING_TRANSITION_FAILSAFE_BUFFER_MS,
      startCardSelect,
    );

    if (this.sealingTransitionHardFailsafeId !== undefined) {
      window.clearTimeout(this.sealingTransitionHardFailsafeId);
    }
    this.sealingTransitionHardFailsafeId = window.setTimeout(
      startCardSelect,
      sealingTransitionTotalMs + SEALING_TRANSITION_FAILSAFE_BUFFER_MS + 1200,
    );
  }
}
