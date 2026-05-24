import Phaser from "phaser";

export class TextObjectPool {
  private readonly free: Phaser.GameObjects.Text[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  acquire(style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
    const node = this.free.pop();
    if (node) {
      node.setStyle(style);
      node.setActive(true).setVisible(true);
      return node;
    }
    return this.scene.add.text(0, 0, "", style);
  }

  release(node: Phaser.GameObjects.Text): void {
    node.setText("");
    node.setActive(false).setVisible(false);
    this.free.push(node);
  }

  clear(): void {
    this.free.forEach((node) => node.destroy());
    this.free.length = 0;
  }
}
