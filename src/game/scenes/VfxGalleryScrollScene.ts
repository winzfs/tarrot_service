import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, ss, sx, sy } from "../GameConfig";
import { drawMysticBackground } from "../ui/drawPanel";
import { addRuneRing, addSigil, addSoftGlow, createMagicBeam, fadeDestroy, playBurst, playSmoke, spawnTextureSparkles } from "../vfx/vfxEffects";
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
  pink: 0xff8edb,
  green: 0x9dffb0,
};

const samples: Sample[] = [
  { id: "intro-stars", category: "intro", title: "별빛 타이틀", description: "점술관 입구의 별빛 타이틀 연출", kind: "stars", tone: tones.gold, speed: 1 },
  { id: "intro-door", category: "intro", title: "아르카나 문", description: "룬 원과 문양이 열리는 인트로", kind: "door", tone: tones.violet, speed: 1 },
  { id: "intro-card", category: "intro", title: "카드 현현", description: "중앙 카드가 빛 속에서 떠오름", kind: "card", tone: tones.blue, speed: 1 },
  { id: "question-seal", category: "question", title: "질문 봉인", description: "질문 문장이 카드 속으로 접히는 연출", kind: "seal", tone: tones.gold, speed: 1 },
  { id: "question-ink", category: "question", title: "안개 잉크", description: "질문이 안개처럼 스며듦", kind: "ink", tone: tones.violet, speed: 1 },
  { id: "question-pulse", category: "question", title: "속삭임 파동", description: "선택 전 짧은 맥동", kind: "pulse", tone: tones.blue, speed: 1 },
  { id: "altar-runes", category: "altar", title: "제단 룬", description: "카드 선택 전 바닥 룬 활성화", kind: "runes", tone: tones.violet, speed: 1 },
  { id: "altar-beams", category: "altar", title: "카드 연결 빔", description: "중앙 문양과 카드들을 연결", kind: "beams", tone: tones.gold, speed: 1 },
  { id: "altar-mist", category: "altar", title: "제단 안개", description: "카드 아래 안개와 등장", kind: "mist", tone: tones.blue, speed: 1 },
  { id: "altar-orbs", category: "altar", title: "세 개의 혼불", description: "카드 위에 떠오르는 작은 빛", kind: "orbs", tone: tones.green, speed: 1 },
  { id: "altar-constellation", category: "altar", title: "별자리 연결", description: "선택 카드들이 별자리처럼 연결", kind: "constellation", tone: tones.gold, speed: 1 },
  { id: "reveal-burst", category: "reveal", title: "카드 폭발 공개", description: "플립 순간 빛 폭발", kind: "burst", tone: tones.gold, speed: 1 },
  { id: "reveal-smoke", category: "reveal", title: "연기 속 공개", description: "연기가 걷히며 카드가 드러남", kind: "smoke", tone: tones.violet, speed: 1 },
  { id: "reveal-rune", category: "reveal", title: "룬 원 공개", description: "룬 원이 돌며 카드 공개", kind: "rune", tone: tones.blue, speed: 1 },
  { id: "reveal-glow", category: "reveal", title: "은은한 발광", description: "부드러운 후광 중심 공개", kind: "glow", tone: tones.green, speed: 1 },
  { id: "chapter-main", category: "chapter", title: "챕터 제목", description: "제1장/제2장 제목과 카드 등장", kind: "chapter", tone: tones.gold, speed: 1 },
  { id: "chapter-dust", category: "chapter", title: "별가루 자막", description: "챕터 제목 주변 별가루", kind: "dust", tone: tones.violet, speed: 1 },
  { id: "chapter-gate", category: "chapter", title: "해석의 문", description: "빛의 문 뒤에서 카드 등장", kind: "gate", tone: tones.blue, speed: 1 },
  { id: "chapter-aura", category: "chapter", title: "카드 오라", description: "카드 주변에 천천히 도는 오라", kind: "aura", tone: tones.green, speed: 1 },
  { id: "finale-core", category: "finale", title: "종장 핵심", description: "카드 흐름이 중앙에 모이는 종장", kind: "finale", tone: tones.gold, speed: 1 },
  { id: "finale-orb", category: "finale", title: "별빛 구슬", description: "종합 조언 전 별빛 구슬", kind: "orb", tone: tones.blue, speed: 1 },
  { id: "finale-fusion", category: "finale", title: "카드 융합", description: "선택 카드들이 한 점으로 모임", kind: "fusion", tone: tones.violet, speed: 1 },
  { id: "chat-glow", category: "chat", title: "대화창 발광", description: "점술사 후속 대화창 주변 빛", kind: "chatGlow", tone: tones.gold, speed: 1 },
  { id: "chat-memory", category: "chat", title: "기억의 잔상", description: "이전 리딩의 카드 잔상", kind: "memory", tone: tones.pink, speed: 1 },
];

export class VfxGalleryScrollScene extends Phaser.Scene {
  private activeCategory: Category = "intro";
  private buttons: Button[] = [];
  private activeObjects: Phaser.GameObjects.GameObject[] = [];
  private titleText?: Phaser.GameObjects.Text;
  private descriptionText?: Phaser.GameObjects.Text;
  private assetSummaryText?: Phaser.GameObjects.Text;
  private listContainer?: Phaser.GameObjects.Container;
  private sampleContainer?: Phaser.GameObjects.Container;
  private sampleButtons: Button[] = [];

  constructor() { super("VfxGalleryScrollScene"); }

  create(): void {
    drawMysticBackground(this, GAME_WIDTH, GAME_HEIGHT);
    this.add.text(GAME_WIDTH / 2, sy(70), "VFX 연출 갤러리", { fontFamily: "Georgia, serif", fontSize: `${ss(30)}px`, color: "#fff6d6", stroke: "#2c174f", strokeThickness: ss(4) }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, sy(116), "카테고리를 고르고 샘플을 눌러 연출을 확인하세요", { fontFamily: "system-ui", fontSize: `${ss(12)}px`, color: "#cdbdff" }).setOrigin(0.5);

    this.createCategoryButtons();
    this.createSamplePanel();
    this.createAssetSummary();
    this.renderCategory("intro");
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.activeObjects.push(object);
    return object;
  }

  private clearPreview(): void {
    this.tweens.killTweensOf(this.activeObjects);
    this.activeObjects.forEach((object) => object.destroy());
    this.activeObjects = [];
  }

  private createCategoryButtons(): void {
    const cats: Category[] = ["intro", "question", "altar", "reveal", "chapter", "finale", "chat"];
    const startX = sx(70);
    const y = sy(170);
    const w = sx(122);
    const h = sy(46);
    const gap = sx(18);
    cats.forEach((cat, i) => {
      const x = startX + i * (w + gap);
      const button = this.makeButton(x, y, w, h, labels[cat], () => this.renderCategory(cat));
      this.buttons.push(button);
    });
  }

  private createSamplePanel(): void {
    this.listContainer = this.add.container(0, 0);
    this.sampleContainer = this.add.container(0, 0);
    this.titleText = this.add.text(sx(66), sy(250), "", { fontFamily: "Georgia, serif", fontSize: `${ss(24)}px`, color: "#fff6d6" });
    this.descriptionText = this.add.text(sx(66), sy(292), "", { fontFamily: "system-ui", fontSize: `${ss(13)}px`, color: "#d9c8ff", wordWrap: { width: sx(470) } });
  }

  private createAssetSummary(): void {
    const loaded = allVfxAssets().filter((asset) => this.textures.exists(asset.key)).length;
    const total = allVfxAssets().length;
    this.assetSummaryText = this.add.text(sx(64), GAME_HEIGHT - sy(86), `에셋 로드 ${loaded}/${total} · 카테고리별 사용 예시`, { fontFamily: "system-ui", fontSize: `${ss(12)}px`, color: "#9f91d6" });
  }

  private makeButton(x: number, y: number, width: number, height: number, text: string, action: () => void): Button {
    const root = this.add.container(x, y);
    const bg = this.add.graphics();
    const label = this.add.text(width / 2, height / 2, text, { fontFamily: "system-ui", fontSize: `${ss(12)}px`, color: "#fff6d6", fontStyle: "bold" }).setOrigin(0.5);
    const zone = this.add.zone(width / 2, height / 2, width, height).setInteractive({ useHandCursor: true });
    root.add([bg, label, zone]);
    zone.on("pointerdown", action);
    const button = { root, bg, label, zone, width, height };
    this.drawButton(button, false);
    return button;
  }

  private drawButton(button: Button, active: boolean): void {
    button.bg.clear();
    button.bg.fillStyle(active ? 0x4d3191 : 0x130d2a, active ? 0.98 : 0.78);
    button.bg.fillRoundedRect(0, 0, button.width, button.height, ss(10));
    button.bg.lineStyle(ss(2), active ? 0xf6d365 : 0xb58cff, active ? 0.9 : 0.38);
    button.bg.strokeRoundedRect(0, 0, button.width, button.height, ss(10));
  }

  private renderCategory(category: Category): void {
    this.activeCategory = category;
    this.buttons.forEach((button, index) => this.drawButton(button, (["intro", "question", "altar", "reveal", "chapter", "finale", "chat"] as Category[])[index] === category));
    this.clearPreview();
    this.sampleButtons.forEach((button) => button.root.destroy());
    this.sampleButtons = [];
    const filtered = samples.filter((sample) => sample.category === category);
    this.titleText?.setText(labels[category]);
    this.descriptionText?.setText(`${filtered.length}개의 ${labels[category]} 연출 샘플`);
    filtered.forEach((sample, index) => {
      const x = sx(64 + (index % 2) * 260);
      const y = sy(350 + Math.floor(index / 2) * 62);
      const button = this.makeButton(x, y, sx(230), sy(48), sample.title, () => this.playSample(sample));
      this.sampleButtons.push(button);
    });
    if (filtered[0]) this.playSample(filtered[0]);
  }

  private playSample(sample: Sample): void {
    this.clearPreview();
    this.descriptionText?.setText(sample.description);
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
  private playChatGlow(sample: Sample): void { const {x,y}=this.center(); const p=this.track(this.add.rectangle(x,y,sx(620),sy(250),0x100b26,.78).setStrokeStyle(ss(3),sample.tone,.36)); const glow=this.track(addSoftGlow(this,x,y,4,1)); const text=this.track(this.add.text(x,y,"점술사\n별빛은 아직 꺼지지 않았습니다.",{fontFamily:"system-ui",fontSize:`${ss(22)}px`,color:"#f8f0ff",align:"center",lineSpacing:ss(10)}).setOrigin(.5)); this.tweens.add({targets:glow,alpha:.42,scale:1.4,duration:880*sample.speed,yoyo:true,repeat:2}); this.tweens.add({targets:p,alpha:.96,duration:500*sample.speed}); }
  private playMemory(sample: Sample): void { const {x,y}=this.center(); [-1,0,1].forEach((o,i)=>{const c=this.card(x+sx(180*o),y+sy(80),.55).setAlpha(.18); this.tweens.add({targets:c,alpha:.58,y:"-=18",delay:i*220,duration:900*sample.speed,yoyo:true});}); spawnTextureSparkles(this,x,y,10,28,ss(60),ss(240)); }
}
