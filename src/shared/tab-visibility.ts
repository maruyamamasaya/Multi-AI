import type { ViewId } from './navigation';

export interface TabVisibilityResult {
  visibleViewIds: ViewId[];
  selectedViewId: ViewId;
}

export const tabVisibilityChannels = { set: 'tab-visibility:set' } as const;
