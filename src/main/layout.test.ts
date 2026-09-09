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

  it('keeps five and six views in a single horizontal row', () => {
    expect(calculateViewBounds(5, 1201, 700, 126)).toHaveLength(5);
    expect(calculateViewBounds(6, 1445, 700, 126)).toEqual([
      { x: 0, y: 126, width: 240, height: 574 },
      { x: 241, y: 126, width: 240, height: 574 },
      { x: 482, y: 126, width: 240, height: 574 },
      { x: 723, y: 126, width: 240, height: 574 },
      { x: 964, y: 126, width: 240, height: 574 },
      { x: 1205, y: 126, width: 240, height: 574 },
    ]);
  });

  it('uses minimum-width columns and applies horizontal scrolling', () => {
    expect(calculateViewBounds(6, 720, 480, 278, 240, 300)[0]).toEqual(
      { x: -300, y: 278, width: 240, height: 202 },
    );
    expect(calculateViewBounds(6, 720, 480, 278, 240, 9999).at(-1)?.x).toBe(480);
  });
});
