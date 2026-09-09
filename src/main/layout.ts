export interface ViewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const splitIntoColumns = (count: number, width: number): ViewBounds[] => {
  const availableWidth = Math.max(0, width - (count - 1));
  const baseWidth = Math.floor(availableWidth / count);
  const remainder = availableWidth % count;
  let x = 0;

  return Array.from({ length: count }, (_, index) => {
    const columnWidth = baseWidth + (index >= count - remainder ? 1 : 0);
    const bounds = { x, y: 0, width: columnWidth, height: 0 };
    x += columnWidth + 1;
    return bounds;
  });
};

export const calculateViewBounds = (
  count: number,
  width: number,
  height: number,
  toolbarHeight: number,
): ViewBounds[] => {
  if (count < 1 || count > 4) {
    throw new Error('View count must be between 1 and 4.');
  }

  const contentHeight = Math.max(0, height - toolbarHeight);
  if (count === 1) {
    return [{ x: 0, y: toolbarHeight, width, height: contentHeight }];
  }

  return splitIntoColumns(count, width).map((bounds) => ({
    ...bounds,
    y: toolbarHeight,
    height: contentHeight,
  }));
};
