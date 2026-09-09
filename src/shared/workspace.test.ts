import { describe, expect, it } from 'vitest';
import { parseWorkspaceSnapshot } from './workspace';

const fallback = ['https://example.com/', 'https://example.org/'];

describe('parseWorkspaceSnapshot', () => {
  it('restores valid URLs and selection', () => {
    expect(parseWorkspaceSnapshot({ urls: ['example.net'], selectedIndex: 0 }, fallback)).toEqual({
      urls: ['https://example.net/'],
      selectedIndex: 0,
    });
  });

  it('falls back when a URL uses a dangerous protocol', () => {
    expect(parseWorkspaceSnapshot({ urls: ['file:///secret'], selectedIndex: 0 }, fallback)).toEqual({
      urls: fallback,
      selectedIndex: 0,
    });
  });

  it('repairs an invalid selected index', () => {
    expect(parseWorkspaceSnapshot({ urls: ['https://example.net'], selectedIndex: 9 }, fallback)).toEqual({
      urls: ['https://example.net/'],
      selectedIndex: 0,
    });
  });
});
