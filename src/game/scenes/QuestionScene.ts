import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import { categoryLabels, type ReadingCategory, type ReadingDraft } from "../state/ReadingDraft";
import { drawMysticBackground, drawRoundedPanel } from "../ui/drawPanel";

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
      .text(GAME_WIDTH / 2, sy(54), "질문의 방", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${ss(34)}px`,
        color: "#f8f0ff",
        stroke: "#2c174f",
        strokeThickness: ss(5),
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, sy(88), "카드는 질문이 선명할수록 더 또렷하게 속삭입니다.", {
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
        "여행자여, 오늘 마음속에 머문 질문을 들려주세요.\n질문은 짧아도 괜찮습니다. 진심이면 충분합니다.",
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
      .text(sx(28), sy(306), "질문의 영역", {
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

    const hitZone = this.add
      .zone(x + width / 2, y + height / 2, touchWidth, touchHeight)
      .setInteractive({ useHandCursor: true });

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
      .text(sx(28), sy(548), "질문", {
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
      .text(x, y, "카드를 펼칠 준비", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(19)}px`,
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

    this.warningText?.setText("");
    this.cameras.main.fadeOut(340, 9, 7, 26);
    this.time.delayedCall(360, () => {
      this.scene.start("CardSelectScene", draft);
    });
  }
}
