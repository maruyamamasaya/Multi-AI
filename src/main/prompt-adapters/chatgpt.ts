import { createPromptAdapter } from './build-adapter';

export const chatGptPromptAdapter = createPromptAdapter({
  serviceId: 'chatgpt',
  inputSelectors: ['#prompt-textarea', '[data-testid="composer-input"][contenteditable="true"]'],
  submitSelectors: ['[data-testid="send-button"]', 'button[aria-label="Send prompt"]', 'button[aria-label="プロンプトを送信する"]'],
});
