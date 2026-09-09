import { describe, expect, it } from 'vitest';
import { parseComparisonLayout } from './comparison';

describe('comparison layout validation', () => {
  it('keeps ordered unique targets and an optional focus', () => {
    expect(parseComparisonLayout({ activeViewIds: [3, 1, 3], focusedViewId: 1 })).toEqual({ activeViewIds: [3, 1], focusedViewId: 1 });
  });

  it('rejects empty targets and focus outside the comparison', () => {
    expect(() => parseComparisonLayout({ activeViewIds: [], focusedViewId: null })).toThrow('1つ以上');
    expect(() => parseComparisonLayout({ activeViewIds: [1, 2], focusedViewId: 3 })).toThrow('集中表示');
  });
});
