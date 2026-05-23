import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../GameConfig";
import { categoryLabels, type ReadingCategory, type ReadingDraft } from "../state/ReadingDraft";
import { drawMysticBackground, drawRoundedPanel } from "../ui/drawPanel";

const categories: ReadingCategory[] = ["love", "work", "money", "relationship", "free"];

export class QuestionScene extends Phaser.Scene {
  private selectedCategory: ReadingCategory = "free";
  private categoryButtons: Partial<Record<ReadingCategory, Phaser.GameObjects.Container>> = {};
  private questionInput?: Phaser.GameObjects.DOMElement;
  private warningText?: Phaser.GameObjects.Text;

  constructor() {
    super("QuestionScene");
  }

  create(): void {
    drawMysticBackground(this, GAME_WIDTH, GAME_HEIGHT);
    this.createHeader();
    this.createFortuneTellerPanel();
    this.createCategoryButtons();
    this.createQuestionInput();
    this.createNextButton();
  }

  private createHeader(): void {
    this.add
      .text(GAME_WIDTH / 2, 54, "질문의 방", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "34px",
        color: "#f8f0ff",
        stroke: "#2c174f",
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 88, "카드는 질문이 선명할수록 더 또렷하게 속삭입니다.", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#cdbdff",
        align: "center",
      })
      .setOrigin(0.5);
  }

  private createFortuneTellerPanel(): void {
    drawRoundedPanel(this, 24, 126, GAME_WIDTH - 48, 146, 20);

    this.add.circle(62, 166, 24, 0x6d4aff, 0.24).setStrokeStyle(2, 0xf6d365, 0.82);
    this.add.text(62, 166, "✦", { fontSize: "24px", color: "#fff6d6" }).setOrigin(0.5);

    this.add
      .text(98, 146, "점술사", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        color: "#f6d365",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    this.add
      .text(
        98,
        176,
        "여행자여, 오늘 마음속에 머문 질문을 들려주세요.\n질문은 짧아도 괜찮습니다. 진심이면 충분합니다.",
        {
          fontFamily: "system-ui, sans-serif",
          fontSize: "15px",
          color: "#f8f0ff",
          lineSpacing: 7,
          wordWrap: { width: 238 },
        },
      )
      .setOrigin(0, 0);
  }

  private createCategoryButtons(): void {
    this.add
      .text(28, 306, "질문의 영역", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        color: "#f6d365",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    const buttonWidth = 152;
    const buttonHeight = 42;
    const startX = 28;
    const startY = 334;
    const gapX = 14;
    const gapY = 12;

    categories.forEach((category, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = startX + col * (buttonWidth + gapX);
      const y = startY + row * (buttonHeight + gapY);
      const button = this.createCategoryButton(category, x, y, buttonWidth, buttonHeight);
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
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    const label = this.add
      .text(width / 2, height / 2, categoryLabels[category], {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#f8f0ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(width, height);
    container.setData("bg", bg);
    container.setData("label", label);
    container.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);

    container.on("pointerdown", () => {
      this.selectedCategory = category;
      this.refreshCategoryButtons();
    });

    return container;
  }

  private refreshCategoryButtons(): void {
    categories.forEach((category) => {
      const button = this.categoryButtons[category];
      if (!button) return;

      const bg = button.getData("bg") as Phaser.GameObjects.Graphics;
      const label = button.getData("label") as Phaser.GameObjects.Text;
      const selected = category === this.selectedCategory;

      bg.clear();
      bg.fillStyle(selected ? 0x6d4aff : 0x1b1238, selected ? 0.86 : 0.74);
      bg.fillRoundedRect(0, 0, 152, 42, 14);
      bg.lineStyle(2, selected ? 0xf6d365 : 0x6d4aff, selected ? 0.95 : 0.46);
      bg.strokeRoundedRect(0, 0, 152, 42, 14);
      label.setColor(selected ? "#fff6d6" : "#f8f0ff");
    });
  }

  private createQuestionInput(): void {
    this.add
      .text(28, 520, "질문", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        color: "#f6d365",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    const textarea = document.createElement("textarea");
    textarea.className = "arcana-question-input";
    textarea.maxLength = 500;
    textarea.placeholder = "예: 이번 프로젝트는 잘 풀릴까?";

    this.questionInput = this.add.dom(GAME_WIDTH / 2, 592, textarea).setOrigin(0.5);

    this.warningText = this.add
      .text(GAME_WIDTH / 2, 684, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#ffb6c8",
        align: "center",
      })
      .setOrigin(0.5);
  }

  private createNextButton(): void {
    const width = 258;
    const height = 58;
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT - 92;

    const panel = this.add.graphics();
    panel.fillStyle(0x1b1238, 0.94);
    panel.fillRoundedRect(x - width / 2, y - height / 2, width, height, 18);
    panel.lineStyle(2, 0xf6d365, 0.9);
    panel.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 18);

    const label = this.add
      .text(x, y, "카드를 펼칠 준비", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "19px",
        color: "#fff6d6",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const hitArea = this.add.zone(x, y, width, height).setInteractive({ useHandCursor: true });

    hitArea.on("pointerover", () => {
      this.tweens.add({ targets: [panel, label], scale: 1.025, duration: 120, ease: "Sine.easeOut" });
    });

    hitArea.on("pointerout", () => {
      this.tweens.add({ targets: [panel, label], scale: 1, duration: 120, ease: "Sine.easeOut" });
    });

    hitArea.on("pointerdown", () => this.submitQuestion());
  }

  private submitQuestion(): void {
    const node = this.questionInput?.node as HTMLTextAreaElement | undefined;
    const question = node?.value.trim() ?? "";

    if (question.length < 3) {
      this.warningText?.setText("카드가 들을 수 있도록 질문을 조금 더 적어주세요.");
      return;
    }

    const draft: ReadingDraft = {
      category: this.selectedCategory,
      question,
    };

    this.warningText?.setText("");
    this.cameras.main.fadeOut(320, 9, 7, 26);
    this.time.delayedCall(340, () => {
      this.scene.start("CardSelectScene", draft);
    });
  }
}
