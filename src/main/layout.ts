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
  minimumColumnWidth = 0,
  scrollOffset = 0,
): ViewBounds[] => {
  if (count < 1 || count > 6) {
    throw new Error('View count must be between 1 and 6.');
  }

  const contentHeight = Math.max(0, height - toolbarHeight);
  if (count === 1) {
    return [{ x: 0, y: toolbarHeight, width, height: contentHeight }];
  }

  const layoutWidth = Math.max(width, count * minimumColumnWidth + count - 1);
  const maximumScrollOffset = Math.max(0, layoutWidth - width);
  const safeScrollOffset = Math.min(Math.max(0, Math.round(scrollOffset)), maximumScrollOffset);

  return splitIntoColumns(count, layoutWidth).map((bounds) => ({
    ...bounds,
    x: bounds.x - safeScrollOffset,
    y: toolbarHeight,
    height: contentHeight,
  }));
};
