import { createPromptAdapter } from './build-adapter';

export const perplexityPromptAdapter = createPromptAdapter({
  serviceId: 'perplexity',
  inputSelectors: ['#ask-input[contenteditable="true"]', 'textarea[placeholder*="Ask"]', 'textarea[aria-label*="Ask"]', '[contenteditable="true"][data-lexical-editor="true"]'],
  submitSelectors: ['button[aria-label="送信"]', 'button[aria-label="Submit"]', 'button[aria-label="Send"]', 'button[data-testid="submit-button"]'],
});
