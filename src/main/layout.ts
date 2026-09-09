export interface ViewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const split = (size: number): [number, number] => {
  const first = Math.floor((size - 1) / 2);
  return [first, size - 1 - first];
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

  const [leftWidth, rightWidth] = split(width);
  if (count === 2) {
    return [
      { x: 0, y: toolbarHeight, width: leftWidth, height: contentHeight },
      { x: leftWidth + 1, y: toolbarHeight, width: rightWidth, height: contentHeight },
    ];
  }

  const [topHeight, bottomHeight] = split(contentHeight);
  if (count === 3) {
    return [
      { x: 0, y: toolbarHeight, width: leftWidth, height: contentHeight },
      { x: leftWidth + 1, y: toolbarHeight, width: rightWidth, height: topHeight },
      {
        x: leftWidth + 1,
        y: toolbarHeight + topHeight + 1,
        width: rightWidth,
        height: bottomHeight,
      },
    ];
  }

  return [
    { x: 0, y: toolbarHeight, width: leftWidth, height: topHeight },
    { x: leftWidth + 1, y: toolbarHeight, width: rightWidth, height: topHeight },
    { x: 0, y: toolbarHeight + topHeight + 1, width: leftWidth, height: bottomHeight },
    {
      x: leftWidth + 1,
      y: toolbarHeight + topHeight + 1,
      width: rightWidth,
      height: bottomHeight,
    },
  ];
};
