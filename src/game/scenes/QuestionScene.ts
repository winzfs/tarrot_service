import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import { categoryLabels, type ReadingCategory, type ReadingDraft } from "../state/ReadingDraft";
import { drawMysticBackground, drawRoundedPanel } from "../ui/drawPanel";
import { addRuneRing, addSigil, addSoftGlow, playBurst, spawnTextureSparkles } from "../vfx/vfxEffects";

const categories: ReadingCategory[] = ["love", "work", "money", "relationship", "free"];

type CategoryButtonView = {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  width: number;
  height: number;
};

export class QuestionScene extends Phaser.Scene {
  private selectedCategory: ReadingCategory = "free";
  private categoryButtons: Partial<Record<ReadingCategory, CategoryButtonView>> = {};
  private questionInput?: Phaser.GameObjects.DOMElement;
  private warningText?: Phaser.GameObjects.Text;
  private isSubmitting = false;

  constructor() {
    super("QuestionScene");
  }

  create(): void {
    this.isSubmitting = false;
    drawMysticBackground(this, GAME_WIDTH, GAME_HEIGHT);
    this.createHeader();
    this.createFortuneTellerPanel();
    this.createCategoryButtons();
    this.createQuestionInput();
    this.createNextButton();
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
        "여행자여, 마음속에서 가장 오래 남아 있던 질문을 하나 꺼내보세요.\n길지 않아도 괜찮습니다. 진심이면 충분합니다.",
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
      this.refreshCategoryButtons();
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

  private createNextButton(): void {
    const width = sx(278);
    const height = sy(66);
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT - sy(92);

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
    };

    node?.blur();
    this.warningText?.setText("");
    this.playSealingTransition(question, draft);
  }

  private playSealingTransition(question: string, draft: ReadingDraft): void {
    this.questionInput?.setVisible(false);

    const veil = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x03020a, 0).setDepth(100);
    const centerX = GAME_WIDTH / 2;
    const centerY = sy(432);
    const sealGlow = addSoftGlow(this, centerX, centerY, 101, 0.78);
    const sealRing = addRuneRing(this, centerX, centerY, 102, 0.48);
    const sealMark = addSigil(this, centerX, centerY, 103, 0.56);

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
      .setDepth(103)
      .setAlpha(0);

    const prayerPanel = this.add.container(GAME_WIDTH / 2, sy(332)).setDepth(103).setAlpha(0);
    const paperWidth = sx(304);
    const paperHeight = sy(102);
    const paper = this.add.graphics();
    paper.fillStyle(0x1b1238, 0.92);
    paper.fillRoundedRect(-paperWidth / 2, -paperHeight / 2, paperWidth, paperHeight, ss(18));
    paper.lineStyle(ss(2), 0xf6d365, 0.74);
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
      .text(GAME_WIDTH / 2, sy(594), "접힌 기도문은 이제 세 장의 카드에게 전해집니다.", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(15)}px`,
        color: "#d9c8ff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(103)
      .setAlpha(0);

    this.tweens.add({ targets: veil, alpha: 0.78, duration: 320, ease: "Sine.easeOut" });
    this.tweens.add({ targets: [title, prayerPanel], alpha: 1, y: "-=8", delay: 180, duration: 620, ease: "Sine.easeOut" });
    this.tweens.add({ targets: [sealGlow, sealRing, sealMark], alpha: 1, delay: 520, duration: 720, ease: "Sine.easeOut" });
    this.tweens.add({ targets: sealRing, angle: 180, delay: 520, duration: 1400, ease: "Sine.easeInOut" });

    this.tweens.add({ targets: prayerPanel, scaleY: 0.12, y: centerY - sy(10), delay: 920, duration: 420, ease: "Cubic.easeInOut" });
    this.tweens.add({ targets: prayerPanel, scaleX: 0.16, y: centerY, alpha: 0, delay: 1320, duration: 520, ease: "Cubic.easeInOut" });
    this.tweens.add({ targets: sealGlow, scale: 1.75, alpha: 0.2, delay: 1320, duration: 760, ease: "Sine.easeOut" });
    this.time.delayedCall(1560, () => {
      playBurst(this, centerX, centerY, 104, 0.88);
      spawnTextureSparkles(this, centerX, centerY, 105, 34, ss(28), ss(150));
    });
    this.tweens.add({ targets: guide, alpha: 1, y: "-=6", delay: 1660, duration: 520, ease: "Sine.easeOut" });

    this.time.delayedCall(2260, () => {
      this.cameras.main.fadeOut(520, 9, 7, 26);
      this.time.delayedCall(540, () => this.scene.start("CardSelectScene", draft));
    });
  }
}
