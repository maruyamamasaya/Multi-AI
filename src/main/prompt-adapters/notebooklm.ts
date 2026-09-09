import { createPromptAdapter } from './build-adapter';

export const notebookLmPromptAdapter = createPromptAdapter({
  serviceId: 'notebooklm',
  inputSelectors: ['textarea[aria-label*="query"]', 'textarea[placeholder*="Start typing"]', '[contenteditable="true"][aria-label*="chat"]'],
  submitSelectors: ['button[aria-label="Send"]', 'button[aria-label="Submit"]', 'button[aria-label="送信"]'],
});
