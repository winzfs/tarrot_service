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

const DEFAULT_AI_CATEGORY: ReadingCategory = "free";
const selectableSpreadIds = [DAILY_ONE_CARD_SPREAD_ID, SITUATION_ADVICE_SPREAD_ID, DEFAULT_SPREAD_ID, RELATIONSHIP_FIVE_SPREAD_ID, CHOICE_FIVE_SPREAD_ID];
const spreadButtonLabels: Record<string, string> = {
  [DAILY_ONE_CARD_SPREAD_ID]: "한 장",
  [SITUATION_ADVICE_SPREAD_ID]: "상황",
  [DEFAULT_SPREAD_ID]: "시간",
  [RELATIONSHIP_FIVE_SPREAD_ID]: "관계",
  [CHOICE_FIVE_SPREAD_ID]: "선택",
};

type QuestionPhase = "question" | "spread";
type VisibleGameObject = Phaser.GameObjects.GameObject & { setVisible(visible: boolean): VisibleGameObject };

type SpreadButtonView = {
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
  private assistRequestSeq = 0;
  private spreadRecommendationTimer?: Phaser.Time.TimerEvent;
  private spreadRecommendationSeq = 0;
  private isManualSpreadSelection = false;
  private spreadButtons: Record<string, SpreadButtonView> = {};
  private assistOptionButtons: AssistOptionButtonView[] = [];
  private phaseQuestionObjects: VisibleGameObject[] = [];
  private phaseSpreadObjects: VisibleGameObject[] = [];
  private phaseGuideText?: Phaser.GameObjects.Text;
  private questionInput?: Phaser.GameObjects.DOMElement;
  private warningText?: Phaser.GameObjects.Text;
  private assistGuidanceText?: Phaser.GameObjects.Text;
  private assistFollowUpText?: Phaser.GameObjects.Text;
  private recommendedSpreadTitle?: Phaser.GameObjects.Text;
  private recommendedSpreadBody?: Phaser.GameObjects.Text;
  private refinedQuestionButtonBg?: Phaser.GameObjects.Graphics;
  private refinedQuestionButtonLabel?: Phaser.GameObjects.Text;
  private refinedQuestionHitZone?: Phaser.GameObjects.Zone;
  private nextButtonLabel?: Phaser.GameObjects.Text;
  private isSubmitting = false;

  constructor() {
    super("QuestionScene");
  }

  create(): void {
    this.currentPhase = "question";
    this.selectedCategory = DEFAULT_AI_CATEGORY;
    this.isSubmitting = false;
    this.selectedSpreadId = undefined;
    this.clearAiRecommendationState();
    this.clearQuestionAssistState();
    this.spreadRecommendationSeq = 0;
    this.assistRequestSeq = 0;
    this.isManualSpreadSelection = false;
    this.spreadButtons = {};
    this.assistOptionButtons = [];
    this.phaseQuestionObjects = [];
    this.phaseSpreadObjects = [];

    drawMysticBackground(this, GAME_WIDTH, GAME_HEIGHT);
    this.createHeader();
    this.createFortuneTellerPanel();
    this.createPhaseGuide();
    this.createQuestionInput();
    this.createQuestionAssistPanel();
    this.createRecommendedSpreadPanel();
    this.createSpreadChoiceButtons();
    this.createNextButton();
    this.setPhase("question");
  }

  private trackQuestionObject<T extends VisibleGameObject>(object: T): T {
    this.phaseQuestionObjects.push(object);
    return object;
  }

  private trackSpreadObject<T extends VisibleGameObject>(object: T): T {
    this.phaseSpreadObjects.push(object);
    return object;
  }

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
    this.add
      .text(GAME_WIDTH / 2, sy(44), "속삭임의 방", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${ss(30)}px`,
        color: "#f8f0ff",
        stroke: "#2c174f",
        strokeThickness: ss(5),
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, sy(74), "질문을 적으면 점술사가 맥락을 읽고 배열을 고릅니다.", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(12)}px`,
        color: "#cdbdff",
        align: "center",
      })
      .setOrigin(0.5);
  }

  private createFortuneTellerPanel(): void {
    drawRoundedPanel(this, sx(24), sy(102), GAME_WIDTH - sx(48), sy(116), ss(18));

    this.add.circle(sx(60), sy(138), ss(22), 0x6d4aff, 0.22).setStrokeStyle(ss(2), 0xf6d365, 0.76);
    this.add.text(sx(60), sy(138), "✦", { fontSize: `${ss(21)}px`, color: "#fff6d6" }).setOrigin(0.5);

    this.add
      .text(sx(94), sy(122), "점술사", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(14)}px`,
        color: "#f6d365",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    this.add
      .text(
        sx(94),
        sy(146),
        "짧게 적어도 괜찮습니다.\n제가 한 번 더 물어보고, 선택지로 질문을 선명하게 다듬어드릴게요.",
        {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${ss(13)}px`,
          color: "#f8f0ff",
          lineSpacing: ss(5),
          wordWrap: { width: sx(246) },
        },
      )
      .setOrigin(0, 0);
  }

  private createPhaseGuide(): void {
    this.phaseGuideText = this.add
      .text(GAME_WIDTH / 2, sy(244), "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(13)}px`,
        color: "#d9c8ff",
        align: "center",
        lineSpacing: ss(4),
        wordWrap: { width: sx(310) },
      })
      .setOrigin(0.5);
  }

  private createQuestionInput(): void {
    this.trackQuestionObject(
      this.add
        .text(sx(28), sy(302), "봉인할 질문", {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${ss(15)}px`,
          color: "#f6d365",
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5),
    );

    this.trackQuestionObject(
      this.add
        .text(sx(28), sy(328), "예: 요즘 연락이 뜸한데, 이 관계가 어떻게 흘러갈지 궁금해.", {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${ss(11)}px`,
          color: "#bfb0ef",
          wordWrap: { width: sx(310) },
        })
        .setOrigin(0, 0),
    );

    const textarea = document.createElement("textarea");
    textarea.className = "arcana-question-input";
    textarea.maxLength = 500;
    textarea.placeholder = "지금 가장 궁금한 일을 자유롭게 적어주세요.";
    textarea.addEventListener("input", () => {
      this.warningText?.setText("");
      if (this.currentPhase !== "spread" || this.isManualSpreadSelection) return;
      this.clearAiRecommendationState();
      this.clearQuestionAssistState();
      this.refreshQuestionAssist();
      this.refreshRecommendedSpread();
      this.requestQuestionAssistForCurrentQuestion();
      this.scheduleAiSpreadRecommendation();
    });

    this.questionInput = this.trackQuestionObject(this.add.dom(GAME_WIDTH / 2, sy(440), textarea).setOrigin(0.5));

    this.warningText = this.trackQuestionObject(
      this.add
        .text(GAME_WIDTH / 2, sy(534), "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${ss(12)}px`,
          color: "#ffb6c8",
          align: "center",
        })
        .setOrigin(0.5),
    );
  }

  private createQuestionAssistPanel(): void {
    this.trackSpreadObject(
      this.add
        .text(sx(28), sy(274), "AI가 한 번 더 물어봅니다", {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${ss(14)}px`,
          color: "#f6d365",
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5),
    );

    const panelBg = this.trackSpreadObject(this.add.graphics());
    panelBg.fillStyle(0x1b1238, 0.82);
    panelBg.fillRoundedRect(sx(28), sy(296), GAME_WIDTH - sx(56), sy(150), ss(16));
    panelBg.lineStyle(ss(2), 0x6d4aff, 0.46);
    panelBg.strokeRoundedRect(sx(28), sy(296), GAME_WIDTH - sx(56), sy(150), ss(16));

    this.assistGuidanceText = this.trackSpreadObject(
      this.add
        .text(sx(48), sy(312), "질문을 읽는 중입니다...", {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${ss(10)}px`,
          color: "#d9c8ff",
          lineSpacing: ss(2),
          wordWrap: { width: sx(294) },
        })
        .setOrigin(0, 0),
    );

    this.assistFollowUpText = this.trackSpreadObject(
      this.add
        .text(sx(48), sy(342), "카드가 어떤 방향을 더 비춰주면 좋을까요?", {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${ss(12)}px`,
          color: "#fff6d6",
          fontStyle: "bold",
          lineSpacing: ss(2),
          wordWrap: { width: sx(294) },
        })
        .setOrigin(0, 0),
    );

    const startY = sy(382);
    for (let index = 0; index < 3; index += 1) {
      this.assistOptionButtons.push(this.createAssistOptionButton(index, sx(48), startY + index * sy(20), sx(250), sy(18)));
    }
  }

  private createAssistOptionButton(index: number, x: number, y: number, width: number, height: number): AssistOptionButtonView {
    const container = this.trackSpreadObject(this.add.container(x, y));
    const bg = this.add.graphics();
    const label = this.add
      .text(width / 2, height / 2, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(9)}px`,
        color: "#f8f0ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    container.add([bg, label]);

    const hitZone = this.trackSpreadObject(this.add.zone(x + width / 2, y + height / 2, width + sx(18), height + sy(8)).setInteractive({ useHandCursor: true }));
    hitZone.on("pointerdown", () => this.applyAssistOption(index));

    return { container, bg, label, hitZone, width, height };
  }

  private refreshQuestionAssist(): void {
    this.assistGuidanceText?.setText(this.assistGuidance ?? "질문을 읽는 중입니다...");
    this.assistFollowUpText?.setText(this.assistFollowUpQuestion ?? "카드가 어떤 방향을 더 비춰주면 좋을까요?");

    this.assistOptionButtons.forEach((button, index) => {
      const option = this.assistOptions[index];
      const visible = this.currentPhase === "spread" && !!option;
      button.bg.clear();
      if (visible) {
        button.bg.fillStyle(0x26184f, 0.86);
        button.bg.fillRoundedRect(0, 0, button.width, button.height, ss(8));
        button.bg.lineStyle(ss(1), 0xf6d365, 0.64);
        button.bg.strokeRoundedRect(0, 0, button.width, button.height, ss(8));
        button.label.setText(option.label);
      } else {
        button.label.setText("");
      }
      button.container.setVisible(visible);
      button.hitZone.setVisible(visible);
    });
  }

  private applyAssistOption(index: number): void {
    const option = this.assistOptions[index];
    const node = this.questionInput?.node as HTMLTextAreaElement | undefined;
    if (!option || !node) return;

    const current = node.value.trim();
    node.value = `${current}${current.endsWith(".") || current.endsWith("?") || current.endsWith("!") ? " " : ". "}${option.appendText}`;
    this.selectedSpreadId = undefined;
    this.clearAiRecommendationState();
    this.clearQuestionAssistState();
    this.isManualSpreadSelection = false;
    this.refreshQuestionAssist();
    this.refreshRecommendedSpread();
    this.requestQuestionAssistForCurrentQuestion();
    this.scheduleAiSpreadRecommendation();
  }

  private requestQuestionAssistForCurrentQuestion(): void {
    if (this.currentPhase !== "spread" || this.isSubmitting) return;

    const question = this.getCurrentQuestionText();
    if (question.length < 3) return;

    const requestSeq = ++this.assistRequestSeq;
    void this.fetchQuestionAssist(question, requestSeq);
  }

  private async fetchQuestionAssist(question: string, requestSeq: number): Promise<void> {
    try {
      const assist = await requestQuestionAssist({ question });
      if (requestSeq !== this.assistRequestSeq) return;
      if (this.currentPhase !== "spread" || this.isSubmitting) return;
      if (question !== this.getCurrentQuestionText()) return;

      this.assistGuidance = assist.guidance;
      this.assistFollowUpQuestion = assist.followUpQuestion;
      this.assistOptions = Array.isArray(assist.assistOptions) ? assist.assistOptions.slice(0, 3) : [];
      this.refreshQuestionAssist();
    } catch {
      if (requestSeq !== this.assistRequestSeq) return;
      this.assistGuidance = "질문을 조금 더 선명하게 만들 수 있어요.";
      this.assistFollowUpQuestion = "카드가 어떤 방향을 더 비춰주면 좋을까요?";
      this.assistOptions = [
        { label: "앞으로의 흐름", appendText: "앞으로 이 일이 어떤 흐름으로 이어질지도 알고 싶어." },
        { label: "내가 할 일", appendText: "지금 내가 취하면 좋은 태도와 다음 행동도 함께 보고 싶어." },
        { label: "막힌 이유", appendText: "현재 흐름을 막고 있는 요소가 무엇인지도 알고 싶어." },
      ];
      this.refreshQuestionAssist();
    }
  }

  private createRecommendedSpreadPanel(): void {
    this.trackSpreadObject(
      this.add
        .text(sx(28), sy(464), "추천 배열", {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${ss(13)}px`,
          color: "#f6d365",
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5),
    );

    const panelBg = this.trackSpreadObject(this.add.graphics());
    panelBg.fillStyle(0x1b1238, 0.82);
    panelBg.fillRoundedRect(sx(28), sy(482), GAME_WIDTH - sx(56), sy(108), ss(16));
    panelBg.lineStyle(ss(2), 0x6d4aff, 0.46);
    panelBg.strokeRoundedRect(sx(28), sy(482), GAME_WIDTH - sx(56), sy(108), ss(16));

    this.recommendedSpreadTitle = this.trackSpreadObject(
      this.add
        .text(sx(48), sy(498), "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${ss(14)}px`,
          color: "#fff6d6",
          fontStyle: "bold",
        })
        .setOrigin(0, 0),
    );

    this.recommendedSpreadBody = this.trackSpreadObject(
      this.add
        .text(sx(48), sy(523), "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${ss(9)}px`,
          color: "#d9c8ff",
          lineSpacing: ss(2),
          wordWrap: { width: sx(294) },
        })
        .setOrigin(0, 0),
    );

    this.createRefinedQuestionButton();
  }

  private createRefinedQuestionButton(): void {
    const x = sx(210);
    const y = sy(556);
    const width = sx(104);
    const height = sy(24);

    this.refinedQuestionButtonBg = this.trackSpreadObject(this.add.graphics());
    this.refinedQuestionButtonLabel = this.trackSpreadObject(
      this.add
        .text(x + width / 2, y + height / 2, "질문 적용", {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${ss(9)}px`,
          color: "#fff6d6",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );

    this.refinedQuestionHitZone = this.trackSpreadObject(this.add.zone(x + width / 2, y + height / 2, width + sx(18), height + sy(12)).setInteractive({ useHandCursor: true }));
    this.refinedQuestionHitZone.on("pointerdown", () => this.applyRefinedQuestion());
  }

  private updateRefinedQuestionButton(): void {
    if (!this.refinedQuestionButtonBg || !this.refinedQuestionButtonLabel || !this.refinedQuestionHitZone) return;

    const visible = this.currentPhase === "spread" && !this.isManualSpreadSelection && !!this.aiRefinedQuestion;
    const x = sx(210);
    const y = sy(556);
    const width = sx(104);
    const height = sy(24);

    this.refinedQuestionButtonBg.clear();
    if (visible) {
      this.refinedQuestionButtonBg.fillStyle(0x6d4aff, 0.72);
      this.refinedQuestionButtonBg.fillRoundedRect(x, y, width, height, ss(10));
      this.refinedQuestionButtonBg.lineStyle(ss(2), 0xf6d365, 0.78);
      this.refinedQuestionButtonBg.strokeRoundedRect(x, y, width, height, ss(10));
    }

    this.refinedQuestionButtonBg.setVisible(visible);
    this.refinedQuestionButtonLabel.setVisible(visible);
    this.refinedQuestionHitZone.setVisible(visible);
  }

  private applyRefinedQuestion(): void {
    if (this.currentPhase !== "spread" || !this.aiRefinedQuestion) return;

    const node = this.questionInput?.node as HTMLTextAreaElement | undefined;
    if (!node) return;

    node.value = this.aiRefinedQuestion;
    this.selectedSpreadId = undefined;
    this.clearAiRecommendationState();
    this.clearQuestionAssistState();
    this.isManualSpreadSelection = false;
    this.refreshQuestionAssist();
    this.refreshRecommendedSpread();
    this.requestQuestionAssistForCurrentQuestion();
    this.scheduleAiSpreadRecommendation();
  }

  private createSpreadChoiceButtons(): void {
    this.trackSpreadObject(
      this.add
        .text(sx(28), sy(608), "다른 배열로 보기", {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${ss(12)}px`,
          color: "#f6d365",
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5),
    );

    const buttonWidth = sx(98);
    const buttonHeight = sy(34);
    const touchWidth = sx(106);
    const touchHeight = sy(44);
    const startX = sx(28);
    const startY = sy(630);
    const gapX = sx(10);
    const gapY = sy(8);

    selectableSpreadIds.forEach((spreadId, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = startX + col * (buttonWidth + gapX);
      const y = startY + row * (buttonHeight + gapY);
      const button = this.createSpreadButton(spreadId, x, y, buttonWidth, buttonHeight, touchWidth, touchHeight);
      this.spreadButtons[spreadId] = button;
    });
  }

  private createSpreadButton(spreadId: string, x: number, y: number, width: number, height: number, touchWidth: number, touchHeight: number): SpreadButtonView {
    const container = this.trackSpreadObject(this.add.container(x, y));
    const bg = this.add.graphics();
    const label = this.add
      .text(width / 2, height / 2, spreadButtonLabels[spreadId] ?? getTarotSpread(spreadId).name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(10)}px`,
        color: "#f8f0ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    container.add([bg, label]);

    const hitZone = this.trackSpreadObject(this.add.zone(x + width / 2, y + height / 2, touchWidth, touchHeight).setInteractive({ useHandCursor: true }));
    hitZone.on("pointerdown", () => {
      if (this.currentPhase !== "spread") return;
      this.selectedSpreadId = spreadId;
      this.clearAiRecommendationState();
      this.isManualSpreadSelection = true;
      this.spreadRecommendationTimer?.remove(false);
      this.refreshRecommendedSpread();
    });

    return { container, bg, label, width, height };
  }

  private refreshSpreadButtons(activeSpreadId: string): void {
    selectableSpreadIds.forEach((spreadId) => {
      const button = this.spreadButtons[spreadId];
      if (!button) return;

      const selected = spreadId === activeSpreadId;
      button.bg.clear();
      button.bg.fillStyle(selected ? 0x6d4aff : 0x1b1238, selected ? 0.88 : 0.74);
      button.bg.fillRoundedRect(0, 0, button.width, button.height, ss(11));
      button.bg.lineStyle(ss(2), selected ? 0xf6d365 : 0x6d4aff, selected ? 0.94 : 0.46);
      button.bg.strokeRoundedRect(0, 0, button.width, button.height, ss(11));
      button.label.setColor(selected ? "#fff6d6" : "#f8f0ff");
    });
  }

  private refreshRecommendedSpread(): void {
    const question = this.getCurrentQuestionText();
    const spreadId = this.selectedSpreadId ?? this.aiRecommendedSpreadId ?? getRecommendedSpreadId(DEFAULT_AI_CATEGORY, question);
    const spread = getTarotSpread(spreadId);
    const positionLabels = spread.positions.map((position) => position.label).join(" · ");
    const reason = this.getRecommendationReason(question);
    const refinedQuestion = this.getRefinedQuestionText(question);
    const themes = this.getDetectedThemeText();

    this.recommendedSpreadTitle?.setText(`${spread.name} (${spread.cardsToDraw}장)`);
    this.recommendedSpreadBody?.setText(`${themes}\n${refinedQuestion}\n위치: ${positionLabels}\n${reason}`);
    this.refreshSpreadButtons(spread.id);
    this.updateRefinedQuestionButton();
  }

  private getRefinedQuestionText(question: string): string {
    if (this.isManualSpreadSelection) return `질문: ${question}`;
    if (this.aiRefinedQuestion) return `다듬은 질문: ${this.aiRefinedQuestion}`;
    return `질문: ${question}`;
  }

  private getDetectedThemeText(): string {
    if (this.isManualSpreadSelection) return "읽힌 기운: 직접 선택";
    if (this.aiDetectedThemes.length > 0) return `읽힌 기운: ${this.aiDetectedThemes.join(" · ")}`;
    return "읽힌 기운: 촛불 위에서 확인 중";
  }

  private getRecommendationReason(question: string): string {
    if (this.isManualSpreadSelection) return "직접 선택한 배열입니다.";
    if (this.aiRecommendationReason) return this.aiRecommendationReason;
    if (question.length >= 3) return "AI 점술사가 질문 전체의 맥락을 읽는 중입니다.";
    return "질문을 적으면 AI가 맥락을 읽고 배열을 고릅니다.";
  }

  private scheduleAiSpreadRecommendation(): void {
    if (this.currentPhase !== "spread" || this.isManualSpreadSelection || this.isSubmitting) return;

    const question = this.getCurrentQuestionText();
    if (question.length < 3) return;

    this.spreadRecommendationTimer?.remove(false);
    const requestSeq = ++this.spreadRecommendationSeq;
    const category = DEFAULT_AI_CATEGORY;

    this.spreadRecommendationTimer = this.time.delayedCall(720, () => {
      void this.fetchAiSpreadRecommendation(category, question, requestSeq);
    });
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
      this.clearAiRecommendationState();
      this.refreshRecommendedSpread();
    }
  }

  private getCurrentQuestionText(): string {
    const node = this.questionInput?.node as HTMLTextAreaElement | undefined;
    return node?.value.trim() ?? "";
  }

  private createNextButton(): void {
    const width = sx(264);
    const height = sy(50);
    const x = GAME_WIDTH / 2;
    const y = DESIGN_GAME_HEIGHT - sy(42);

    const panel = this.add.graphics();
    panel.fillStyle(0x1b1238, 0.94);
    panel.fillRoundedRect(x - width / 2, y - height / 2, width, height, ss(16));
    panel.lineStyle(ss(3), 0xf6d365, 0.9);
    panel.strokeRoundedRect(x - width / 2, y - height / 2, width, height, ss(16));

    this.nextButtonLabel = this.add
      .text(x, y, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(16)}px`,
        color: "#fff6d6",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const hitArea = this.add.zone(x, y, width + sx(44), height + sy(28)).setInteractive({ useHandCursor: true });
    hitArea.on("pointerdown", () => this.handlePrimaryAction());
  }

  private handlePrimaryAction(): void {
    if (this.currentPhase === "question") {
      this.goToSpreadPhase();
      return;
    }

    this.submitQuestion();
  }

  private goToSpreadPhase(): void {
    const question = this.getCurrentQuestionText();
    if (question.length < 3) {
      this.warningText?.setText("카드가 들을 수 있도록 질문을 조금 더 적어주세요.");
      return;
    }

    this.warningText?.setText("");
    this.selectedCategory = DEFAULT_AI_CATEGORY;
    this.selectedSpreadId = undefined;
    this.clearAiRecommendationState();
    this.clearQuestionAssistState();
    this.isManualSpreadSelection = false;
    this.spreadRecommendationSeq += 1;
    this.assistRequestSeq += 1;

    const node = this.questionInput?.node as HTMLTextAreaElement | undefined;
    node?.blur();

    this.setPhase("spread");
    this.refreshQuestionAssist();
    this.refreshRecommendedSpread();
    this.requestQuestionAssistForCurrentQuestion();
    this.scheduleAiSpreadRecommendation();
  }

  private setPhase(phase: QuestionPhase): void {
    this.currentPhase = phase;
    const isQuestionPhase = phase === "question";

    this.phaseQuestionObjects.forEach((object) => object.setVisible(isQuestionPhase));
    this.phaseSpreadObjects.forEach((object) => object.setVisible(!isQuestionPhase));

    if (isQuestionPhase) {
      this.phaseGuideText?.setText("1 / 2\n질문만 자유롭게 적어주세요. 다음 단계에서 AI가 추가 질문을 제안합니다.");
      this.nextButtonLabel?.setText("다음: AI에게 질문 맡기기");
      return;
    }

    this.phaseGuideText?.setText("2 / 2\n선택지를 누르면 질문이 더 구체화되고, 추천 배열도 다시 맞춰집니다.");
    this.nextButtonLabel?.setText("질문을 별빛에 봉인");
    this.refreshQuestionAssist();
    this.updateRefinedQuestionButton();
  }

  private submitQuestion(): void {
    if (this.isSubmitting) return;

    const node = this.questionInput?.node as HTMLTextAreaElement | undefined;
    const question = node?.value.trim() ?? "";

    if (question.length < 3) {
      this.warningText?.setText("카드가 들을 수 있도록 질문을 조금 더 적어주세요.");
      this.setPhase("question");
      return;
    }

    this.isSubmitting = true;
    this.spreadRecommendationTimer?.remove(false);

    const draft: ReadingDraft = {
      category: DEFAULT_AI_CATEGORY,
      question,
      spreadId: this.selectedSpreadId ?? this.aiRecommendedSpreadId ?? getRecommendedSpreadId(DEFAULT_AI_CATEGORY, question),
    };

    node?.blur();
    this.warningText?.setText("");
    this.playSealingTransition(question, draft);
  }

  private playSealingTransition(question: string, draft: ReadingDraft): void {
    this.questionInput?.setVisible(false);
    const spread = getTarotSpread(draft.spreadId);
    const spreadGuide = spread.cardsToDraw === 1 ? "접힌 기도문은 이제 한 장의 카드에게 전해집니다." : `접힌 기도문은 이제 ${spread.name}의 카드들에게 전해집니다.`;

    const darkness = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x010008, 1).setDepth(99).setAlpha(0);
    const veil = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x03020a, 0).setDepth(100);
    const vignette = this.add.graphics().setDepth(101).setAlpha(0);
    vignette.fillGradientStyle(0x000000, 0x000000, 0x080313, 0x080313, 1, 1, 0.82, 0.82);
    vignette.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const centerX = GAME_WIDTH / 2;
    const centerY = sy(432);
    const sealGlow = addSoftGlow(this, centerX, centerY, 104, 0.78);
    const sealRing = addRuneRing(this, centerX, centerY, 105, 0.48);
    const sealMark = addSigil(this, centerX, centerY, 106, 0.56);

    const title = this.add
      .text(GAME_WIDTH / 2, sy(232), "기도문이 별빛에 접힙니다", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${ss(31)}px`,
        color: "#fff6d6",
        align: "center",
        stroke: "#2c174f",
        strokeThickness: ss(5),
      })
      .setOrigin(0.5)
      .setDepth(107)
      .setAlpha(0);

    const prayerPanel = this.add.container(GAME_WIDTH / 2, sy(332)).setDepth(107).setAlpha(0);
    const paperWidth = sx(304);
    const paperHeight = sy(102);
    const paper = this.add.graphics();
    paper.fillStyle(0x1b1238, 0.94);
    paper.fillRoundedRect(-paperWidth / 2, -paperHeight / 2, paperWidth, paperHeight, ss(18));
    paper.lineStyle(ss(2), 0xf6d365, 0.78);
    paper.strokeRoundedRect(-paperWidth / 2, -paperHeight / 2, paperWidth, paperHeight, ss(18));
    const questionText = this.add
      .text(0, 0, `“${question}”`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(17)}px`,
        color: "#f8f0ff",
        align: "center",
        lineSpacing: ss(8),
        wordWrap: { width: sx(268) },
      })
      .setOrigin(0.5);
    prayerPanel.add([paper, questionText]);

    const guide = this.add
      .text(GAME_WIDTH / 2, sy(594), spreadGuide, {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(15)}px`,
        color: "#d9c8ff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(107)
      .setAlpha(0);

    this.tweens.add({ targets: darkness, alpha: 1, duration: 420, ease: "Sine.easeOut" });
    this.tweens.add({ targets: veil, alpha: 0.98, duration: 620, ease: "Sine.easeOut" });
    this.tweens.add({ targets: vignette, alpha: 1, duration: 720, ease: "Sine.easeOut" });
    this.tweens.add({ targets: [title, prayerPanel], alpha: 1, y: "-=8", delay: 320, duration: 820, ease: "Sine.easeOut" });
    this.tweens.add({ targets: [sealGlow, sealRing, sealMark], alpha: 1, delay: 780, duration: 960, ease: "Sine.easeOut" });
    this.tweens.add({ targets: sealRing, angle: 180, delay: 780, duration: 1850, ease: "Sine.easeInOut" });

    this.tweens.add({ targets: prayerPanel, scaleY: 0.12, y: centerY - sy(10), delay: 1320, duration: 620, ease: "Cubic.easeInOut" });
    this.tweens.add({ targets: prayerPanel, scaleX: 0.16, y: centerY, alpha: 0, delay: 1940, duration: 720, ease: "Cubic.easeInOut" });
    this.tweens.add({ targets: sealGlow, scale: 1.75, alpha: 0.2, delay: 1940, duration: 940, ease: "Sine.easeOut" });
    this.time.delayedCall(2300, () => {
      playBurst(this, centerX, centerY, 108, 0.88);
      spawnTextureSparkles(this, centerX, centerY, 109, 34, ss(28), ss(150));
    });
    this.tweens.add({ targets: guide, alpha: 1, y: "-=6", delay: 2400, duration: 620, ease: "Sine.easeOut" });

    this.time.delayedCall(3300, () => {
      this.cameras.main.fadeOut(640, 9, 7, 26);
      this.time.delayedCall(660, () => this.scene.start("CardSelectScene", draft));
    });
  }
}
