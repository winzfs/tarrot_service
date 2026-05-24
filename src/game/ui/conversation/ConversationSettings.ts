export type ConversationSettings = {
  typingMsPerChar: number;
  tapUnlockAfterRevealMs: number;
  autoRevealDelayMs: number;
  autoAdvanceEnabled: boolean;
  autoAdvanceDelayMs: number;
};

export const defaultConversationSettings: ConversationSettings = {
  typingMsPerChar: 24,
  tapUnlockAfterRevealMs: 3000,
  autoRevealDelayMs: 3600,
  autoAdvanceEnabled: false,
  autoAdvanceDelayMs: 2200,
};
