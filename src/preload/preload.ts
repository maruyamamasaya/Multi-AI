import { contextBridge, ipcRenderer } from 'electron';
import { bookmarkChannels, type Bookmark } from '../shared/bookmarks';
import { launcherChannels, type AiServiceId } from '../shared/ai-services';
import {
  navigationChannels,
  type NavigationState,
  type ViewId,
  type ViewMoveDirection,
} from '../shared/navigation';
import { workspaceChannels } from '../shared/workspace';

contextBridge.exposeInMainWorld('multiAI', {
  addBookmark: (viewId: ViewId): Promise<Bookmark[]> =>
    ipcRenderer.invoke(bookmarkChannels.add, viewId),
  addView: (serviceId: AiServiceId): Promise<NavigationState[]> =>
    ipcRenderer.invoke(navigationChannels.add, serviceId),
  back: (viewId: ViewId): Promise<void> => ipcRenderer.invoke(navigationChannels.back, viewId),
  forward: (viewId: ViewId): Promise<void> =>
    ipcRenderer.invoke(navigationChannels.forward, viewId),
  getNavigationStates: (): Promise<NavigationState[]> =>
    ipcRenderer.invoke(navigationChannels.getStates),
  getSelectedViewId: (): Promise<ViewId | null> =>
    ipcRenderer.invoke(workspaceChannels.getSelectedViewId),
  navigate: (viewId: ViewId, url: string): Promise<void> =>
    ipcRenderer.invoke(navigationChannels.navigate, viewId, url),
  moveView: (viewId: ViewId, direction: ViewMoveDirection): Promise<NavigationState[]> =>
    ipcRenderer.invoke(navigationChannels.move, viewId, direction),
  getBookmarks: (): Promise<Bookmark[]> => ipcRenderer.invoke(bookmarkChannels.getAll),
  openBookmark: (viewId: ViewId, bookmarkId: string): Promise<void> =>
    ipcRenderer.invoke(bookmarkChannels.open, viewId, bookmarkId),
  onNavigationState: (listener: (state: NavigationState) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: NavigationState) => listener(state);
    ipcRenderer.on(navigationChannels.stateChanged, handler);
    return () => ipcRenderer.removeListener(navigationChannels.stateChanged, handler);
  },
  ping: (): Promise<string> => ipcRenderer.invoke('app:ping'),
  removeBookmark: (bookmarkId: string): Promise<Bookmark[]> =>
    ipcRenderer.invoke(bookmarkChannels.remove, bookmarkId),
  removeView: (viewId: ViewId): Promise<NavigationState[]> =>
    ipcRenderer.invoke(navigationChannels.remove, viewId),
  reload: (viewId: ViewId): Promise<void> => ipcRenderer.invoke(navigationChannels.reload, viewId),
  selectView: (viewId: ViewId): Promise<void> =>
    ipcRenderer.invoke(workspaceChannels.selectView, viewId),
  setLauncherOpen: (open: boolean): Promise<void> => ipcRenderer.invoke(launcherChannels.setOpen, open),
});
