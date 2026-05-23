import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import { drawMysticBackground } from "../ui/drawPanel";
import { addRuneRing, addSigil, addSoftGlow, createMagicBeam, playBurst, playSmoke, spawnTextureSparkles } from "../vfx/vfxEffects";
import { allVfxAssets, getVfxAssetsByCategory } from "../vfx/vfxLibrary";

type Category = "intro" | "question" | "altar" | "reveal" | "chapter" | "finale" | "chat";
type Kind = "stars" | "door" | "card" | "seal" | "ink" | "pulse" | "runes" | "beams" | "mist" | "orbs" | "constellation" | "burst" | "smoke" | "rune" | "glow" | "chapter" | "dust" | "gate" | "aura" | "finale" | "orb" | "fusion" | "chatGlow" | "memory";

type Sample = {
  id: string;
  category: Category;
  title: string;
  description: string;
  kind: Kind;
  tone: number;
  speed: number;
};

type Button = {
  root: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  width: number;
  height: number;
};

const labels: Record<Category, string> = {
  intro: "인트로",
  question: "질문 봉인",
  altar: "카드 선택",
  reveal: "카드 공개",
  chapter: "챕터",
  finale: "종장",
  chat: "대화",
};

const tones = {
  violet: 0xb58cff,
  gold: 0xf6d365,
  blue: 0x8ee6ff,
  white: 0xffffff,
  dark: 0x6d4aff,
};

export class VfxGalleryScrollScene extends Phaser.Scene {
  private category: Category = "intro";
  private samples: Sample[] = [];
  private selected?: Sample;
  private previewItems: Phaser.GameObjects.GameObject[] = [];
  private titleText?: Phaser.GameObjects.Text;
  private descText?: Phaser.GameObjects.Text;
  private sampleList?: Phaser.GameObjects.Container;
  private sampleButtons: Button[] = [];
  private categoryButtons: Partial<Record<Category, Button>> = {};
  private scrollY = 0;
  private maxScroll = 0;
  private dragStartY = 0;
  private dragStartScroll = 0;
  private dragging = false;
  private listMask?: Phaser.Display.Masks.GeometryMask;

  constructor() {
    super("VfxGalleryScene");
  }

  create(): void {
    drawMysticBackground(this, GAME_WIDTH, GAME_HEIGHT);
    this.samples = this.makeSamples();
    this.drawHeader();
    this.drawCategories();
    this.drawPreviewFrame();
    this.drawListFrame();
    this.renderList();
    this.pick(this.filtered()[0]);
  }

  private drawHeader(): void {
    this.add.text(GAME_WIDTH / 2, sy(44), "연출 샘플 갤러리", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${ss(30)}px`,
      color: "#f8f0ff",
      stroke: "#2c174f",
      strokeThickness: ss(5),
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, sy(82), "목록을 드래그해서 스크롤하고, 샘플을 누르면 바로 재생됩니다.", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(13)}px`,
      color: "#cdbdff",
    }).setOrigin(0.5);

    this.makeButton(sx(28), sy(26), sx(116), sy(46), "← 인트로", () => this.scene.start("IntroScene"), ss(13));

    this.add.text(GAME_WIDTH / 2, sy(118), `로드된 VFX ${allVfxAssets.length}개 · glow ${getVfxAssetsByCategory("glow").length} / ring ${getVfxAssetsByCategory("ring").length} / beam ${getVfxAssetsByCategory("beam").length} / smoke ${getVfxAssetsByCategory("smoke").length}`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(11)}px`,
      color: "#8f7cc8",
      align: "center",
    }).setOrigin(0.5);
  }

  private drawCategories(): void {
    const cats: Category[] = ["intro", "question", "altar", "reveal", "chapter", "finale", "chat"];
    cats.forEach((cat, i) => {
      const button = this.makeButton(sx(28) + i * sx(104), sy(146), sx(96), sy(48), labels[cat], () => {
        this.category = cat;
        this.refreshCategoryButtons();
        this.renderList();
        this.pick(this.filtered()[0]);
      }, ss(12));
      this.categoryButtons[cat] = button;
    });
    this.refreshCategoryButtons();
  }

  private drawPreviewFrame(): void {
    const frame = this.add.graphics();
    frame.fillStyle(0x09071a, 0.36);
    frame.fillRoundedRect(sx(34), sy(284), GAME_WIDTH - sx(68), sy(830), ss(34));
    frame.lineStyle(ss(3), 0xf6d365, 0.32);
    frame.strokeRoundedRect(sx(34), sy(284), GAME_WIDTH - sx(68), sy(830), ss(34));

    this.titleText = this.add.text(GAME_WIDTH / 2, sy(320), "", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${ss(24)}px`,
      color: "#fff6d6",
      align: "center",
    }).setOrigin(0.5);

    this.descText = this.add.text(GAME_WIDTH / 2, sy(358), "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(13)}px`,
      color: "#d9c8ff",
      align: "center",
      wordWrap: { width: sx(330) },
    }).setOrigin(0.5);

    this.makeButton(GAME_WIDTH / 2 - sx(92), sy(1140), sx(184), sy(54), "다시 재생", () => this.selected && this.play(this.selected), ss(14));
  }

  private drawListFrame(): void {
    const x = sx(38);
    const y = sy(1232);
    const w = GAME_WIDTH - sx(76);
    const h = sy(646);

    this.add.text(x, y - sy(42), "샘플 목록", {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(14)}px`,
      color: "#f6d365",
      fontStyle: "bold",
    }).setOrigin(0, 0.5);

    const frame = this.add.graphics();
    frame.fillStyle(0x09071a, 0.24);
    frame.fillRoundedRect(x - sx(8), y - sy(8), w + sx(16), h + sy(16), ss(22));
    frame.lineStyle(ss(2), 0x6d4aff, 0.36);
    frame.strokeRoundedRect(x - sx(8), y - sy(8), w + sx(16), h + sy(16), ss(22));

    const maskShape = this.make.graphics({ x: 0, y: 0 }, false);
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(x - sx(8), y - sy(8), w + sx(16), h + sy(16));
    this.listMask = maskShape.createGeometryMask();

    this.sampleList = this.add.container(x, y).setMask(this.listMask);

    const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.dragStartY = pointer.y;
      this.dragStartScroll = this.scrollY;
    });
    this.input.on("pointerup", () => {
      this.dragging = false;
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      this.setScroll(this.dragStartScroll - (pointer.y - this.dragStartY));
    });
    this.input.on("wheel", (pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) => {
      if (pointer.x < x || pointer.x > x + w || pointer.y < y || pointer.y > y + h) return;
      this.setScroll(this.scrollY + dy * 0.9);
    });
  }

  private renderList(): void {
    this.sampleButtons.forEach((button) => button.root.destroy(true));
    this.sampleButtons = [];
    const items = this.filtered();
    const buttonW = sx(470);
    const buttonH = sy(78);
    const gapX = sx(18);
    const gapY = sy(14);

    items.forEach((sample, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const button = this.makeListButton(col * (buttonW + gapX), row * (buttonH + gapY), buttonW, buttonH, sample.title, () => this.pick(sample));
      this.sampleButtons.push(button);
      this.sampleList?.add(button.root);
    });

    const rows = Math.ceil(items.length / 2);
    this.maxScroll = Math.max(0, rows * (buttonH + gapY) - sy(626));
    this.setScroll(0);
  }

  private makeButton(x: number, y: number, w: number, h: number, text: string, onClick: () => void, fontSize: number): Button {
    const root = this.add.container(x, y);
    const bg = this.add.graphics();
    const label = this.add.text(w / 2, h / 2, text, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${fontSize}px`,
      color: "#f8f0ff",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);
    const zone = this.add.zone(w / 2, h / 2, w + sx(12), h + sy(10)).setInteractive({ useHandCursor: true });
    zone.on("pointerdown", onClick);
    root.add([bg, label, zone]);
    this.paint(bg, w, h, false);
    return { root, bg, label, zone, width: w, height: h };
  }

  private makeListButton(x: number, y: number, w: number, h: number, text: string, onClick: () => void): Button {
    const root = this.add.container(x, y);
    const bg = this.add.graphics();
    const label = this.add.text(w / 2, h / 2, text, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${ss(12)}px`,
      color: "#f8f0ff",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: w - sx(26) },
    }).setOrigin(0.5);
    const zone = this.add.zone(w / 2, h / 2, w, h).setInteractive({ useHandCursor: true });
    zone.on("pointerup", onClick);
    root.add([bg, label, zone]);
    this.paint(bg, w, h, false);
    return { root, bg, label, zone, width: w, height: h };
  }

  private paint(bg: Phaser.GameObjects.Graphics, w: number, h: number, selected: boolean): void {
    bg.clear();
    bg.fillStyle(selected ? 0x6d4aff : 0x1b1238, selected ? 0.88 : 0.76);
    bg.fillRoundedRect(0, 0, w, h, ss(15));
    bg.lineStyle(ss(2), selected ? 0xf6d365 : 0x6d4aff, selected ? 0.92 : 0.46);
    bg.strokeRoundedRect(0, 0, w, h, ss(15));
  }

  private refreshCategoryButtons(): void {
    Object.entries(this.categoryButtons).forEach(([cat, button]) => {
      if (!button) return;
      const selected = cat === this.category;
      this.paint(button.bg, button.width, button.height, selected);
      button.label.setColor(selected ? "#fff6d6" : "#f8f0ff");
    });
  }

  private setScroll(value: number): void {
    this.scrollY = Phaser.Math.Clamp(value, 0, this.maxScroll);
    if (this.sampleList) this.sampleList.y = sy(1232) - this.scrollY;
  }

  private filtered(): Sample[] {
    return this.samples.filter((sample) => sample.category === this.category);
  }

  private pick(sample?: Sample): void {
    if (!sample) return;
    this.selected = sample;
    this.titleText?.setText(sample.title);
    this.descText?.setText(sample.description);
    this.play(sample);
  }

  private clearPreview(): void {
    this.tweens.killAll();
    this.previewItems.forEach((item) => item.destroy());
    this.previewItems = [];
  }

  private track<T extends Phaser.GameObjects.GameObject>(item: T): T {
    this.previewItems.push(item);
    return item;
  }

  private makeSamples(): Sample[] {
    return [
      ...this.group("intro", "INT", [["별빛 점등형", "별먼지가 켜지고 중심 로고가 떠오름", "stars", tones.violet], ["문 열림형", "룬 링이 열리며 운명의 문이 열림", "door", tones.gold], ["카드 현현형", "어둠 속에서 카드 한 장이 빛으로 나타남", "card", tones.violet], ["달빛 프롤로그", "푸른 달빛과 안개가 깔리는 조용한 시작", "stars", tones.blue], ["황금 마법진", "금빛 링이 크게 회전하며 타이틀을 소환", "door", tones.gold], ["검은 거울", "어두운 핵에서 빛이 번져 나옴", "pulse", tones.dark], ["별문 균열", "중앙 sigil이 갈라지며 빛이 새어 나옴", "door", tones.white], ["카드 낙하", "카드가 위에서 내려와 정지", "card", tones.gold], ["보랏빛 심연", "보라 안개 속에서 UI가 늦게 드러남", "stars", tones.violet], ["프롤로그 컷신", "문구와 카드가 순서대로 나타나는 컷신", "card", tones.blue]]),
      ...this.group("question", "QST", [["별빛 봉인형", "질문 문장이 봉인 문양에 흡수됨", "seal", tones.gold], ["잉크 봉인형", "문장이 안개와 잉크처럼 번지며 봉인됨", "ink", tones.dark], ["맥동 봉인형", "봉인 문양이 심장처럼 맥동", "pulse", tones.violet], ["룬 각인형", "질문이 룬 조각으로 흩어져 링을 만듦", "runes", tones.gold], ["달빛 흡수형", "푸른 빛이 질문을 감싸며 흡수", "seal", tones.blue], ["금빛 도장형", "도장 찍듯 sigil이 남음", "pulse", tones.gold], ["안개 소거형", "질문이 안개에 가려졌다 사라짐", "ink", tones.violet], ["별가루 분해형", "글자가 별가루처럼 흩어짐", "runes", tones.white], ["심연 낙인형", "어두운 핵에서 봉인 표식이 떠오름", "pulse", tones.dark], ["기도문 접힘형", "문장이 접혀 중심으로 들어감", "seal", tones.violet], ["은빛 봉투형", "질문이 빛 봉투처럼 접힘", "seal", tones.white], ["삼중 봉인형", "링 세 겹이 순서대로 닫힘", "runes", tones.blue]]),
      ...this.group("altar", "ALT", [["세 갈래 분화형", "중앙 봉인이 세 카드로 빛을 나눔", "beams", tones.gold], ["안개 속 제단형", "카드들이 안개 속에서 떠오름", "mist", tones.violet], ["봉인 부유형", "각 카드 위에 작은 봉인 구체가 부유", "orbs", tones.blue], ["별자리 연결형", "세 카드가 별자리 선으로 연결됨", "constellation", tones.white], ["황금 제단형", "금빛 중심에서 카드들이 점화됨", "beams", tones.gold], ["청색 예언형", "푸른 빛줄기가 미래감을 강조", "beams", tones.blue], ["보라 안개형", "제단 아래에서 보라 안개가 흐름", "mist", tones.violet], ["삼중 오브형", "세 오브가 카드 위에서 회전", "orbs", tones.gold], ["심연 제단형", "어두운 빛이 카드를 깨움", "mist", tones.dark], ["별점 배치형", "카드 주변 별점이 먼저 찍힘", "constellation", tones.blue], ["빛의 길형", "카드까지 이어지는 길처럼 beam 표시", "beams", tones.white], ["봉인 대기형", "카드가 닫힌 봉인처럼 호흡", "orbs", tones.violet]]),
      ...this.group("reveal", "REV", [["빛 폭발형", "뒤집는 순간 폭발광과 파편", "burst", tones.gold], ["안개 걷힘형", "안개가 걷히며 카드가 드러남", "smoke", tones.violet], ["룬 해제형", "카드 표면의 룬 링이 해제됨", "rune", tones.gold], ["잔광 유지형", "카드 공개 후 후광이 길게 남음", "glow", tones.blue], ["백색 섬광형", "완전히 하얗게 빛난 뒤 등장", "burst", tones.white], ["보라 파동형", "보라 링이 퍼지며 카드 공개", "rune", tones.violet], ["금빛 파편형", "작은 금빛 조각이 튐", "burst", tones.gold], ["연기 현현형", "카드가 연기 뒤에서 나타남", "smoke", tones.dark], ["푸른 예지형", "푸른 잔광이 미래적 느낌", "glow", tones.blue], ["작은 폭발형", "짧고 빠른 카드 공개용", "burst", tones.white], ["느린 현현형", "천천히 드러나는 고급 공개", "smoke", tones.violet], ["봉인 균열형", "룬이 회전하다 부서짐", "rune", tones.dark], ["성스러운 공개형", "금색과 흰색 중심의 밝은 공개", "glow", tones.gold], ["심연 공개형", "어둡게 눌렀다가 강한 빛", "burst", tones.dark]]),
      ...this.group("chapter", "CHP", [["챕터 문구 소환형", "챕터 제목이 빛 속에서 나타남", "chapter", tones.gold], ["별가루 조립형", "별먼지가 모여 문구를 조립", "dust", tones.white], ["문 열림형", "빛의 문 사이에서 카드가 나타남", "gate", tones.gold], ["카드 후광형", "카드 뒤에 챕터별 후광 유지", "aura", tones.violet], ["과거 잔상형", "보라 잔광과 느린 텍스트 이동", "aura", tones.dark], ["현재 점화형", "금빛 중심광이 강하게 켜짐", "chapter", tones.gold], ["미래 별안개형", "청색 안개와 별가루로 카드 등장", "dust", tones.blue], ["고요한 장면형", "연출을 줄여 대화 집중", "aura", tones.white], ["룬 장막형", "링 뒤에서 제목이 나타남", "gate", tones.violet], ["수직 상승형", "문구가 아래에서 위로 올라감", "chapter", tones.blue], ["장면 전환형", "beam으로 화면을 가르며 카드 등장", "gate", tones.white], ["속삭임형", "작은 빛과 문구만 조용히 표시", "aura", tones.gold]]),
      ...this.group("finale", "FIN", [["세 줄기 계시형", "세 방향 빛이 중앙으로 모임", "finale", tones.gold], ["계시 구체형", "중앙 구체와 링이 조언을 감쌈", "orb", tones.violet], ["카드 융합형", "세 카드가 빛으로 합쳐짐", "fusion", tones.white], ["황금 종장형", "금빛 ring과 core가 천천히 커짐", "orb", tones.gold], ["청색 별핵형", "푸른 코어가 천천히 맥동", "finale", tones.blue], ["심연 계시형", "어두운 중심에서 조언이 떠오름", "orb", tones.dark], ["파편 수렴형", "파편들이 중앙으로 모여 폭발", "fusion", tones.gold], ["은빛 마무리형", "흰빛이 부드럽게 모임", "finale", tones.white], ["느린 계시형", "문장 페이드에 맞춘 느린 중심광", "orb", tones.violet], ["컷신 종장형", "세 카드가 사라지고 큰 섬광", "fusion", tones.blue]]),
      ...this.group("chat", "CHAT", [["점술사 촛불형", "대화창 뒤 빛이 촛불처럼 호흡", "chatGlow", tones.gold], ["카드 기억형", "이전 카드의 잔상이 배경에 남음", "memory", tones.violet], ["푸른 수정구형", "푸른 코어가 대화창 뒤에서 맥동", "chatGlow", tones.blue], ["별먼지 응답형", "답변 등장 시 작은 별먼지", "memory", tones.white], ["어두운 상담실", "낮은 조도와 보라 glow 중심", "chatGlow", tones.dark], ["금빛 속삭임", "점술사 메시지 뒤 금빛 pulse", "chatGlow", tones.gold], ["기억의 잔상", "카드 실루엣이 희미하게 흔들림", "memory", tones.blue], ["고요한 재질문", "효과를 절제한 후속 대화용", "chatGlow", tones.white]]),
    ];
  }

  private group(category: Category, prefix: string, rows: Array<[string, string, Kind, number]>): Sample[] {
    return rows.map(([name, description, kind, tone], i) => ({ id: `${prefix}-${i}`, category, title: `${prefix}-${String(i + 1).padStart(2, "0")} ${name}`, description, kind, tone, speed: 1 + (i % 3) * 0.1 }));
  }

  private play(sample: Sample): void {
    this.clearPreview();
    switch (sample.kind) {
      case "stars": return this.playStars(sample);
      case "door": return this.playDoor(sample);
      case "card": return this.playCardAppear(sample);
      case "seal": return this.playSeal(sample);
      case "ink": return this.playInk(sample);
      case "pulse": return this.playPulse(sample);
      case "runes": return this.playRunes(sample);
      case "beams": return this.playBeams(sample);
      case "mist": return this.playMist(sample);
      case "orbs": return this.playOrbs(sample);
      case "constellation": return this.playConstellation(sample);
      case "burst": return this.playBurstReveal(sample);
      case "smoke": return this.playSmokeReveal(sample);
      case "rune": return this.playRuneReveal(sample);
      case "glow": return this.playGlowReveal(sample);
      case "chapter": return this.playChapter(sample);
      case "dust": return this.playChapterDust(sample);
      case "gate": return this.playChapterGate(sample);
      case "aura": return this.playChapterAura(sample);
      case "finale": return this.playFinale(sample);
      case "orb": return this.playFinaleOrb(sample);
      case "fusion": return this.playFusion(sample);
      case "chatGlow": return this.playChatGlow(sample);
      case "memory": return this.playMemory(sample);
    }
  }

  private center(): { x: number; y: number } { return { x: GAME_WIDTH / 2, y: sy(720) }; }

  private card(x: number, y: number, scale = 1): Phaser.GameObjects.Container {
    const c = this.track(this.add.container(x, y));
    const g = this.add.graphics();
    g.fillStyle(0x160c32, 0.96);
    g.fillRoundedRect(-sx(72) * scale, -sy(108) * scale, sx(144) * scale, sy(216) * scale, ss(18) * scale);
    g.lineStyle(ss(3) * scale, 0xf6d365, 0.9);
    g.strokeRoundedRect(-sx(72) * scale, -sy(108) * scale, sx(144) * scale, sy(216) * scale, ss(18) * scale);
    c.add([g, this.add.text(0, 0, "✦", { fontFamily: "Georgia, serif", fontSize: `${ss(42 * scale)}px`, color: "#fff6d6" }).setOrigin(0.5)]);
    return c;
  }

  private playStars(sample: Sample): void { const {x,y}=this.center(); const glow=this.track(addSoftGlow(this,x,y,5,1.15)); const t=this.track(this.add.text(x,y,"ARCANA\nGATE",{fontFamily:"Georgia, serif",fontSize:`${ss(44)}px`,color:"#fff6d6",align:"center",stroke:"#2c174f",strokeThickness:ss(5)}).setOrigin(0.5).setAlpha(0)); this.tweens.add({targets:glow,alpha:.45,scale:1.8,duration:1000*sample.speed,yoyo:true,repeat:1}); this.tweens.add({targets:t,alpha:1,y:y-sy(10),delay:360,duration:850*sample.speed}); spawnTextureSparkles(this,x,y,10,42,ss(40),ss(230)); }
  private playDoor(sample: Sample): void { const {x,y}=this.center(); const glow=this.track(addSoftGlow(this,x,y,5,1)); const ring=this.track(addRuneRing(this,x,y,6,.65)); const sig=this.track(addSigil(this,x,y,7,.7)); this.tweens.add({targets:glow,alpha:.55,scale:1.7,duration:700*sample.speed}); this.tweens.add({targets:ring,alpha:.95,angle:360,scale:1.05,duration:1500*sample.speed}); this.tweens.add({targets:sig,alpha:1,scale:1.2,duration:600*sample.speed,yoyo:true}); playBurst(this,x,y,9,1.1); }
  private playCardAppear(sample: Sample): void { const {x,y}=this.center(); const c=this.card(x,y+sy(50),1.15).setAlpha(0).setScale(.7); const glow=this.track(addSoftGlow(this,x,y,4,1.1)); this.tweens.add({targets:glow,alpha:.42,scale:1.6,duration:850*sample.speed}); this.tweens.add({targets:c,alpha:1,y,scale:1,duration:850*sample.speed,delay:220}); spawnTextureSparkles(this,x,y,10,30,ss(30),ss(180)); }
  private playPulse(sample: Sample): void { const {x,y}=this.center(); const glow=this.track(addSoftGlow(this,x,y,4,.95)); const sig=this.track(addSigil(this,x,y,5,.72)); this.tweens.add({targets:glow,alpha:.46,scale:1.55,duration:600*sample.speed,yoyo:true,repeat:2}); this.tweens.add({targets:sig,alpha:1,scale:1.16,duration:600*sample.speed,yoyo:true,repeat:2}); }
  private playSeal(sample: Sample): void { const {x,y}=this.center(); const q=this.track(this.add.text(x,y-sy(150),"“내 길은 어디로 향할까?”",{fontFamily:"system-ui",fontSize:`${ss(22)}px`,color:"#f8f0ff"}).setOrigin(.5)); const glow=this.track(addSoftGlow(this,x,y,4,1)); const ring=this.track(addRuneRing(this,x,y,5,.5)); const sig=this.track(addSigil(this,x,y,6,.58)); this.tweens.add({targets:[glow,ring,sig],alpha:1,duration:520*sample.speed}); this.tweens.add({targets:ring,angle:220,duration:1100*sample.speed}); this.tweens.add({targets:q,y,scale:.12,alpha:0,delay:600,duration:850*sample.speed}); this.time.delayedCall(1180,()=>spawnTextureSparkles(this,x,y,10,36,ss(30),ss(180))); }
  private playInk(sample: Sample): void { const {x,y}=this.center(); const text=this.track(this.add.text(x,y-sy(60),"질문이 안개 속으로 스며듭니다",{fontFamily:"system-ui",fontSize:`${ss(21)}px`,color:"#f8f0ff"}).setOrigin(.5)); playSmoke(this,x,y,7,1.4); const sig=this.track(addSigil(this,x,y+sy(30),8,.55)); this.tweens.add({targets:text,alpha:.2,y:y-sy(10),duration:950*sample.speed}); this.tweens.add({targets:sig,alpha:1,scale:.95,delay:460,duration:700*sample.speed}); }
  private playRunes(sample: Sample): void { const {x,y}=this.center(); spawnTextureSparkles(this,x,y,10,58,ss(160),ss(260)); const ring=this.track(addRuneRing(this,x,y,8,.46)); const sig=this.track(addSigil(this,x,y,9,.48)); this.tweens.add({targets:ring,alpha:1,angle:360,scale:.95,duration:1300*sample.speed}); this.tweens.add({targets:sig,alpha:1,delay:620,duration:520}); }
  private playBeams(sample: Sample): void { const {x,y}=this.center(); const pts=[x-sx(260),x,x+sx(260)].map(cx=>({x:cx,y:y+sy(190)})); this.track(addSigil(this,x,y-sy(120),8,.56)).setAlpha(1); this.track(addRuneRing(this,x,y-sy(120),7,.45)).setAlpha(1); pts.forEach((p,i)=>{this.card(p.x,p.y,.68).setAlpha(.28); const b=this.track(createMagicBeam(this,x,y-sy(60),p.x,p.y,6,i===0?0xb58cff:i===1?sample.tone:0x8ee6ff)); this.tweens.add({targets:b,alpha:.85,delay:450+i*150,duration:420*sample.speed,yoyo:true,hold:240,onComplete:()=>b.destroy()});}); }
  private playMist(sample: Sample): void { const {x,y}=this.center(); playSmoke(this,x,y+sy(130),5,1.8); [-1,0,1].forEach((o,i)=>{const c=this.card(x+sx(210*o),y+sy(110),.72).setAlpha(0).setY(y+sy(160)); this.tweens.add({targets:c,alpha:1,y:y+sy(100),delay:260+i*220,duration:760*sample.speed});}); }
  private playOrbs(sample: Sample): void { const {x,y}=this.center(); [-1,0,1].forEach((o,i)=>{const cx=x+sx(210*o); this.card(cx,y+sy(120),.7).setAlpha(.88); const orb=this.track(addSoftGlow(this,cx,y-sy(40),8,.34)); const sig=this.track(addSigil(this,cx,y-sy(40),9,.22)); this.tweens.add({targets:[orb,sig],alpha:.8,y:"-=10",delay:i*120,duration:760*sample.speed,yoyo:true,repeat:1});}); }
  private playConstellation(sample: Sample): void { const {x,y}=this.center(); const pts=[{x:x-sx(240),y:y+sy(120)},{x,y:y-sy(60)},{x:x+sx(240),y:y+sy(120)}]; pts.forEach(p=>{const g=this.track(addSoftGlow(this,p.x,p.y,6,.24)); this.tweens.add({targets:g,alpha:.55,scale:.7,duration:600*sample.speed,yoyo:true});}); for(let i=0;i<2;i++){const b=this.track(createMagicBeam(this,pts[i].x,pts[i].y,pts[i+1].x,pts[i+1].y,5,sample.tone)); this.tweens.add({targets:b,alpha:.75,delay:300+i*240,duration:500*sample.speed,yoyo:true,hold:500});} }
  private playBurstReveal(sample: Sample): void { const {x,y}=this.center(); const c=this.card(x,y,1.1); this.tweens.add({targets:c,scaleX:.02,duration:450*sample.speed,onComplete:()=>{playBurst(this,x,y,10,1.25); c.setScale(.02,1); this.tweens.add({targets:c,scaleX:1,duration:620*sample.speed}); spawnTextureSparkles(this,x,y,11,36,ss(40),ss(220));}}); }
  private playSmokeReveal(sample: Sample): void { const {x,y}=this.center(); const c=this.card(x,y,1.1).setAlpha(.25); const glow=this.track(addSoftGlow(this,x,y,4,1)); this.tweens.add({targets:glow,alpha:.42,scale:1.5,duration:600*sample.speed}); playSmoke(this,x,y,10,1.45); this.tweens.add({targets:c,alpha:1,delay:620,duration:980*sample.speed}); }
  private playRuneReveal(sample: Sample): void { const {x,y}=this.center(); this.card(x,y,1.1); const ring=this.track(addRuneRing(this,x,y,8,.6)); this.tweens.add({targets:ring,alpha:1,angle:360,scale:.95,duration:920*sample.speed,onComplete:()=>{playBurst(this,x,y,10,.9); spawnTextureSparkles(this,x,y,11,42,ss(30),ss(210)); fadeDestroy(this,ring,0,240);}}); }
  private playGlowReveal(sample: Sample): void { const {x,y}=this.center(); this.card(x,y,1.1); const glow=this.track(addSoftGlow(this,x,y,5,1.05)); this.tweens.add({targets:glow,alpha:.5,scale:1.6,duration:900*sample.speed,yoyo:true,repeat:2}); }
  private playChapter(sample: Sample): void { const {x,y}=this.center(); const glow=this.track(addSoftGlow(this,x,y-sy(90),4,.9)); const title=this.track(this.add.text(x,y-sy(90),sample.tone===tones.blue?"제3장. 아직 오지 않은 별":"제1장. 지나간 문",{fontFamily:"Georgia, serif",fontSize:`${ss(31)}px`,color:"#fff6d6",stroke:"#2c174f",strokeThickness:ss(4)}).setOrigin(.5).setAlpha(0)); const c=this.card(x,y+sy(130),.92).setAlpha(0).setY(y+sy(190)); this.tweens.add({targets:[glow,title],alpha:1,duration:700*sample.speed}); this.tweens.add({targets:title,y:y-sy(160),delay:900,duration:700*sample.speed}); this.tweens.add({targets:c,alpha:1,y:y+sy(110),delay:1180,duration:720*sample.speed}); }
  private playChapterDust(sample: Sample): void { const {x,y}=this.center(); spawnTextureSparkles(this,x,y-sy(90),10,58,ss(180),ss(260)); const t=this.track(this.add.text(x,y-sy(90),"제2장. 지금의 불꽃",{fontFamily:"Georgia, serif",fontSize:`${ss(33)}px`,color:"#fff6d6",stroke:"#2c174f",strokeThickness:ss(4)}).setOrigin(.5).setAlpha(0)); this.tweens.add({targets:t,alpha:1,delay:520,duration:900*sample.speed}); }
  private playChapterGate(sample: Sample): void { const {x,y}=this.center(); const l=this.track(createMagicBeam(this,x,y,x-sx(240),y,6,sample.tone)); const r=this.track(createMagicBeam(this,x,y,x+sx(240),y,6,sample.tone)); this.tweens.add({targets:[l,r],alpha:.85,duration:420*sample.speed,yoyo:true,hold:500}); const c=this.card(x,y+sy(70),.98).setAlpha(0).setScale(.72); this.tweens.add({targets:c,alpha:1,scale:1,delay:520,duration:820*sample.speed}); }
  private playChapterAura(sample: Sample): void { const {x,y}=this.center(); const glow=this.track(addSoftGlow(this,x,y,4,1.1)); const c=this.card(x,y+sy(20),1).setAlpha(.9); this.tweens.add({targets:glow,alpha:.42,scale:1.7,duration:950*sample.speed,yoyo:true,repeat:2}); this.tweens.add({targets:c,y:"-=10",duration:900*sample.speed,yoyo:true,repeat:1}); }
  private playFinale(sample: Sample): void { const {x,y}=this.center(); [{x:x-sx(300),y:y+sy(120)},{x,y:y-sy(250)},{x:x+sx(300),y:y+sy(120)}].forEach((p,i)=>{const b=this.track(createMagicBeam(this,p.x,p.y,x,y,6,i===1?sample.tone:0xb58cff)); this.tweens.add({targets:b,alpha:.86,delay:i*140,duration:620*sample.speed,yoyo:true,hold:300,onComplete:()=>b.destroy()});}); const core=this.track(addSoftGlow(this,x,y,8,.8)); const ring=this.track(addRuneRing(this,x,y,9,.52)); this.tweens.add({targets:[core,ring],alpha:1,scale:1.24,delay:420,duration:900*sample.speed}); this.tweens.add({targets:ring,angle:360,duration:2800,repeat:-1}); }
  private playFinaleOrb(sample: Sample): void { const {x,y}=this.center(); const core=this.track(addSoftGlow(this,x,y,5,1.05)); const sig=this.track(addSigil(this,x,y,7,.68)); const ring=this.track(addRuneRing(this,x,y,6,.72)); this.tweens.add({targets:core,alpha:.58,scale:1.65,duration:900*sample.speed,yoyo:true,repeat:1}); this.tweens.add({targets:[sig,ring],alpha:1,duration:700*sample.speed}); this.tweens.add({targets:ring,angle:-360,duration:3200,repeat:-1}); }
  private playFusion(sample: Sample): void { const {x,y}=this.center(); [-1,0,1].forEach((o,i)=>{const c=this.card(x+sx(230*o),y+sy(60),.66); this.tweens.add({targets:c,x,y,alpha:0,scale:.22,delay:300+i*160,duration:900*sample.speed});}); this.time.delayedCall(1050,()=>{playBurst(this,x,y,10,1.4); spawnTextureSparkles(this,x,y,11,52,ss(30),ss(260));}); }
  private playChatGlow(sample: Sample): void { const {x,y}=this.center(); const p=this.track(this.add.rectangle(x,y,sx(620),sy(250),0x100b26,.78).setStrokeStyle(ss(3),sample.tone,.36)); const glow=this.track(addSoftGlow(this,x,y,4,1)); const text=this.track(this.add.text(x,y,"점술사\n별빛은 아직 꺼지지 않았습니다.",{fontFamily:"system-ui",fontSize:`${ss(22)}px`,color:"#f8f0ff",align:"center",lineSpacing:ss(10)}).setOrigin(.5)); this.tweens.add({targets:glow,alpha:.36,scale:1.5,duration:1100*sample.speed,yoyo:true,repeat:2}); p.setDepth(5); text.setDepth(7); }
  private playMemory(sample: Sample): void { const {x,y}=this.center(); [-1,0,1].forEach((o,i)=>{const c=this.card(x+sx(150*o),y-sy(80),.45).setAlpha(.18); this.tweens.add({targets:c,alpha:.38,y:"-=8",delay:i*160,duration:800*sample.speed,yoyo:true,repeat:1});}); this.track(this.add.text(x,y+sy(150),"이전 카드의 기억이 대화 뒤에 남아 있습니다.",{fontFamily:"system-ui",fontSize:`${ss(20)}px`,color:"#d9c8ff",align:"center"}).setOrigin(.5)); spawnTextureSparkles(this,x,y,9,26,ss(60),ss(220)); }
}
