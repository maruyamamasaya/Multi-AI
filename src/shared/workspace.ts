import { normalizeNavigationUrl, type ViewId } from './navigation';

export interface WorkspaceSnapshot {
  urls: string[];
  selectedIndex: number;
}

export const workspaceChannels = {
  getSelectedViewId: 'workspace:get-selected-view-id',
  selectView: 'workspace:select-view',
} as const;

export const parseWorkspaceSnapshot = (
  input: unknown,
  fallbackUrls: readonly string[],
): WorkspaceSnapshot => {
  const fallback = { urls: [...fallbackUrls], selectedIndex: 0 };
  if (!input || typeof input !== 'object') return fallback;

  const candidate = input as Partial<WorkspaceSnapshot>;
  if (!Array.isArray(candidate.urls) || candidate.urls.length < 1 || candidate.urls.length > 4) {
    return fallback;
  }

  try {
    const urls = candidate.urls.map((url) => {
      if (typeof url !== 'string') throw new Error('Invalid URL');
      return normalizeNavigationUrl(url);
    });
    const selectedIndex =
      Number.isInteger(candidate.selectedIndex) &&
      Number(candidate.selectedIndex) >= 0 &&
      Number(candidate.selectedIndex) < urls.length
        ? Number(candidate.selectedIndex)
        : 0;
    return { urls, selectedIndex };
  } catch {
    return fallback;
  }
};

export type SelectedViewId = ViewId;
