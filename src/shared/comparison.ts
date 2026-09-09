import type { ViewId } from './navigation';

export interface ComparisonLayoutState {
  activeViewIds: ViewId[];
  focusedViewId: ViewId | null;
}

export const comparisonChannels = {
  set: 'comparison:set-layout',
  exit: 'comparison:exit',
} as const;

export const parseComparisonLayout = (input: unknown): ComparisonLayoutState => {
  if (!input || typeof input !== 'object') throw new Error('比較対象が不正です。');
  const candidate = input as Partial<ComparisonLayoutState>;
  if (!Array.isArray(candidate.activeViewIds)) throw new Error('比較対象が不正です。');
  const activeViewIds = [...new Set(candidate.activeViewIds.filter((viewId): viewId is number => Number.isInteger(viewId)))];
  if (!activeViewIds.length || activeViewIds.length > 4) throw new Error('比較対象を1つ以上選択してください。');
  const focusedViewId = candidate.focusedViewId === null ? null : candidate.focusedViewId;
  if (focusedViewId !== null && (!Number.isInteger(focusedViewId) || !activeViewIds.includes(focusedViewId!))) {
    throw new Error('集中表示する比較対象が不正です。');
  }
  return { activeViewIds, focusedViewId: focusedViewId as ViewId | null };
};
