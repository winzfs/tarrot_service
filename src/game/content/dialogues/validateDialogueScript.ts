import type {
  DialogueChoice,
  DialogueCondition,
  DialogueEffect,
  DialogueScript,
  DialogueTone,
  DirectionIntensity,
} from "./types";

const toneOrder: DialogueTone[] = ["gentle", "neutral", "direct"];
const intensityOrder: DirectionIntensity[] = ["subtle", "normal", "strong"];

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

function validateCondition(condition: unknown, path: string, errors: string[]): condition is DialogueCondition {
  if (!isObject(condition)) {
    errors.push(`${path}: condition must be an object`);
    return false;
  }
  if (condition.type === "toneAtLeast") {
    if (!toneOrder.includes(condition.value as DialogueTone)) {
      errors.push(`${path}.value: invalid toneAtLeast value`);
      return false;
    }
    return true;
  }
  if (condition.type === "directionIntensityAtLeast") {
    if (!intensityOrder.includes(condition.value as DirectionIntensity)) {
      errors.push(`${path}.value: invalid directionIntensityAtLeast value`);
      return false;
    }
    return true;
  }
  errors.push(`${path}.type: unknown condition type`);
  return false;
}

function validateEffect(effect: unknown, path: string, errors: string[]): effect is DialogueEffect {
  if (!isObject(effect)) {
    errors.push(`${path}: effect must be an object`);
    return false;
  }
  if (effect.type === "setTone") {
    if (!toneOrder.includes(effect.value as DialogueTone)) {
      errors.push(`${path}.value: invalid setTone value`);
      return false;
    }
    return true;
  }
  if (effect.type === "setDirectionIntensity") {
    if (!intensityOrder.includes(effect.value as DirectionIntensity)) {
      errors.push(`${path}.value: invalid setDirectionIntensity value`);
      return false;
    }
    return true;
  }
  errors.push(`${path}.type: unknown effect type`);
  return false;
}

function validateChoice(choice: unknown, path: string, errors: string[]): choice is DialogueChoice {
  if (!isObject(choice)) {
    errors.push(`${path}: choice must be an object`);
    return false;
  }
  if (typeof choice.id !== "string" || choice.id.length === 0) errors.push(`${path}.id: required string`);
  if (typeof choice.text !== "string" || choice.text.length === 0) errors.push(`${path}.text: required string`);
  if (choice.next !== null && typeof choice.next !== "string") errors.push(`${path}.next: must be string|null`);

  if (!Array.isArray(choice.conditions)) {
    errors.push(`${path}.conditions: must be array`);
  } else {
    choice.conditions.forEach((condition, index) => validateCondition(condition, `${path}.conditions[${index}]`, errors));
  }

  if (!Array.isArray(choice.effects)) {
    errors.push(`${path}.effects: must be array`);
  } else {
    choice.effects.forEach((effect, index) => validateEffect(effect, `${path}.effects[${index}]`, errors));
  }

  return true;
}

export function validateDialogueScript(script: unknown): { ok: true; value: DialogueScript } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isObject(script)) return { ok: false, errors: ["script must be an object"] };

  if (typeof script.id !== "string" || script.id.length === 0) errors.push("id: required string");
  if (typeof script.entryId !== "string" || script.entryId.length === 0) errors.push("entryId: required string");
  if (!Array.isArray(script.nodes)) errors.push("nodes: must be array");

  const nodeIds = new Set<string>();
  if (Array.isArray(script.nodes)) {
    script.nodes.forEach((node, index) => {
      const path = `nodes[${index}]`;
      if (!isObject(node)) {
        errors.push(`${path}: node must be an object`);
        return;
      }

      if (typeof node.id !== "string" || node.id.length === 0) {
        errors.push(`${path}.id: required string`);
      } else if (nodeIds.has(node.id)) {
        errors.push(`${path}.id: duplicate id '${node.id}'`);
      } else {
        nodeIds.add(node.id);
      }

      if (typeof node.speaker !== "string" || node.speaker.length === 0) errors.push(`${path}.speaker: required string`);
      if (typeof node.text !== "string" || node.text.length === 0) errors.push(`${path}.text: required string`);
      if (!Array.isArray(node.choices)) errors.push(`${path}.choices: must be array`);
      if (node.next !== null && typeof node.next !== "string") errors.push(`${path}.next: must be string|null`);
      if (!Array.isArray(node.conditions)) errors.push(`${path}.conditions: must be array`);
      if (!Array.isArray(node.effects)) errors.push(`${path}.effects: must be array`);

      if (Array.isArray(node.conditions)) {
        node.conditions.forEach((condition, conditionIndex) =>
          validateCondition(condition, `${path}.conditions[${conditionIndex}]`, errors),
        );
      }
      if (Array.isArray(node.effects)) {
        node.effects.forEach((effect, effectIndex) => validateEffect(effect, `${path}.effects[${effectIndex}]`, errors));
      }
      if (Array.isArray(node.choices)) {
        node.choices.forEach((choice, choiceIndex) => validateChoice(choice, `${path}.choices[${choiceIndex}]`, errors));
      }
    });

    const hasEntryNode = typeof script.entryId === "string" && nodeIds.has(script.entryId);
    if (!hasEntryNode) errors.push(`entryId: '${String(script.entryId)}' must reference an existing node`);

    const knownNodeIds = nodeIds;
    script.nodes.forEach((node, index) => {
      if (!isObject(node)) return;
      if (typeof node.next === "string" && !knownNodeIds.has(node.next)) {
        errors.push(`nodes[${index}].next: unknown node id '${node.next}'`);
      }
      if (Array.isArray(node.choices)) {
        node.choices.forEach((choice, choiceIndex) => {
          if (isObject(choice) && typeof choice.next === "string" && !knownNodeIds.has(choice.next)) {
            errors.push(`nodes[${index}].choices[${choiceIndex}].next: unknown node id '${choice.next}'`);
          }
        });
      }
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: script as DialogueScript };
}
