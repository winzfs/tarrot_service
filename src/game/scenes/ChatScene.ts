import Phaser from "phaser";
import { requestChat } from "../../api/client";
import type { ChatMessage } from "../../api/types";
import { GAME_HEIGHT, GAME_WIDTH, sy, ss } from "../GameConfig";
import { drawMysticBackground } from "../ui/drawPanel";
import type { ChatSceneData } from "./ReadingScene";

export class ChatScene extends Phaser.Scene {
  private sceneData?: ChatSceneData;
  private messages: ChatMessage[] = [];
  private shell?: HTMLElement;
  private messagesNode?: HTMLElement;
  private inputNode?: HTMLTextAreaElement;
  private domElement?: Phaser.GameObjects.DOMElement;
  private isSending = false;

  constructor() {
    super("ChatScene");
  }

  init(data: ChatSceneData): void {
    this.sceneData = data;
    this.messages = [
      {
        role: "assistant",
        content: data.reading.npcLine || "세 장의 별빛은 아직 꺼지지 않았습니다. 더 묻고 싶은 것이 있다면, 조용히 말해보세요.",
      },
    ];
  }

  create(): void {
    drawMysticBackground(this, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(GAME_WIDTH / 2, sy(48), "다시 묻는 방", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${ss(30)}px`,
        color: "#f8f0ff",
        stroke: "#2c174f",
        strokeThickness: ss(5),
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, sy(82), "꺼지지 않은 별빛에 한 번 더 질문하세요.", {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${ss(13)}px`,
        color: "#cdbdff",
        align: "center",
      })
      .setOrigin(0.5);

    this.createChatDom();
  }

  private createChatDom(): void {
    const shell = document.createElement("section");
    shell.className = "arcana-chat-shell";
    shell.innerHTML = `
      <div class="arcana-chat-panel">
        <div class="arcana-reading-summary chat-summary">
          <strong>봉인된 리딩</strong><br />
          ${this.escapeHtml(this.sceneData?.reading.summary ?? "카드의 흐름을 바탕으로 더 물어볼 수 있습니다.")}
        </div>
        <div class="arcana-chat-messages" data-chat-messages></div>
      </div>
      <form class="arcana-chat-form" data-chat-form>
        <textarea class="arcana-chat-input" data-chat-input maxlength="500" rows="1" placeholder="별빛에 다시 묻고 싶은 질문은?"></textarea>
        <button class="arcana-button" type="submit">묻기</button>
      </form>
    `;

    this.shell = shell;
    this.messagesNode = shell.querySelector<HTMLElement>("[data-chat-messages]") ?? undefined;
    this.inputNode = shell.querySelector<HTMLTextAreaElement>("[data-chat-input]") ?? undefined;

    const form = shell.querySelector<HTMLFormElement>("[data-chat-form]");
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      void this.sendMessage();
    });

    this.domElement = this.add.dom(GAME_WIDTH / 2, sy(450), shell).setOrigin(0.5);
    this.renderMessages();
  }

  private async sendMessage(): Promise<void> {
    if (!this.sceneData || !this.inputNode || this.isSending) return;

    const content = this.inputNode.value.trim();
    if (content.length < 2) return;

    this.inputNode.value = "";
    this.messages.push({ role: "user", content });
    this.renderMessages("점술사가 남은 별빛을 다시 들여다보고 있습니다...");
    this.isSending = true;

    try {
      const response = await requestChat({
        question: this.sceneData.draft.question,
        readingSummary: `${this.sceneData.reading.title}\n${this.sceneData.reading.summary}\n${this.sceneData.reading.advice}`,
        cards: this.sceneData.cards,
        messages: this.messages,
      });

      this.messages.push({ role: "assistant", content: response.message });
    } catch {
      this.messages.push({
        role: "assistant",
        content: "안개가 잠시 짙어졌습니다. 별빛이 다시 맑아지면 한 번 더 물어보세요.",
      });
    } finally {
      this.isSending = false;
      this.renderMessages();
    }
  }

  private renderMessages(pendingMessage?: string): void {
    if (!this.messagesNode) return;

    const renderedMessages = [...this.messages];
    if (pendingMessage) renderedMessages.push({ role: "assistant", content: pendingMessage });

    this.messagesNode.innerHTML = renderedMessages
      .map(
        (message) => `
          <div class="arcana-chat-message ${message.role}">
            <div class="arcana-chat-speaker">${message.role === "user" ? "나의 질문" : "점술사"}</div>
            ${this.escapeHtml(message.content)}
          </div>
        `,
      )
      .join("");

    const panel = this.shell?.querySelector<HTMLElement>(".arcana-chat-panel");
    if (panel) {
      requestAnimationFrame(() => {
        panel.scrollTop = panel.scrollHeight;
      });
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}
