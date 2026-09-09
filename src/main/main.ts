import { app, BrowserWindow, ipcMain, session, WebContentsView } from 'electron';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { bookmarkChannels, type Bookmark } from '../shared/bookmarks';
import {
  navigationChannels,
  normalizeNavigationUrl,
  type NavigationState,
  type ViewId,
} from '../shared/navigation';
import { workspaceChannels, type WorkspaceSnapshot } from '../shared/workspace';
import { calculateViewBounds } from './layout';
import { readWorkspaceSnapshot, writeWorkspaceSnapshot } from './workspace-store';

const TOOLBAR_HEIGHT = 126;
const DEFAULT_URLS = ['https://example.com/', 'https://example.org/'] as const;
const MAX_VIEWS = 4;

interface PageView {
  id: ViewId;
  lastUrl: string;
  view: WebContentsView;
}

let mainWindow: BrowserWindow | null = null;
let pageViews: PageView[] = [];
let nextViewId = 1;
let selectedViewId: ViewId | null = null;
let workspaceWriteQueue = Promise.resolve();

const getPageView = (viewId: unknown): PageView => {
  if (!Number.isInteger(viewId)) throw new Error('対象のビューが見つかりません。');
  const pageView = pageViews.find(({ id }) => id === viewId);
  if (!pageView) throw new Error('対象のビューが見つかりません。');
  return pageView;
};

const getNavigationState = ({ id, lastUrl, view }: PageView): NavigationState => ({
  viewId: id,
  url: view.webContents.getURL() || lastUrl,
  title: view.webContents.getTitle(),
  canGoBack: view.webContents.navigationHistory.canGoBack(),
  canGoForward: view.webContents.navigationHistory.canGoForward(),
  isLoading: view.webContents.isLoading(),
});

const getNavigationStates = (): NavigationState[] => pageViews.map(getNavigationState);

const workspaceFile = (): string => path.join(app.getPath('userData'), 'workspace.json');

const persistWorkspace = (): Promise<void> => {
  const snapshot: WorkspaceSnapshot = {
    urls: pageViews.map(({ lastUrl, view }) => view.webContents.getURL() || lastUrl),
    selectedIndex: Math.max(0, pageViews.findIndex(({ id }) => id === selectedViewId)),
  };
  workspaceWriteQueue = workspaceWriteQueue.then(() =>
    writeWorkspaceSnapshot(workspaceFile(), snapshot),
  );
  return workspaceWriteQueue;
};

const updateViewBounds = (): void => {
  if (!mainWindow) return;
  const { width, height } = mainWindow.getContentBounds();
  const bounds = calculateViewBounds(pageViews.length, width, height, TOOLBAR_HEIGHT);
  pageViews.forEach(({ view }, index) => view.setBounds(bounds[index]));
};

const createPageView = (url: string): PageView => {
  if (!mainWindow) throw new Error('アプリウィンドウがありません。');
  const pageView: PageView = {
    id: nextViewId++,
    lastUrl: url,
    view: new WebContentsView({
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
    }),
  };
  const publishState = () => {
    if (mainWindow && !pageView.view.webContents.isDestroyed()) {
      pageView.lastUrl = pageView.view.webContents.getURL() || pageView.lastUrl;
      mainWindow.webContents.send(navigationChannels.stateChanged, getNavigationState(pageView));
    }
  };

  pageView.view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  pageView.view.webContents.on('did-navigate', () => {
    publishState();
    void persistWorkspace();
  });
  pageView.view.webContents.on('did-navigate-in-page', () => {
    publishState();
    void persistWorkspace();
  });
  pageView.view.webContents.on('did-start-loading', publishState);
  pageView.view.webContents.on('did-stop-loading', publishState);
  pageView.view.webContents.on('page-title-updated', publishState);
  mainWindow.contentView.addChildView(pageView.view);
  void pageView.view.webContents.loadURL(url);
  return pageView;
};

const addView = async (url: string = DEFAULT_URLS[0]): Promise<NavigationState[]> => {
  if (pageViews.length >= MAX_VIEWS) throw new Error('画面は4つまで追加できます。');
  const pageView = createPageView(url);
  pageViews.push(pageView);
  selectedViewId = pageView.id;
  updateViewBounds();
  await persistWorkspace();
  return getNavigationStates();
};

const removeView = async (viewId: unknown): Promise<NavigationState[]> => {
  if (pageViews.length === 1) throw new Error('少なくとも1つの画面が必要です。');
  const pageView = getPageView(viewId);
  mainWindow?.contentView.removeChildView(pageView.view);
  pageView.view.webContents.close();
  pageViews = pageViews.filter(({ id }) => id !== pageView.id);
  if (selectedViewId === pageView.id) selectedViewId = pageViews[0].id;
  updateViewBounds();
  await persistWorkspace();
  return getNavigationStates();
};

const bookmarksFile = (): string => path.join(app.getPath('userData'), 'bookmarks.json');

const readBookmarks = async (): Promise<Bookmark[]> => {
  try {
    const parsed: unknown = JSON.parse(await readFile(bookmarksFile(), 'utf8'));
    return Array.isArray(parsed) ? (parsed as Bookmark[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
};

const saveBookmarks = async (bookmarks: Bookmark[]): Promise<void> => {
  await writeFile(bookmarksFile(), `${JSON.stringify(bookmarks, null, 2)}\n`, 'utf8');
};

const registerIpcHandlers = (): void => {
  ipcMain.handle('app:ping', () => 'pong');
  ipcMain.handle(navigationChannels.getStates, getNavigationStates);
  ipcMain.handle(navigationChannels.add, () => addView());
  ipcMain.handle(navigationChannels.remove, (_event, viewId: unknown) => removeView(viewId));
  ipcMain.handle(navigationChannels.navigate, async (_event, viewId: unknown, input: unknown) => {
    if (typeof input !== 'string') throw new Error('URLを入力してください。');
    const pageView = getPageView(viewId);
    pageView.lastUrl = normalizeNavigationUrl(input);
    await pageView.view.webContents.loadURL(pageView.lastUrl);
    await persistWorkspace();
  });
  ipcMain.handle(navigationChannels.back, (_event, viewId: unknown) => {
    const history = getPageView(viewId).view.webContents.navigationHistory;
    if (history.canGoBack()) history.goBack();
  });
  ipcMain.handle(navigationChannels.forward, (_event, viewId: unknown) => {
    const history = getPageView(viewId).view.webContents.navigationHistory;
    if (history.canGoForward()) history.goForward();
  });
  ipcMain.handle(navigationChannels.reload, (_event, viewId: unknown) => {
    getPageView(viewId).view.webContents.reload();
  });
  ipcMain.handle(workspaceChannels.getSelectedViewId, () => selectedViewId);
  ipcMain.handle(workspaceChannels.selectView, async (_event, viewId: unknown) => {
    selectedViewId = getPageView(viewId).id;
    await persistWorkspace();
  });

  ipcMain.handle(bookmarkChannels.getAll, readBookmarks);
  ipcMain.handle(bookmarkChannels.add, async (_event, viewId: unknown) => {
    const state = getNavigationState(getPageView(viewId));
    if (!state.url) throw new Error('保存できるページがありません。');
    const bookmarks = await readBookmarks();
    if (!bookmarks.some(({ url }) => url === state.url)) {
      bookmarks.push({ id: randomUUID(), title: state.title || state.url, url: state.url });
      await saveBookmarks(bookmarks);
    }
    return bookmarks;
  });
  ipcMain.handle(bookmarkChannels.remove, async (_event, bookmarkId: unknown) => {
    if (typeof bookmarkId !== 'string') throw new Error('ブックマークが見つかりません。');
    const bookmarks = (await readBookmarks()).filter(({ id }) => id !== bookmarkId);
    await saveBookmarks(bookmarks);
    return bookmarks;
  });
  ipcMain.handle(bookmarkChannels.open, async (_event, viewId: unknown, bookmarkId: unknown) => {
    const bookmark = (await readBookmarks()).find(({ id }) => id === bookmarkId);
    if (!bookmark) throw new Error('ブックマークが見つかりません。');
    await getPageView(viewId).view.webContents.loadURL(normalizeNavigationUrl(bookmark.url));
  });
};

const createMainWindow = (workspace: WorkspaceSnapshot): BrowserWindow => {
  const window = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 720,
    minHeight: 480,
    title: 'Multi-AI',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
  });
  mainWindow = window;
  void window.loadFile(path.join(__dirname, '../../dist-renderer/index.html'));
  pageViews = workspace.urls.map(createPageView);
  selectedViewId = pageViews[workspace.selectedIndex]?.id ?? pageViews[0].id;
  updateViewBounds();
  window.on('resize', updateViewBounds);
  window.on('closed', () => {
    mainWindow = null;
    pageViews = [];
  });
  return window;
};

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => callback(false),
  );
  registerIpcHandlers();
  const workspace = await readWorkspaceSnapshot(workspaceFile(), DEFAULT_URLS);
  mainWindow = createMainWindow(workspace);
  await persistWorkspace();
  app.on('activate', async () => {
    if (mainWindow === null) {
      mainWindow = createMainWindow(await readWorkspaceSnapshot(workspaceFile(), DEFAULT_URLS));
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
