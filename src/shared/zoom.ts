export const ZOOM_LEVELS = [50, 67, 80, 90, 100, 110, 125, 150, 175, 200] as const;

export type ZoomAction = 'in' | 'out' | 'reset';

export const nextZoomPercent = (current: number, action: ZoomAction): number => {
  if (action === 'reset') return 100;
  if (action === 'in') return ZOOM_LEVELS.find((level) => level > current) ?? ZOOM_LEVELS.at(-1)!;
  return [...ZOOM_LEVELS].reverse().find((level) => level < current) ?? ZOOM_LEVELS[0];
};

export const parseZoomAction = (input: unknown): ZoomAction => {
  if (input === 'in' || input === 'out' || input === 'reset') return input;
  throw new Error('Zoom操作が不正です。');
};

export const zoomChannels = {
  get: 'zoom:get',
  change: 'zoom:change',
} as const;
