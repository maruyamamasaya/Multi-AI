import { describe, expect, it } from 'vitest';
import { normalizeNavigationUrl } from './navigation';

describe('normalizeNavigationUrl', () => {
  it('adds https to a hostname', () => {
    expect(normalizeNavigationUrl('example.net/docs')).toBe('https://example.net/docs');
  });

  it('keeps an http URL', () => {
    expect(normalizeNavigationUrl('http://example.net/')).toBe('http://example.net/');
  });

  it('rejects non-web protocols', () => {
    expect(() => normalizeNavigationUrl('file:///secret.txt')).toThrow(
      'httpまたはhttpsのURLだけを指定できます。',
    );
  });
});
