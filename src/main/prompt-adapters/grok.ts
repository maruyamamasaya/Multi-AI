import { createPromptAdapter } from './build-adapter';

export const grokPromptAdapter = createPromptAdapter({
  serviceId: 'grok',
  inputSelectors: [
    '[contenteditable="true"][role="textbox"][aria-label="Ask Grok anything"]',
    'textarea[placeholder*="Ask"]',
    'textarea[aria-label*="Ask"]',
    '[contenteditable="true"][data-lexical-editor="true"]',
  ],
  submitSelectors: [
    'button[data-testid="chat-submit"]',
    'button[data-testid="send-button"]',
    'button[aria-label="Submit"]',
    'button[aria-label="Send"]',
    'button[aria-label="送信"]',
  ],
});
