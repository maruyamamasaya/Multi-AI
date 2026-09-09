import { createPromptAdapter } from './build-adapter';

export const copilotPromptAdapter = createPromptAdapter({
  serviceId: 'copilot',
  inputSelectors: ['textarea#userInput', 'textarea[placeholder*="Message Copilot"]', '[contenteditable="true"][aria-label*="Message Copilot"]'],
  submitSelectors: ['button[aria-label="Submit"]', 'button[aria-label="Send"]', 'button[data-testid="submit-button"]'],
});
