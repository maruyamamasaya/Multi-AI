import { contextBridge, ipcRenderer } from 'electron';
import { bookmarkChannels, type Bookmark } from '../shared/bookmarks';
import { launcherChannels, type AiServiceId } from '../shared/ai-services';
import {
  namedWorkspaceChannels,
  type NamedWorkspaceLoadResult,
  type NamedWorkspaceSummary,
  type StartupWorkspaceSelection,
  type StartupWorkspaceState,
} from '../shared/named-workspaces';
import {
  navigationChannels,
  type NavigationState,
  type ViewId,
  type ViewMoveDirection,
} from '../shared/navigation';
import { workspaceChannels } from '../shared/workspace';
import { promptChannels, type PromptSendResult } from '../shared/prompt';
import { comparisonChannels, type ComparisonLayoutState } from '../shared/comparison';
import { zoomChannels, type ZoomAction } from '../shared/zoom';
import { tabVisibilityChannels, type TabVisibilityResult } from '../shared/tab-visibility';
import { paneLayoutChannels } from '../shared/pane-layout';

contextBridge.exposeInMainWorld('multiAI', {
  addBookmark: (viewId: ViewId): Promise<Bookmark[]> =>
    ipcRenderer.invoke(bookmarkChannels.add, viewId),
  addView: (serviceId: AiServiceId): Promise<NavigationState[]> =>
    ipcRenderer.invoke(navigationChannels.add, serviceId),
  back: (viewId: ViewId): Promise<void> => ipcRenderer.invoke(navigationChannels.back, viewId),
  exitComparison: (): Promise<void> => ipcRenderer.invoke(comparisonChannels.exit),
  forward: (viewId: ViewId): Promise<void> =>
    ipcRenderer.invoke(navigationChannels.forward, viewId),
  getZoomPercent: (): Promise<number> => ipcRenderer.invoke(zoomChannels.get),
  getNavigationStates: (): Promise<NavigationState[]> =>
    ipcRenderer.invoke(navigationChannels.getStates),
  getNamedWorkspaces: (): Promise<NamedWorkspaceSummary[]> =>
    ipcRenderer.invoke(namedWorkspaceChannels.getAll),
  getStartupWorkspaceState: (): Promise<StartupWorkspaceState> =>
    ipcRenderer.invoke(namedWorkspaceChannels.getStartupState),
  getSelectedViewId: (): Promise<ViewId | null> =>
    ipcRenderer.invoke(workspaceChannels.getSelectedViewId),
  navigate: (viewId: ViewId, url: string): Promise<void> =>
    ipcRenderer.invoke(navigationChannels.navigate, viewId, url),
  moveView: (viewId: ViewId, direction: ViewMoveDirection): Promise<NavigationState[]> =>
    ipcRenderer.invoke(navigationChannels.move, viewId, direction),
  getBookmarks: (): Promise<Bookmark[]> => ipcRenderer.invoke(bookmarkChannels.getAll),
  openBookmark: (viewId: ViewId, bookmarkId: string): Promise<void> =>
    ipcRenderer.invoke(bookmarkChannels.open, viewId, bookmarkId),
  loadNamedWorkspace: (workspaceId: string): Promise<NamedWorkspaceLoadResult> =>
    ipcRenderer.invoke(namedWorkspaceChannels.load, workspaceId),
  onNavigationState: (listener: (state: NavigationState) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: NavigationState) => listener(state);
    ipcRenderer.on(navigationChannels.stateChanged, handler);
    return () => ipcRenderer.removeListener(navigationChannels.stateChanged, handler);
  },
  ping: (): Promise<string> => ipcRenderer.invoke('app:ping'),
  removeBookmark: (bookmarkId: string): Promise<Bookmark[]> =>
    ipcRenderer.invoke(bookmarkChannels.remove, bookmarkId),
  removeNamedWorkspace: (workspaceId: string): Promise<NamedWorkspaceSummary[]> =>
    ipcRenderer.invoke(namedWorkspaceChannels.remove, workspaceId),
  removeView: (viewId: ViewId): Promise<NavigationState[]> =>
    ipcRenderer.invoke(navigationChannels.remove, viewId),
  reload: (viewId: ViewId): Promise<void> => ipcRenderer.invoke(navigationChannels.reload, viewId),
  selectView: (viewId: ViewId): Promise<void> =>
    ipcRenderer.invoke(workspaceChannels.selectView, viewId),
  saveNamedWorkspace: (name: string, overwrite: boolean): Promise<NamedWorkspaceSummary[]> =>
    ipcRenderer.invoke(namedWorkspaceChannels.save, name, overwrite),
  sendPrompt: (prompt: string, viewIds: ViewId[]): Promise<PromptSendResult[]> =>
    ipcRenderer.invoke(promptChannels.send, prompt, viewIds),
  startWorkspace: (selection: StartupWorkspaceSelection): Promise<NamedWorkspaceLoadResult> =>
    ipcRenderer.invoke(namedWorkspaceChannels.start, selection),
  setFocusMode: (viewId: ViewId, focused: boolean): Promise<void> =>
    ipcRenderer.invoke(navigationChannels.focus, viewId, focused),
  setComparisonLayout: (layout: ComparisonLayoutState): Promise<void> =>
    ipcRenderer.invoke(comparisonChannels.set, layout),
  setLauncherOpen: (open: boolean): Promise<void> => ipcRenderer.invoke(launcherChannels.setOpen, open),
  setTabVisibility: (viewId: ViewId, visible: boolean): Promise<TabVisibilityResult> =>
    ipcRenderer.invoke(tabVisibilityChannels.set, viewId, visible),
  setPaneScrollOffset: (offset: number): Promise<void> =>
    ipcRenderer.invoke(paneLayoutChannels.setScrollOffset, offset),
  changeZoom: (action: ZoomAction): Promise<number> => ipcRenderer.invoke(zoomChannels.change, action),
});
