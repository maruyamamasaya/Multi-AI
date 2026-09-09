export {};

import type { NavigationState, ViewId, ViewMoveDirection } from '../shared/navigation';
import type { Bookmark } from '../shared/bookmarks';
import type { AiServiceId } from '../shared/ai-services';
import type { NamedWorkspaceLoadResult, NamedWorkspaceSummary, StartupWorkspaceSelection, StartupWorkspaceState } from '../shared/named-workspaces';
import type { PromptSendResult } from '../shared/prompt';
import type { ComparisonLayoutState } from '../shared/comparison';
import type { ZoomAction } from '../shared/zoom';
import type { TabVisibilityResult } from '../shared/tab-visibility';

declare global {
  interface Window {
    multiAI: {
      addBookmark: (viewId: ViewId) => Promise<Bookmark[]>;
      addView: (serviceId: AiServiceId) => Promise<NavigationState[]>;
      back: (viewId: ViewId) => Promise<void>;
      exitComparison: () => Promise<void>;
      forward: (viewId: ViewId) => Promise<void>;
      getZoomPercent: () => Promise<number>;
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
      sendPrompt: (prompt: string, viewIds: ViewId[]) => Promise<PromptSendResult[]>;
      setFocusMode: (viewId: ViewId, focused: boolean) => Promise<void>;
      setComparisonLayout: (layout: ComparisonLayoutState) => Promise<void>;
      setLauncherOpen: (open: boolean) => Promise<void>;
      setTabVisibility: (viewId: ViewId, visible: boolean) => Promise<TabVisibilityResult>;
      setPaneScrollOffset: (offset: number) => Promise<void>;
      setHeaderCollapsed: (collapsed: boolean) => Promise<void>;
      changeZoom: (action: ZoomAction) => Promise<number>;
      startWorkspace: (selection: StartupWorkspaceSelection) => Promise<NamedWorkspaceLoadResult>;
    };
  }
}
