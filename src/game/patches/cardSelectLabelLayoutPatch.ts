import Phaser from "phaser";
import { sx, sy } from "../GameConfig";
import { CardSelectScene } from "../scenes/CardSelectScene";

type RuntimeCardView = {
  container: Phaser.GameObjects.Container;
  front: Phaser.GameObjects.Container;
  layout: { cardHeight: number; cardWidth: number };
};

function isTextObject(object: Phaser.GameObjects.GameObject): object is Phaser.GameObjects.Text {
  return object instanceof Phaser.GameObjects.Text;
}

function adjustCardLabelLayout(scene: Phaser.Scene): void {
  const views = ((scene as unknown as Record<string, unknown>).cardViews as RuntimeCardView[] | undefined) ?? [];

  views.forEach((view) => {
    const directTexts = view.container.list.filter(isTextObject);
    const positionLabel = directTexts[0];
    positionLabel?.setY(view.layout.cardHeight + sy(7));

    const frontTexts = view.front.list.filter(isTextObject);
    const koreanName = frontTexts[0];
    const englishName = frontTexts[1];

    koreanName?.setY(view.layout.cardHeight - sy(view.layout.cardWidth < sx(90) ? 21 : 24));
    englishName?.setY(view.layout.cardHeight - sy(view.layout.cardWidth < sx(90) ? 7 : 9));
  });
}

export function installCardSelectLabelLayoutPatch(): void {
  const prototype = CardSelectScene.prototype as unknown as Record<string, unknown>;
  if (prototype.__cardSelectLabelLayoutPatchInstalled) return;
  prototype.__cardSelectLabelLayoutPatchInstalled = true;

  const originalCreateSealedCards = prototype.createSealedCards as (this: Phaser.Scene) => void;
  prototype.createSealedCards = function patchedCreateSealedCards(this: Phaser.Scene): void {
    originalCreateSealedCards.call(this);
    adjustCardLabelLayout(this);
  };
}
