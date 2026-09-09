import { getAiServiceByUrl, type AiServiceId } from './ai-services';
import { normalizeNavigationUrl } from './navigation';

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  serviceId: AiServiceId;
}

export const bookmarkChannels = {
  add: 'bookmark:add',
  getAll: 'bookmark:get-all',
  open: 'bookmark:open',
  remove: 'bookmark:remove',
} as const;

export const parseBookmarks = (input: unknown): Bookmark[] => {
  if (!Array.isArray(input)) return [];
  const urls = new Set<string>();
  const bookmarks: Bookmark[] = [];
  for (const item of input) {
    try {
      if (!item || typeof item !== 'object') continue;
      const candidate = item as Partial<Bookmark>;
      if (typeof candidate.id !== 'string' || !candidate.id) continue;
      const url = normalizeNavigationUrl(candidate.url ?? '');
      const service = getAiServiceByUrl(url);
      if (!service || urls.has(url)) continue;
      const title = typeof candidate.title === 'string' && candidate.title.trim()
        ? candidate.title.trim()
        : url;
      urls.add(url);
      bookmarks.push({ id: candidate.id, title, url, serviceId: service.id });
    } catch {
      continue;
    }
  }
  return bookmarks;
};
