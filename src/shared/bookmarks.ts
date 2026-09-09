import { getAiServiceByUrl, type AiServiceId } from './ai-services';
import { normalizeNavigationUrl } from './navigation';

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  serviceId: AiServiceId;
  savedAt?: string;
}

export interface BookmarkUpdate {
  title: string;
  url: string;
}

export const bookmarkChannels = {
  add: 'bookmark:add',
  getAll: 'bookmark:get-all',
  managerSetOpen: 'bookmark:manager-set-open',
  open: 'bookmark:open',
  remove: 'bookmark:remove',
  update: 'bookmark:update',
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
      const savedAt = typeof candidate.savedAt === 'string' && !Number.isNaN(Date.parse(candidate.savedAt))
        ? candidate.savedAt
        : undefined;
      bookmarks.push({ id: candidate.id, title, url, serviceId: service.id, ...(savedAt ? { savedAt } : {}) });
    } catch {
      continue;
    }
  }
  return bookmarks;
};

export const parseBookmarkUpdate = (input: unknown): BookmarkUpdate & { serviceId: AiServiceId } => {
  if (!input || typeof input !== 'object') throw new Error('会話情報が正しくありません。');
  const candidate = input as Partial<BookmarkUpdate>;
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  if (!title) throw new Error('会話タイトルを入力してください。');
  if (title.length > 200) throw new Error('会話タイトルは200文字以内で入力してください。');
  const url = normalizeNavigationUrl(candidate.url ?? '');
  const service = getAiServiceByUrl(url);
  if (!service) throw new Error('対応AIサービスのURLを入力してください。');
  return { title, url, serviceId: service.id };
};
