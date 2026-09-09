export interface Bookmark {
  id: string;
  title: string;
  url: string;
}

export const bookmarkChannels = {
  add: 'bookmark:add',
  getAll: 'bookmark:get-all',
  open: 'bookmark:open',
  remove: 'bookmark:remove',
} as const;
