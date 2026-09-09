import { describe, expect, it } from 'vitest';
import { parseBookmarks } from './bookmarks';

describe('AI conversation bookmarks', () => {
  it('adds a service id to a supported legacy bookmark', () => {
    expect(parseBookmarks([{ id: 'legacy', title: '会話', url: 'https://chatgpt.com/c/example' }])).toEqual([
      { id: 'legacy', title: '会話', url: 'https://chatgpt.com/c/example', serviceId: 'chatgpt' },
    ]);
  });

  it('keeps all seven supported AI services', () => {
    const urls = [
      'https://chatgpt.com/', 'https://claude.ai/', 'https://gemini.google.com/',
      'https://www.perplexity.ai/', 'https://grok.com/', 'https://copilot.microsoft.com/',
      'https://notebooklm.google.com/',
    ];
    expect(parseBookmarks(urls.map((url, index) => ({ id: String(index), title: `AI ${index}`, url })))).toHaveLength(7);
  });

  it('drops unsupported URLs, malformed entries, and duplicate URLs', () => {
    expect(parseBookmarks([
      { id: 'general', title: 'General', url: 'https://example.com/' },
      { id: 'first', title: 'First', url: 'https://claude.ai/chat/one' },
      { id: 'duplicate', title: 'Duplicate', url: 'https://claude.ai/chat/one' },
      { title: 'Broken', url: 'https://chatgpt.com/' },
    ])).toEqual([{ id: 'first', title: 'First', url: 'https://claude.ai/chat/one', serviceId: 'claude' }]);
  });

  it('returns an empty list for an invalid file shape', () => {
    expect(parseBookmarks({ bookmarks: [] })).toEqual([]);
  });
});
