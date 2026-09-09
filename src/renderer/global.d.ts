export {};

import type { NavigationState, ViewId } from '../shared/navigation';
import type { Bookmark } from '../shared/bookmarks';

declare global {
  interface Window {
    multiAI: {
      addBookmark: (viewId: ViewId) => Promise<Bookmark[]>;
      addView: () => Promise<NavigationState[]>;
      back: (viewId: ViewId) => Promise<void>;
      forward: (viewId: ViewId) => Promise<void>;
      getNavigationStates: () => Promise<NavigationState[]>;
      getSelectedViewId: () => Promise<ViewId | null>;
      getBookmarks: () => Promise<Bookmark[]>;
      navigate: (viewId: ViewId, url: string) => Promise<void>;
      openBookmark: (viewId: ViewId, bookmarkId: string) => Promise<void>;
      onNavigationState: (listener: (state: NavigationState) => void) => () => void;
      ping: () => Promise<string>;
      removeBookmark: (bookmarkId: string) => Promise<Bookmark[]>;
      removeView: (viewId: ViewId) => Promise<NavigationState[]>;
      reload: (viewId: ViewId) => Promise<void>;
      selectView: (viewId: ViewId) => Promise<void>;
    };
  }
}
