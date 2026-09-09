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

  it('splits three views into equal-width vertical columns', () => {
    expect(calculateViewBounds(3, 1001, 700, 126)).toEqual([
      { x: 0, y: 126, width: 333, height: 574 },
      { x: 334, y: 126, width: 333, height: 574 },
      { x: 668, y: 126, width: 333, height: 574 },
    ]);
  });

  it('splits four views into full-height vertical columns', () => {
    expect(calculateViewBounds(4, 1001, 700, 126)).toEqual([
      { x: 0, y: 126, width: 249, height: 574 },
      { x: 250, y: 126, width: 249, height: 574 },
      { x: 500, y: 126, width: 250, height: 574 },
      { x: 751, y: 126, width: 250, height: 574 },
    ]);
  });

  it('keeps four columns usable at the minimum window width', () => {
    const bounds = calculateViewBounds(4, 720, 480, 250);

    expect(bounds).toEqual([
      { x: 0, y: 250, width: 179, height: 230 },
      { x: 180, y: 250, width: 179, height: 230 },
      { x: 360, y: 250, width: 179, height: 230 },
      { x: 540, y: 250, width: 180, height: 230 },
    ]);
  });
});
