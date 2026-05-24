import Phaser from "phaser";
import { DESIGN_GAME_HEIGHT, GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import { categoryLabels, type ReadingCategory, type ReadingDraft } from "../state/ReadingDraft";
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

const categories: ReadingCategory[] = ["love", "work", "money", "relationship", "free"];
const selectableSpreadIds = [DAILY_ONE_CARD_SPREAD_ID, SITUATION_ADVICE_SPREAD_ID, DEFAULT_SPREAD_ID, RELATIONSHIP_FIVE_SPREAD_ID, CHOICE_FIVE_SPREAD_ID];
const spreadButtonLabels: Record<string, string> = {
  [DAILY_ONE_CARD_SPREAD_ID]: "한 장",
  [SITUATION_ADVICE_SPREAD_ID]: "상황",
  [DEFAULT_SPREAD_ID]: "시간",
  [RELATIONSHIP_FIVE_SPREAD_ID]: "관계",
  [CHOICE_FIVE_SPREAD_ID]: "선택",
};

type CategoryButtonView = {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  width: number;
  height: number;
};

type SpreadButtonView = {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  width: number;
  height: number;
};

export class QuestionScene extends Phaser.Scene {
  private selectedCategory: ReadingCategory = "free";
  private selectedSpreadId?: string;
  private isManualSpreadSelection = false;
  private categoryButtons: Partial<Record<ReadingCategory, CategoryButtonView>> = {};
  private spreadButtons: Record<string, SpreadButtonView> = {};
  private questionInput?: Phaser.GameObjects.DOMElement;
  private warningText?: Phaser.GameObjects.Text;
  private recommendedSpreadTitle?: Phaser.GameObjects.Text;
  private recommendedSpreadBody?: Phaser.GameObjects.Text;
  private isSubmitting = false;

  constructor() {
    super("QuestionScene");
  }

  create(): void {
    this.isSubmitting = false;
    this.selectedSpreadId = undefined;
    this.isManualSpreadSelection = false;
    this.spreadButtons = {};
    drawMysticBackground(this, GAME_WIDTH, GAME_HEIGHT);
    this.createHeader();
    this.createFortuneTellerPanel();
    this.createCategoryButtons();
    this.createQuestionInput();
    this.createRecommendedSpreadPanel();
    this.createSpreadChoiceButtons();
    this.createNextButton();
    this.refreshRecommendedSpread();
  }

  private createHeader(): void {
    this.add
      .text(GAME_WIDTH / 2, sy(54), "속삭임의 방", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${ss(34)}px`,
        color: "#f8f0ff",
        stroke: "#2c174f",
        strokeThickness: ss(5),
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, sy(88), "마음속 문장을 꺼내면, 별빛이 그것을 봉인합니다.", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(13)}px`,
        color: "#cdbdff",
        align: "center",
      })
      .setOrigin(0.5);
  }

  private createFortuneTellerPanel(): void {
    drawRoundedPanel(this, sx(24), sy(126), GAME_WIDTH - sx(48), sy(146), ss(20));

    this.add.circle(sx(62), sy(166), ss(24), 0x6d4aff, 0.24).setStrokeStyle(ss(2), 0xf6d365, 0.82);
    this.add.text(sx(62), sy(166), "✦", { fontSize: `${ss(24)}px`, color: "#fff6d6" }).setOrigin(0.5);

    this.add
      .text(sx(98), sy(146), "점술사", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(15)}px`,
        color: "#f6d365",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    this.add
      .text(
        sx(98),
        sy(176),
        "여행자여, 마음속에서 가장 오래 남아 있던 질문을 하나 꺼내보세요.\n질문의 결에 맞는 배열을 고르되, 원하면 직접 바꿀 수도 있습니다.",
        {
          fontFamily: "system-ui, sans-serif",
          fontSize: `${ss(15)}px`,
          color: "#f8f0ff",
          lineSpacing: ss(7),
          wordWrap: { width: sx(238) },
        },
      )
      .setOrigin(0, 0);
  }

  private createCategoryButtons(): void {
    this.add
      .text(sx(28), sy(306), "질문이 닿을 별자리", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(15)}px`,
        color: "#f6d365",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    const buttonWidth = sx(158);
    const buttonHeight = sy(54);
    const touchWidth = sx(166);
    const touchHeight = sy(64);
    const startX = sx(28);
    const startY = sy(334);
    const gapX = sx(12);
    const gapY = sy(14);

    categories.forEach((category, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = startX + col * (buttonWidth + gapX);
      const y = startY + row * (buttonHeight + gapY);
      const button = this.createCategoryButton(category, x, y, buttonWidth, buttonHeight, touchWidth, touchHeight);
      this.categoryButtons[category] = button;
    });

    this.refreshCategoryButtons();
  }

  private createCategoryButton(
    category: ReadingCategory,
    x: number,
    y: number,
    width: number,
    height: number,
    touchWidth: number,
    touchHeight: number,
  ): CategoryButtonView {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    const label = this.add
      .text(width / 2, height / 2, categoryLabels[category], {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(14)}px`,
        color: "#f8f0ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    container.add([bg, label]);

    const hitZone = this.add.zone(x + width / 2, y + height / 2, touchWidth, touchHeight).setInteractive({ useHandCursor: true });

    hitZone.on("pointerdown", () => {
      this.selectedCategory = category;
      this.selectedSpreadId = undefined;
      this.isManualSpreadSelection = false;
      this.refreshCategoryButtons();
      this.refreshRecommendedSpread();
    });

    return { container, bg, label, width, height };
  }

  private refreshCategoryButtons(): void {
    categories.forEach((category) => {
      const button = this.categoryButtons[category];
      if (!button) return;

      const selected = category === this.selectedCategory;

      button.bg.clear();
      button.bg.fillStyle(selected ? 0x6d4aff : 0x1b1238, selected ? 0.86 : 0.74);
      button.bg.fillRoundedRect(0, 0, button.width, button.height, ss(16));
      button.bg.lineStyle(ss(2), selected ? 0xf6d365 : 0x6d4aff, selected ? 0.95 : 0.46);
      button.bg.strokeRoundedRect(0, 0, button.width, button.height, ss(16));
      button.label.setColor(selected ? "#fff6d6" : "#f8f0ff");
    });
  }

  private createQuestionInput(): void {
    this.add
      .text(sx(28), sy(548), "봉인할 질문", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(15)}px`,
        color: "#f6d365",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    const textarea = document.createElement("textarea");
    textarea.className = "arcana-question-input";
    textarea.maxLength = 500;
    textarea.placeholder = "예: 이번 프로젝트는 잘 풀릴까?";
    textarea.addEventListener("input", () => {
      if (!this.isManualSpreadSelection) this.refreshRecommendedSpread();
    });

    this.questionInput = this.add.dom(GAME_WIDTH / 2, sy(626), textarea).setOrigin(0.5);

    this.warningText = this.add
      .text(GAME_WIDTH / 2, sy(736), "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(13)}px`,
        color: "#ffb6c8",
        align: "center",
      })
      .setOrigin(0.5);
  }

  private createRecommendedSpreadPanel(): void {
    drawRoundedPanel(this, sx(28), sy(760), GAME_WIDTH - sx(56), sy(104), ss(18));

    this.add
      .text(sx(48), sy(780), "점술사가 고른 배열", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(13)}px`,
        color: "#f6d365",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);

    this.recommendedSpreadTitle = this.add
      .text(sx(48), sy(810), "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(17)}px`,
        color: "#fff6d6",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);

    this.recommendedSpreadBody = this.add
      .text(sx(48), sy(842), "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(12)}px`,
        color: "#d9c8ff",
        wordWrap: { width: sx(294) },
      })
      .setOrigin(0, 0);
  }

  private createSpreadChoiceButtons(): void {
    this.add
      .text(sx(28), sy(884), "다른 배열로 보기", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(13)}px`,
        color: "#f6d365",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    const buttonWidth = sx(62);
    const buttonHeight = sy(34);
    const touchWidth = sx(72);
    const touchHeight = sy(44);
    const startX = sx(28);
    const y = sy(914);
    const gapX = sx(8);

    selectableSpreadIds.forEach((spreadId, index) => {
      const x = startX + index * (buttonWidth + gapX);
      const button = this.createSpreadButton(spreadId, x, y, buttonWidth, buttonHeight, touchWidth, touchHeight);
      this.spreadButtons[spreadId] = button;
    });
  }

  private createSpreadButton(
    spreadId: string,
    x: number,
    y: number,
    width: number,
    height: number,
    touchWidth: number,
    touchHeight: number,
  ): SpreadButtonView {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    const label = this.add
      .text(width / 2, height / 2, spreadButtonLabels[spreadId] ?? getTarotSpread(spreadId).name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(12)}px`,
        color: "#f8f0ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    container.add([bg, label]);

    const hitZone = this.add.zone(x + width / 2, y + height / 2, touchWidth, touchHeight).setInteractive({ useHandCursor: true });
    hitZone.on("pointerdown", () => {
      this.selectedSpreadId = spreadId;
      this.isManualSpreadSelection = true;
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
      button.bg.fillRoundedRect(0, 0, button.width, button.height, ss(12));
      button.bg.lineStyle(ss(2), selected ? 0xf6d365 : 0x6d4aff, selected ? 0.94 : 0.46);
      button.bg.strokeRoundedRect(0, 0, button.width, button.height, ss(12));
      button.label.setColor(selected ? "#fff6d6" : "#f8f0ff");
    });
  }

  private refreshRecommendedSpread(): void {
    const question = this.getCurrentQuestionText();
    const spreadId = this.selectedSpreadId ?? getRecommendedSpreadId(this.selectedCategory, question);
    const spread = getTarotSpread(spreadId);
    const positionLabels = spread.positions.map((position) => position.label).join(" · ");
    const reason = this.isManualSpreadSelection
      ? "직접 선택한 배열입니다."
      : this.selectedCategory === "free" && question.length >= 3
        ? "질문 문장을 읽고 추천했습니다."
        : `${categoryLabels[this.selectedCategory]} 질문에 어울리는 배열입니다.`;

    this.recommendedSpreadTitle?.setText(`${spread.name} (${spread.cardsToDraw}장)`);
    this.recommendedSpreadBody?.setText(`${positionLabels}\n${reason}`);
    this.refreshSpreadButtons(spread.id);
  }

  private getCurrentQuestionText(): string {
    const node = this.questionInput?.node as HTMLTextAreaElement | undefined;
    return node?.value.trim() ?? "";
  }

  private createNextButton(): void {
    const width = sx(278);
    const height = sy(66);
    const x = GAME_WIDTH / 2;
    const y = DESIGN_GAME_HEIGHT - sy(92);

    const panel = this.add.graphics();
    panel.fillStyle(0x1b1238, 0.94);
    panel.fillRoundedRect(x - width / 2, y - height / 2, width, height, ss(20));
    panel.lineStyle(ss(3), 0xf6d365, 0.9);
    panel.strokeRoundedRect(x - width / 2, y - height / 2, width, height, ss(20));

    this.add
      .text(x, y, "질문을 별빛에 봉인", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(18)}px`,
        color: "#fff6d6",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const hitArea = this.add.zone(x, y, width + sx(36), height + sy(26)).setInteractive({ useHandCursor: true });
    hitArea.on("pointerdown", () => this.submitQuestion());
  }

  private submitQuestion(): void {
    if (this.isSubmitting) return;

    const node = this.questionInput?.node as HTMLTextAreaElement | undefined;
    const question = node?.value.trim() ?? "";

    if (question.length < 3) {
      this.warningText?.setText("카드가 들을 수 있도록 질문을 조금 더 적어주세요.");
      return;
    }

    this.isSubmitting = true;

    const draft: ReadingDraft = {
      category: this.selectedCategory,
      question,
      spreadId: this.selectedSpreadId ?? getRecommendedSpreadId(this.selectedCategory, question),
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
