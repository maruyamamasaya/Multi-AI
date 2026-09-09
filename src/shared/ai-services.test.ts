import { describe, expect, it } from 'vitest';
import { AI_SERVICES, getAiService, getAiServiceByUrl } from './ai-services';

describe('AI services', () => {
  it('defines every supported service once with an HTTPS URL', () => {
    expect(AI_SERVICES.map(({ name }) => name)).toEqual([
      'ChatGPT',
      'Claude',
      'Gemini',
      'Perplexity',
      'Grok',
      'Microsoft Copilot',
      'NotebookLM',
    ]);
    expect(new Set(AI_SERVICES.map(({ id }) => id)).size).toBe(AI_SERVICES.length);
    expect(AI_SERVICES.every(({ url }) => url.startsWith('https://'))).toBe(true);
  });

  it('only resolves a known service identifier', () => {
    expect(getAiService('claude')?.url).toBe('https://claude.ai/');
    expect(getAiService('unknown')).toBeUndefined();
    expect(getAiService(null)).toBeUndefined();
  });

  it.each([
    ['https://chatgpt.com/c/conversation-id', 'ChatGPT'],
    ['https://claude.ai/chat/conversation-id', 'Claude'],
    ['https://gemini.google.com/app/conversation-id', 'Gemini'],
    ['https://www.perplexity.ai/search/example', 'Perplexity'],
    ['https://grok.com/c/conversation-id', 'Grok'],
    ['https://copilot.microsoft.com/chats/example', 'Microsoft Copilot'],
    ['https://notebook.google.com/notebook/example', 'NotebookLM'],
  ])('identifies %s as %s', (url, expectedName) => {
    expect(getAiServiceByUrl(url)?.name).toBe(expectedName);
  });

  it('does not confuse a suffix-like or malformed URL with a supported service', () => {
    expect(getAiServiceByUrl('https://chatgpt.com.example.test/')).toBeUndefined();
    expect(getAiServiceByUrl('not a url')).toBeUndefined();
  });
});
