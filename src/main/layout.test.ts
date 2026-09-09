import { describe, expect, it } from 'vitest';
import { calculateViewBounds } from './layout';

describe('calculateViewBounds', () => {
  it('uses the full content area for one view', () => {
    expect(calculateViewBounds(1, 1001, 700, 126)).toEqual([
      { x: 0, y: 126, width: 1001, height: 574 },
    ]);
  });

  it('splits two views from left to right', () => {
    expect(calculateViewBounds(2, 1001, 700, 126)).toEqual([
      { x: 0, y: 126, width: 500, height: 574 },
      { x: 501, y: 126, width: 500, height: 574 },
    ]);
  });

  it('uses one large and two stacked areas for three views', () => {
    expect(calculateViewBounds(3, 1001, 700, 126)).toHaveLength(3);
  });

  it('uses a two by two grid for four views', () => {
    const bounds = calculateViewBounds(4, 1001, 700, 126);
    expect(bounds).toHaveLength(4);
    expect(bounds[3]).toEqual({ x: 501, y: 413, width: 500, height: 287 });
  });
});
