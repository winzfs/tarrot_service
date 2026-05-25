from pathlib import Path

p = Path('src/game/scenes/QuestionScene.ts')
s = p.read_text()

s = s.replace(
    'private waitingSpreadRecommendation = false;',
    'private waitingSpreadRecommendation = false;\n  private dialogueSpreadPreviewObjects: Phaser.GameObjects.GameObject[] = [];\n  private dialogueSpreadPreviewTweens: Phaser.Tweens.Tween[] = [];'
)

s = s.replace(
    'button.label.setText(choice.label).setVisible(true);\n      button.hit.setInteractive({ useHandCursor: true });',
    'button.label.setText(choice.label).setPosition(x, y).setVisible(true);\n      button.hit.setPosition(x, y);\n      button.hit.setInteractive({ useHandCursor: true });'
)

helper = '''

  private clearDialogueSpreadPreview(): void {
    this.dialogueSpreadPreviewTweens.forEach((tween) => tween.stop());
    this.dialogueSpreadPreviewTweens = [];
    this.dialogueSpreadPreviewObjects.forEach((object) => object.destroy());
    this.dialogueSpreadPreviewObjects = [];
  }

  private getDialogueSpreadReason(spreadId: string): string {
    if (!this.isManualSpreadSelection && this.aiRecommendationReason) return this.aiRecommendationReason;
    if (spreadId === DAILY_ONE_CARD_SPREAD_ID) return "지금 가장 가까운 기운 하나를 조용히 비춥니다.";
    if (spreadId === SITUATION_ADVICE_SPREAD_ID) return "현재 상황, 막힌 지점, 다음 조언을 세 갈래로 엽니다.";
    if (spreadId === DEFAULT_SPREAD_ID) return "지나온 흐름, 지금의 자리, 다가오는 기운을 차례로 읽어냅니다.";
    if (spreadId === RELATIONSHIP_FIVE_SPREAD_ID) return "나와 상대의 마음, 관계의 결, 두 사람 사이의 다음 문을 깊게 비춥니다.";
    if (spreadId === CHOICE_FIVE_SPREAD_ID) return "두 갈래 선택이 품은 가능성과 각 길 끝의 조언을 비교합니다.";
    return "질문에 맞는 문이 조용히 열렸습니다.";
  }

  private showDialogueSpreadPreview(spreadId: string): void {
    this.clearDialogueSpreadPreview();
    const spread = getTarotSpread(spreadId);
    const count = spread.cardsToDraw;
    const cardWidth = sx(count >= 5 ? 42 : 50);
    const cardHeight = sy(count >= 5 ? 66 : 78);
    const gap = sx(count >= 5 ? 9 : 13);
    const totalWidth = count * cardWidth + (count - 1) * gap;
    const startX = GAME_WIDTH / 2 - totalWidth / 2 + cardWidth / 2;
    const y = sy(500);

    for (let index = 0; index < count; index += 1) {
      const x = startX + index * (cardWidth + gap);
      const halo = this.add.circle(x, y, ss(30), 0x6d4aff, 0.1).setDepth(40);
      const glow = this.add.circle(x, y, ss(34), 0xf6d365, 0.12).setDepth(41);
      const haloTween = this.tweens.add({ targets: halo, alpha: 0.22, scale: 1.18, duration: 1450 + index * 100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      const glowTween = this.tweens.add({ targets: glow, alpha: 0.28, scale: 1.12, duration: 1180 + index * 110, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.dialogueSpreadPreviewObjects.push(halo, glow);
      this.dialogueSpreadPreviewTweens.push(haloTween, glowTween);

      if (this.textures.exists("tarot-card-back")) {
        const card = this.add.image(x, y, "tarot-card-back").setDepth(42);
        card.setDisplaySize(cardWidth, cardHeight);
        const cardTween = this.tweens.add({ targets: card, y: y - sy(4), duration: 1520 + index * 90, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        this.dialogueSpreadPreviewObjects.push(card);
        this.dialogueSpreadPreviewTweens.push(cardTween);
      } else {
        const card = this.add.graphics().setDepth(42);
        card.fillStyle(0x120b2b, 0.98);
        card.fillRoundedRect(x - cardWidth / 2, y - cardHeight / 2, cardWidth, cardHeight, ss(8));
        card.lineStyle(ss(2), 0xf6d365, 0.86);
        card.strokeRoundedRect(x - cardWidth / 2, y - cardHeight / 2, cardWidth, cardHeight, ss(8));
        card.lineStyle(ss(1), 0x6d4aff, 0.72);
        card.strokeRoundedRect(x - cardWidth / 2 + sx(5), y - cardHeight / 2 + sy(5), cardWidth - sx(10), cardHeight - sy(10), ss(6));
        const sigil = this.add.text(x, y, "✦", { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: `${ss(16)}px`, color: "#fff6d6" }).setOrigin(0.5).setDepth(43);
        const sigilTween = this.tweens.add({ targets: sigil, alpha: 0.5, duration: 920 + index * 100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        this.dialogueSpreadPreviewObjects.push(card, sigil);
        this.dialogueSpreadPreviewTweens.push(sigilTween);
      }
    }
  }
'''

if 'private showDialogueSpreadPreview(spreadId: string): void' not in s:
    s = s.replace('\n  private setDialogue(title: string, lines: string[]): void {', helper + '\n  private setDialogue(title: string, lines: string[]): void {')

s = s.replace(
    'this.dialogueStep = step;\n    this.applyDialogueVisibilityForStep(step);',
    'this.dialogueStep = step;\n    this.clearDialogueSpreadPreview();\n    this.applyDialogueVisibilityForStep(step);'
)

s = s.replace(
    'this.setDialogue("의식 3/5 · 배열 제안", [`${spread.name} (${spread.cardsToDraw}장)`, (this.aiRecommendationReason ?? "질문에 맞는 문이 열렸습니다.").slice(0, 64)]);',
    'this.setDialogue("의식 3/5 · 배열 제안", [`${spread.name} (${spread.cardsToDraw}장)`, this.getDialogueSpreadReason(spreadId).slice(0, 92)]);\n      this.showDialogueSpreadPreview(spreadId);'
)

s = s.replace('const visible = this.currentPhase === "assist" && !!option && !assistLimitReached;', 'const visible = false; // dialogue choices replace legacy assist buttons')
s = s.replace('const showManualSpreadChoices = this.currentPhase === "spread" && !!this.aiRecommendedSpreadId;', 'const showManualSpreadChoices = false; // dialogue choices replace legacy spread grid')
s = s.replace('const visible = this.currentPhase === "spread" && showPreview && !!position;', 'const visible = false; // dialogue reveal replaces legacy preview slots')

p.write_text(s)
print('patched QuestionScene spread preview')
