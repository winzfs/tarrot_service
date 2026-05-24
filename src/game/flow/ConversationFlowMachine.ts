import Phaser from "phaser";

export type ConversationFlowState = "Intro" | "Questioning" | "Sealing" | "Shuffling" | "Revealing" | "Interpretation" | "End";

type TransitionExecutor = () => void;

type FlowStateDefinition = {
  update: (scene: Phaser.Scene) => void;
  allowedTransitions: ConversationFlowState[];
};

type TransitionOptions = {
  transitionTimeoutMs?: number;
  forcedFallbackState?: ConversationFlowState;
};

const DEFAULT_TRANSITION_TIMEOUT_MS = 3000;
const DEFAULT_RETRY_LIMIT = 1;

export class ConversationFlowMachine {
  private readonly definitions: Record<ConversationFlowState, FlowStateDefinition>;
  private currentState: ConversationFlowState = "Intro";

  constructor() {
    this.definitions = {
      Intro: { update: () => undefined, allowedTransitions: ["Questioning"] },
      Questioning: { update: () => undefined, allowedTransitions: ["Sealing"] },
      Sealing: { update: () => undefined, allowedTransitions: ["Shuffling"] },
      Shuffling: { update: () => undefined, allowedTransitions: ["Questioning", "Revealing"] },
      Revealing: { update: () => undefined, allowedTransitions: ["Interpretation"] },
      Interpretation: { update: () => undefined, allowedTransitions: ["End"] },
      End: { update: () => undefined, allowedTransitions: [] },
    };
  }

  public setState(state: ConversationFlowState): void {
    this.currentState = state;
  }

  public getState(): ConversationFlowState {
    return this.currentState;
  }

  public runUpdate(scene: Phaser.Scene): void {
    this.definitions[this.currentState].update(scene);
  }

  public requestTransition(
    _scene: Phaser.Scene,
    targetState: ConversationFlowState,
    executor: TransitionExecutor,
    options: TransitionOptions = {},
  ): boolean {
    const currentDef = this.definitions[this.currentState];
    if (!currentDef.allowedTransitions.includes(targetState)) {
      return false;
    }

    const timeoutMs = options.transitionTimeoutMs ?? DEFAULT_TRANSITION_TIMEOUT_MS;
    const forcedFallbackState = options.forcedFallbackState ?? targetState;

    this.tryTransition(targetState, executor, timeoutMs, DEFAULT_RETRY_LIMIT, forcedFallbackState);
    return true;
  }

  private tryTransition(
    targetState: ConversationFlowState,
    executor: TransitionExecutor,
    timeoutMs: number,
    retriesLeft: number,
    forcedFallbackState: ConversationFlowState,
  ): void {
    const previousState = this.currentState;
    let done = false;

    const timer = window.setTimeout(() => {
      if (done) return;
      if (retriesLeft > 0) {
        this.tryTransition(targetState, executor, timeoutMs, retriesLeft - 1, forcedFallbackState);
        return;
      }
      this.currentState = forcedFallbackState;
      done = true;
    }, timeoutMs);

    try {
      this.currentState = targetState;
      executor();
      done = true;
      window.clearTimeout(timer);
    } catch (error) {
      window.clearTimeout(timer);
      this.currentState = previousState;

      if (retriesLeft > 0) {
        this.tryTransition(targetState, executor, timeoutMs, retriesLeft - 1, forcedFallbackState);
        return;
      }

      this.currentState = forcedFallbackState;
      throw error;
    }
  }
}

export const conversationFlowMachine = new ConversationFlowMachine();
