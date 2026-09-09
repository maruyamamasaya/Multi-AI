export {};

import type { NavigationState, ViewId, ViewMoveDirection } from '../shared/navigation';
import type { Bookmark } from '../shared/bookmarks';
import type { AiServiceId } from '../shared/ai-services';
import type { NamedWorkspaceLoadResult, NamedWorkspaceSummary, StartupWorkspaceSelection, StartupWorkspaceState } from '../shared/named-workspaces';

declare global {
  interface Window {
    multiAI: {
      addBookmark: (viewId: ViewId) => Promise<Bookmark[]>;
      addView: (serviceId: AiServiceId) => Promise<NavigationState[]>;
      back: (viewId: ViewId) => Promise<void>;
      forward: (viewId: ViewId) => Promise<void>;
      getNavigationStates: () => Promise<NavigationState[]>;
      getNamedWorkspaces: () => Promise<NamedWorkspaceSummary[]>;
      getStartupWorkspaceState: () => Promise<StartupWorkspaceState>;
      getSelectedViewId: () => Promise<ViewId | null>;
      getBookmarks: () => Promise<Bookmark[]>;
      navigate: (viewId: ViewId, url: string) => Promise<void>;
      moveView: (viewId: ViewId, direction: ViewMoveDirection) => Promise<NavigationState[]>;
      loadNamedWorkspace: (workspaceId: string) => Promise<NamedWorkspaceLoadResult>;
      openBookmark: (viewId: ViewId, bookmarkId: string) => Promise<void>;
      onNavigationState: (listener: (state: NavigationState) => void) => () => void;
      ping: () => Promise<string>;
      removeBookmark: (bookmarkId: string) => Promise<Bookmark[]>;
      removeNamedWorkspace: (workspaceId: string) => Promise<NamedWorkspaceSummary[]>;
      removeView: (viewId: ViewId) => Promise<NavigationState[]>;
      reload: (viewId: ViewId) => Promise<void>;
      selectView: (viewId: ViewId) => Promise<void>;
      saveNamedWorkspace: (name: string, overwrite: boolean) => Promise<NamedWorkspaceSummary[]>;
      setFocusMode: (viewId: ViewId, focused: boolean) => Promise<void>;
      setLauncherOpen: (open: boolean) => Promise<void>;
      startWorkspace: (selection: StartupWorkspaceSelection) => Promise<NamedWorkspaceLoadResult>;
    };
  }
}
