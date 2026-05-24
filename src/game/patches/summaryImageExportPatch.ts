import { exportSummaryImage } from "../utils/summaryImageExport";
import { SummaryScene } from "../scenes/SummaryScene";

function getSummaryCards(scene: SummaryScene) {
  const sceneAny = scene as any;
  const data = sceneAny.sceneData;
  if (!data) return [];

  return data.cards.map((drawnCard: any, index: number) => {
    const readingCard = data.reading.cards[index];
    return {
      position: drawnCard.position,
      name: drawnCard.name,
      koreanName: drawnCard.koreanName,
      reading: readingCard?.reading ?? drawnCard.description,
      imageKey: drawnCard.imageKey,
    };
  });
}

(SummaryScene.prototype as any).saveSummaryImage = function patchedSaveSummaryImage(this: SummaryScene): void {
  const sceneAny = this as any;
  const data = sceneAny.sceneData;
  if (!data) return;

  exportSummaryImage(this, data, getSummaryCards(this));
  sceneAny.setActionFeedback?.("이미지를 저장했습니다.");
};
