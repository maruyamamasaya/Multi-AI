import { createPromptAdapter } from './build-adapter';

export const geminiPromptAdapter = createPromptAdapter({
  serviceId: 'gemini',
  inputSelectors: ['rich-textarea .ql-editor[contenteditable="true"]', '.ql-editor[contenteditable="true"][aria-label]'],
  submitSelectors: ['button[aria-label="Send message"]', 'button[aria-label="メッセージを送信"]', 'button.send-button'],
});
