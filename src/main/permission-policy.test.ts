import { describe, expect, it } from 'vitest';
import { shouldGrantWebPermission } from './permission-policy';

describe('shouldGrantWebPermission', () => {
  it('allows sanitized clipboard writes from managed page views', () => {
    expect(shouldGrantWebPermission('clipboard-sanitized-write', true)).toBe(true);
  });

  it('denies clipboard reads and unrelated permissions', () => {
    expect(shouldGrantWebPermission('clipboard-read', true)).toBe(false);
    expect(shouldGrantWebPermission('media', true)).toBe(false);
  });

  it('denies even clipboard writes from unmanaged web contents', () => {
    expect(shouldGrantWebPermission('clipboard-sanitized-write', false)).toBe(false);
  });
});
