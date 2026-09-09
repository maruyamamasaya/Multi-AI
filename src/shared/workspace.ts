import { normalizeNavigationUrl, type ViewId } from './navigation';
import { getAiService, getAiServiceByUrl, type AiServiceId } from './ai-services';

export interface WorkspaceSnapshot {
  viewCount: number;
  urls: string[];
  serviceIds: (AiServiceId | null)[];
  visibleIndices: number[];
  selectedIndex: number;
  layout: WorkspaceLayout;
}

export type WorkspaceLayout = 'single' | 'columns' | 'primary-left' | 'grid';

export const workspaceLayoutForViewCount = (viewCount: number): WorkspaceLayout => {
  if (viewCount === 1) return 'single';
  if (viewCount === 2) return 'columns';
  if (viewCount === 3) return 'primary-left';
  return 'grid';
};

export const workspaceChannels = {
  getSelectedViewId: 'workspace:get-selected-view-id',
  selectView: 'workspace:select-view',
} as const;

export const parseWorkspaceSnapshot = (
  input: unknown,
  fallbackUrls: readonly string[],
): WorkspaceSnapshot => {
  const fallback = {
    viewCount: fallbackUrls.length,
    urls: [...fallbackUrls],
    serviceIds: fallbackUrls.map((url) => getAiServiceByUrl(url)?.id ?? null),
    visibleIndices: fallbackUrls.slice(0, 4).map((_, index) => index),
    selectedIndex: 0,
    layout: workspaceLayoutForViewCount(fallbackUrls.length),
  };
  if (!input || typeof input !== 'object') return fallback;

  const candidate = input as Partial<WorkspaceSnapshot>;
  if (!Array.isArray(candidate.urls) || candidate.urls.length < 1 || candidate.urls.length > 32) {
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
    const serviceIds = urls.map((url, index) => {
      const savedId = Array.isArray(candidate.serviceIds) ? candidate.serviceIds[index] : undefined;
      return getAiService(savedId)?.id ?? getAiServiceByUrl(url)?.id ?? null;
    });
    const viewCount = urls.length;
    const visibleIndices = Array.isArray(candidate.visibleIndices)
      ? [...new Set(candidate.visibleIndices.filter(
          (index): index is number => Number.isInteger(index) && index >= 0 && index < viewCount,
        ))].slice(0, 4)
      : urls.slice(0, 4).map((_, index) => index);
    if (!visibleIndices.length) visibleIndices.push(0);
    return {
      viewCount,
      urls,
      serviceIds,
      visibleIndices,
      selectedIndex,
      layout: workspaceLayoutForViewCount(viewCount),
    };
  } catch {
    return fallback;
  }
};

export type SelectedViewId = ViewId;
