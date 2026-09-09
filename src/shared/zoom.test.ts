import { describe, expect, it } from 'vitest';
import { nextZoomPercent, parseZoomAction } from './zoom';

describe('zoom', () => {
  it('moves through fixed levels and clamps to the safe range', () => {
    expect(nextZoomPercent(100, 'out')).toBe(90);
    expect(nextZoomPercent(100, 'in')).toBe(110);
    expect(nextZoomPercent(50, 'out')).toBe(50);
    expect(nextZoomPercent(200, 'in')).toBe(200);
  });

  it('resets to 100 percent and rejects invalid actions', () => {
    expect(nextZoomPercent(67, 'reset')).toBe(100);
    expect(() => parseZoomAction('maximum')).toThrow('Zoom操作が不正です。');
  });
});
