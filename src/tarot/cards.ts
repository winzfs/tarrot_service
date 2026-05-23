import imagesData from "../../images/images.json";
import type { TarotCard } from "./types";

const imageModules = import.meta.glob("../../images/*.{jpg,jpeg,png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

type ImageCard = {
  name: string;
  number: string;
  arcana: "Major Arcana" | "Minor Arcana";
  suit: string | null;
  img: string;
};

const majorKorean: Record<string, { koreanName: string; roman: string; keywords: string[]; description: string; symbol: string; palette: TarotCard["visual"]["palette"] }> = {
  "The Fool": { koreanName: "바보", roman: "0", keywords: ["시작", "모험", "가능성"], description: "새로운 길 앞에 선 순수한 시작의 상징.", symbol: "✦", palette: "bright" },
  "The Magician": { koreanName: "마법사", roman: "I", keywords: ["실행", "도구", "의지"], description: "가능성을 현실로 바꾸는 힘.", symbol: "⚚", palette: "bright" },
  "The High Priestess": { koreanName: "여사제", roman: "II", keywords: ["직감", "비밀", "내면"], description: "말로 드러나지 않는 지혜와 감각.", symbol: "☾", palette: "dark" },
  "The Empress": { koreanName: "여황제", roman: "III", keywords: ["풍요", "성장", "돌봄"], description: "자라나는 것들을 품는 풍요의 힘.", symbol: "♀", palette: "hope" },
  "The Emperor": { koreanName: "황제", roman: "IV", keywords: ["질서", "책임", "구조"], description: "흔들리는 것을 세우는 구조와 책임.", symbol: "♔", palette: "neutral" },
  "The Hierophant": { koreanName: "교황", roman: "V", keywords: ["전통", "가르침", "신뢰"], description: "축적된 지혜와 배움의 문.", symbol: "⚿", palette: "neutral" },
  "The Lovers": { koreanName: "연인", roman: "VI", keywords: ["관계", "선택", "조화"], description: "마음과 선택이 만나는 지점.", symbol: "♥", palette: "hope" },
  "The Chariot": { koreanName: "전차", roman: "VII", keywords: ["전진", "통제", "의지"], description: "상반된 힘을 붙잡고 앞으로 나아감.", symbol: "◈", palette: "bright" },
  Strength: { koreanName: "힘", roman: "VIII", keywords: ["용기", "인내", "부드러운 힘"], description: "강압이 아닌 부드러운 용기의 힘.", symbol: "∞", palette: "bright" },
  "The Hermit": { koreanName: "은둔자", roman: "IX", keywords: ["탐색", "고요", "내면"], description: "혼자만의 등불로 길을 찾는 시간.", symbol: "☼", palette: "dark" },
  "Wheel of Fortune": { koreanName: "운명의 수레바퀴", roman: "X", keywords: ["변화", "순환", "전환점"], description: "흐름이 바뀌는 운명의 회전.", symbol: "◎", palette: "bright" },
  Justice: { koreanName: "정의", roman: "XI", keywords: ["균형", "판단", "책임"], description: "선택의 무게와 공정한 판단.", symbol: "⚖", palette: "neutral" },
  "The Hanged Man": { koreanName: "매달린 사람", roman: "XII", keywords: ["멈춤", "관점 전환", "기다림"], description: "멈춤 속에서 다른 각도를 발견함.", symbol: "⊕", palette: "dark" },
  Death: { koreanName: "죽음", roman: "XIII", keywords: ["끝", "전환", "새 시작"], description: "무언가가 끝나며 새로운 형태가 열림.", symbol: "✧", palette: "danger" },
  Temperance: { koreanName: "절제", roman: "XIV", keywords: ["조화", "균형", "회복"], description: "서로 다른 흐름을 알맞게 섞는 지혜.", symbol: "♒", palette: "hope" },
  "The Devil": { koreanName: "악마", roman: "XV", keywords: ["집착", "속박", "유혹"], description: "스스로 묶인 사슬을 알아차리는 카드.", symbol: "♆", palette: "danger" },
  "The Tower": { koreanName: "탑", roman: "XVI", keywords: ["붕괴", "충격", "해방"], description: "낡은 구조가 무너지며 진실이 드러남.", symbol: "↯", palette: "danger" },
  "The Star": { koreanName: "별", roman: "XVII", keywords: ["희망", "치유", "영감"], description: "어둠 뒤에 남은 회복과 희망의 빛.", symbol: "★", palette: "hope" },
  "The Moon": { koreanName: "달", roman: "XVIII", keywords: ["불안", "직감", "숨겨진 길"], description: "안개 속 진실과 무의식의 상징.", symbol: "☽", palette: "dark" },
  "The Sun": { koreanName: "태양", roman: "XIX", keywords: ["활력", "기쁨", "명확함"], description: "가려진 것이 밝게 드러나는 시간.", symbol: "☀", palette: "bright" },
  Judgement: { koreanName: "심판", roman: "XX", keywords: ["각성", "부름", "재평가"], description: "다시 깨어나 선택을 바라보는 순간.", symbol: "♬", palette: "neutral" },
  "The World": { koreanName: "세계", roman: "XXI", keywords: ["완성", "통합", "성취"], description: "하나의 순환이 완성되고 넓은 문이 열림.", symbol: "◌", palette: "hope" },
};

const suitKorean: Record<string, string> = { Cups: "컵", Swords: "검", Wands: "완드", Pentacles: "펜타클" };
const suitKeywords: Record<string, string[]> = {
  Cups: ["감정", "관계", "치유"],
  Swords: ["생각", "판단", "갈등"],
  Wands: ["열정", "행동", "성장"],
  Pentacles: ["현실", "돈", "안정"],
};
const suitVisual: Record<string, TarotCard["visual"]> = {
  Cups: { symbol: "♢", palette: "hope" },
  Swords: { symbol: "†", palette: "neutral" },
  Wands: { symbol: "✦", palette: "bright" },
  Pentacles: { symbol: "◎", palette: "dark" },
};
const rankKorean: Record<string, string> = {
  Ace: "에이스",
  Two: "2",
  Three: "3",
  Four: "4",
  Five: "5",
  Six: "6",
  Seven: "7",
  Eight: "8",
  Nine: "9",
  Ten: "10",
  Page: "시종",
  Knight: "기사",
  Queen: "여왕",
  King: "왕",
};

function slug(value: string): string {
  return value.toLowerCase().replaceAll(" ", "_").replaceAll("'", "");
}

function imageUrl(fileName: string): string {
  return imageModules[`../../images/${fileName}`] ?? `/images/${fileName}`;
}

function normalizeSuit(suit: string | null): TarotCard["suit"] | undefined {
  if (!suit) return undefined;
  return suit.toLowerCase() as TarotCard["suit"];
}

function toTarotCard(card: ImageCard): TarotCard {
  const isMajor = card.arcana === "Major Arcana";
  const major = majorKorean[card.name];
  const [rank] = card.name.split(" of ");
  const suit = card.suit ?? "";
  const koreanName = isMajor ? major?.koreanName ?? card.name : `${suitKorean[suit] ?? suit} ${rankKorean[rank] ?? rank}`;
  const fileUrl = imageUrl(card.img);

  return {
    id: slug(card.name),
    arcana: isMajor ? "major" : "minor",
    number: Number(card.number),
    roman: isMajor ? major?.roman ?? card.number : card.number,
    name: card.name,
    koreanName,
    displayName: `${koreanName} (${card.name})`,
    keywords: isMajor ? major?.keywords ?? ["상징", "전환", "통찰"] : suitKeywords[suit] ?? ["흐름", "선택", "변화"],
    description: isMajor ? major?.description ?? "인생의 큰 흐름을 보여주는 카드." : `${suitKorean[suit] ?? suit}의 영역에서 상황의 흐름을 보여주는 카드.`,
    imageFile: card.img,
    imageUrl: fileUrl,
    imageKey: `tarot-${card.img}`,
    suit: normalizeSuit(card.suit),
    visual: isMajor ? { symbol: major?.symbol ?? "✦", palette: major?.palette ?? "neutral" } : suitVisual[suit] ?? { symbol: "✦", palette: "neutral" },
  };
}

export const allTarotCards: TarotCard[] = (imagesData.cards as ImageCard[]).map(toTarotCard);
export const majorArcana: TarotCard[] = allTarotCards.filter((card) => card.arcana === "major");

function drawCardsFrom(deck: TarotCard[], count: number): TarotCard[] {
  const shuffled = [...deck];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, count);
}

export function drawTarotCards(count: number): TarotCard[] {
  return drawCardsFrom(allTarotCards, count);
}

export function drawMajorArcana(count: number): TarotCard[] {
  return drawCardsFrom(majorArcana, count);
}
