import introScenario from "./scripts/introScenario.json";
import type { DialogueRuntimeState, DialogueScript } from "./types";
import { validateDialogueScript } from "./validateDialogueScript";

const bundledScripts: unknown[] = [introScenario];

export class DialogueRepository {
  private readonly scriptsById: Map<string, DialogueScript>;

  constructor(scripts: unknown[] = bundledScripts) {
    this.scriptsById = new Map();

    scripts.forEach((script, index) => {
      const validation = validateDialogueScript(script);
      if (!validation.ok) {
        throw new Error(`Dialogue script load failed at index ${index}:\n${validation.errors.join("\n")}`);
      }
      if (this.scriptsById.has(validation.value.id)) {
        throw new Error(`Duplicate dialogue script id '${validation.value.id}'`);
      }
      this.scriptsById.set(validation.value.id, validation.value);
    });
  }

  getById(scriptId: string): DialogueScript {
    const script = this.scriptsById.get(scriptId);
    if (!script) throw new Error(`Dialogue script not found: ${scriptId}`);
    return script;
  }
}

export function applyDialogueEffects(state: DialogueRuntimeState, effects: DialogueScript["nodes"][number]["effects"]): DialogueRuntimeState {
  return effects.reduce<DialogueRuntimeState>((nextState, effect) => {
    switch (effect.type) {
      case "setTone":
        return { ...nextState, tone: effect.value };
      case "setDirectionIntensity":
        return { ...nextState, directionIntensity: effect.value };
      default:
        return nextState;
    }
  }, state);
}
