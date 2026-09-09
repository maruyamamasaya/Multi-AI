import { createPromptAdapter } from './build-adapter';

export const grokPromptAdapter = createPromptAdapter({
  serviceId: 'grok',
  inputSelectors: ['textarea[placeholder*="Ask"]', 'textarea[aria-label*="Ask"]', '[contenteditable="true"][data-lexical-editor="true"]'],
  submitSelectors: ['button[data-testid="send-button"]', 'button[aria-label="Submit"]', 'button[aria-label="Send"]'],
});
