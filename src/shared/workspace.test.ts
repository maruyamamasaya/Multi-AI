import { describe, expect, it } from 'vitest';
import { parseWorkspaceSnapshot } from './workspace';

const fallback = ['https://example.com/', 'https://example.org/'];

describe('parseWorkspaceSnapshot', () => {
  it('restores valid URLs and selection', () => {
    expect(parseWorkspaceSnapshot({ urls: ['example.net'], selectedIndex: 0 }, fallback)).toEqual({
      viewCount: 1,
      urls: ['https://example.net/'],
      serviceIds: [null],
      visibleIndices: [0],
      selectedIndex: 0,
      layout: 'single',
      zoomPercent: 80,
    });
  });

  it('falls back when a URL uses a dangerous protocol', () => {
    expect(parseWorkspaceSnapshot({ urls: ['file:///secret'], selectedIndex: 0 }, fallback)).toEqual({
      viewCount: 2,
      urls: fallback,
      serviceIds: [null, null],
      visibleIndices: [0, 1],
      selectedIndex: 0,
      layout: 'columns',
      zoomPercent: 80,
    });
  });

  it('repairs an invalid selected index', () => {
    expect(parseWorkspaceSnapshot({ urls: ['https://example.net'], selectedIndex: 9 }, fallback)).toEqual({
      viewCount: 1,
      urls: ['https://example.net/'],
      serviceIds: [null],
      visibleIndices: [0],
      selectedIndex: 0,
      layout: 'single',
      zoomPercent: 80,
    });
  });

  it('derives and repairs the saved count and layout from valid URLs', () => {
    expect(
      parseWorkspaceSnapshot(
        {
          viewCount: 4,
          urls: ['example.com', 'example.org', 'example.net'],
          selectedIndex: 2,
          layout: 'grid',
        },
        fallback,
      ),
    ).toEqual({
      viewCount: 3,
      urls: ['https://example.com/', 'https://example.org/', 'https://example.net/'],
      serviceIds: [null, null, null],
      visibleIndices: [0, 1, 2],
      selectedIndex: 2,
      layout: 'primary-left',
      zoomPercent: 80,
    });
  });

  it('restores a saved service identity across an authentication redirect', () => {
    expect(
      parseWorkspaceSnapshot(
        {
          urls: ['https://accounts.google.com/signin'],
          serviceIds: ['notebooklm'],
          selectedIndex: 0,
        },
        fallback,
      ),
    ).toMatchObject({ serviceIds: ['notebooklm'] });
  });

  it('restores a supported shared zoom level', () => {
    expect(parseWorkspaceSnapshot({ urls: ['example.net'], zoomPercent: 125 }, fallback).zoomPercent).toBe(125);
  });

  it('keeps many tabs but restores at most four visible tabs', () => {
    const urls = Array.from({ length: 8 }, (_, index) => `https://example.com/${index}`);
    expect(parseWorkspaceSnapshot({ urls, visibleIndices: [0, 1, 2, 3, 4, 7] }, fallback))
      .toMatchObject({ viewCount: 8, visibleIndices: [0, 1, 2, 3, 4, 7] });
  });

});
