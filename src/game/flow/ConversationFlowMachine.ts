import Phaser from "phaser";

export type ConversationFlowState = "Intro" | "Questioning" | "Sealing" | "Shuffling" | "Revealing" | "Interpretation" | "End";

type TransitionExecutor = () => void;

type FlowStateDefinition = {
  enter: (scene: Phaser.Scene) => void;
  update: (scene: Phaser.Scene) => void;
  exit: (scene: Phaser.Scene) => void;
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
      Intro: {
        enter: (scene) => scene.scene.start("IntroScene"),
        update: () => undefined,
        exit: () => undefined,
        allowedTransitions: ["Questioning"],
      },
      Questioning: {
        enter: (scene) => scene.scene.start("QuestionScene"),
        update: () => undefined,
        exit: () => undefined,
        allowedTransitions: ["Sealing"],
      },
      Sealing: {
        enter: () => undefined,
        update: () => undefined,
        exit: () => undefined,
        allowedTransitions: ["Shuffling"],
      },
      Shuffling: {
        enter: (scene) => scene.scene.start("CardShuffleScene"),
        update: () => undefined,
        exit: () => undefined,
        allowedTransitions: ["Revealing"],
      },
      Revealing: {
        enter: (scene) => scene.scene.start("CardSelectScene"),
        update: () => undefined,
        exit: () => undefined,
        allowedTransitions: ["Interpretation"],
      },
      Interpretation: {
        enter: (scene) => scene.scene.start("ReadingScene"),
        update: () => undefined,
        exit: () => undefined,
        allowedTransitions: ["End"],
      },
      End: {
        enter: (scene) => scene.scene.start("SummaryScene"),
        update: () => undefined,
        exit: () => undefined,
        allowedTransitions: [],
      },
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
    scene: Phaser.Scene,
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

    this.tryTransition(scene, targetState, executor, timeoutMs, DEFAULT_RETRY_LIMIT, forcedFallbackState);
    return true;
  }

  private tryTransition(
    scene: Phaser.Scene,
    targetState: ConversationFlowState,
    executor: TransitionExecutor,
    timeoutMs: number,
    retriesLeft: number,
    forcedFallbackState: ConversationFlowState,
  ): void {
    const previousState = this.currentState;
    const prevDef = this.definitions[previousState];
    const nextDef = this.definitions[targetState];

    let done = false;
    const timer = window.setTimeout(() => {
      if (done) return;
      if (retriesLeft > 0) {
        this.tryTransition(scene, targetState, executor, timeoutMs, retriesLeft - 1, forcedFallbackState);
        return;
      }
      prevDef.exit(scene);
      this.currentState = forcedFallbackState;
      this.definitions[forcedFallbackState].enter(scene);
      done = true;
    }, timeoutMs);

    try {
      prevDef.exit(scene);
      this.currentState = targetState;
      nextDef.enter(scene);
      executor();
      done = true;
      window.clearTimeout(timer);
    } catch (_error) {
      window.clearTimeout(timer);
      if (retriesLeft > 0) {
        this.currentState = previousState;
        this.tryTransition(scene, targetState, executor, timeoutMs, retriesLeft - 1, forcedFallbackState);
        return;
      }
      prevDef.exit(scene);
      this.currentState = forcedFallbackState;
      this.definitions[forcedFallbackState].enter(scene);
    }
  }
}

export const conversationFlowMachine = new ConversationFlowMachine();
