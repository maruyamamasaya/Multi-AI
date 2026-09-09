import { createPromptAdapter } from './build-adapter';

export const claudePromptAdapter = createPromptAdapter({
  serviceId: 'claude',
  inputSelectors: ['[data-testid="chat-input"][contenteditable="true"]', '.ProseMirror[contenteditable="true"]'],
  submitSelectors: ['button[aria-label="Send Message"]', 'button[aria-label="メッセージを送信"]', '[data-testid="send-button"]'],
});
