export type DialogueTone = "gentle" | "neutral" | "direct";
export type DirectionIntensity = "subtle" | "normal" | "strong";

export type DialogueCondition =
  | {
      type: "toneAtLeast";
      value: DialogueTone;
    }
  | {
      type: "directionIntensityAtLeast";
      value: DirectionIntensity;
    };

export type DialogueEffect =
  | {
      type: "setTone";
      value: DialogueTone;
    }
  | {
      type: "setDirectionIntensity";
      value: DirectionIntensity;
    };

export type DialogueChoice = {
  id: string;
  text: string;
  next: string | null;
  conditions: DialogueCondition[];
  effects: DialogueEffect[];
};

export type DialogueNode = {
  id: string;
  speaker: string;
  text: string;
  choices: DialogueChoice[];
  next: string | null;
  conditions: DialogueCondition[];
  effects: DialogueEffect[];
};

export type DialogueScript = {
  id: string;
  entryId: string;
  nodes: DialogueNode[];
};

export type DialogueRuntimeState = {
  tone: DialogueTone;
  directionIntensity: DirectionIntensity;
};
