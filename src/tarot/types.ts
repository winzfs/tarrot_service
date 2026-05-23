export type TarotCard = {
  id: string;
  arcana: "major";
  number: number;
  roman: string;
  name: string;
  koreanName: string;
  keywords: string[];
  description: string;
  visual: {
    symbol: string;
    palette: "neutral" | "bright" | "dark" | "danger" | "hope";
  };
};

export type DrawnCard = TarotCard & {
  position: string;
};

export type TarotReading = {
  title: string;
  summary: string;
  cards: {
    position: string;
    name: string;
    koreanName: string;
    reading: string;
  }[];
  advice: string;
  npcLine: string;
};
