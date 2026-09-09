import { app, BrowserWindow, ipcMain, session, WebContentsView } from 'electron';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  getAiService,
  getAiServiceByUrl,
  launcherChannels,
  type AiServiceId,
} from '../shared/ai-services';
import { bookmarkChannels, parseBookmarks, type Bookmark } from '../shared/bookmarks';
import {
  namedWorkspaceChannels,
  normalizeWorkspaceName,
  summarizeNamedWorkspaces,
  workspaceNamesMatch,
  type NamedWorkspaceLoadResult,
  type NamedWorkspaceSummary,
  type StartupWorkspaceSelection,
  type StartupWorkspaceState,
} from '../shared/named-workspaces';
import {
  navigationChannels,
  normalizeNavigationUrl,
  type NavigationState,
  type ViewId,
} from '../shared/navigation';
import {
  workspaceChannels,
  workspaceLayoutForViewCount,
  type WorkspaceSnapshot,
} from '../shared/workspace';
import { calculateViewBounds } from './layout';
import { readNamedWorkspaceFile, writeNamedWorkspaceFile } from './named-workspace-store';
import { readWorkspaceSnapshot, writeWorkspaceSnapshot } from './workspace-store';

const TOOLBAR_HEIGHT = 164;
const DEFAULT_URLS = ['https://example.com/'] as const;
const MAX_VIEWS = 4;

interface PageView {
  id: ViewId;
  lastUrl: string;
  serviceId: AiServiceId | null;
  view: WebContentsView;
}

let mainWindow: BrowserWindow | null = null;
let pageViews: PageView[] = [];
let nextViewId = 1;
let selectedViewId: ViewId | null = null;
let workspaceWriteQueue = Promise.resolve();
let namedWorkspaceWriteQueue = Promise.resolve();
let isRestoringWorkspace = false;
let isLauncherOpen = false;
let focusedViewId: ViewId | null = null;
let isStartupSelectionOpen = false;

const getPageView = (viewId: unknown): PageView => {
  if (!Number.isInteger(viewId)) throw new Error('対象のビューが見つかりません。');
  const pageView = pageViews.find(({ id }) => id === viewId);
  if (!pageView) throw new Error('対象のビューが見つかりません。');
  return pageView;
};

const getNavigationState = ({ id, lastUrl, serviceId, view }: PageView): NavigationState => ({
  viewId: id,
  serviceId,
  url: view.webContents.getURL() || lastUrl,
  title: view.webContents.getTitle(),
  canGoBack: view.webContents.navigationHistory.canGoBack(),
  canGoForward: view.webContents.navigationHistory.canGoForward(),
  isLoading: view.webContents.isLoading(),
});

const getNavigationStates = (): NavigationState[] => pageViews.map(getNavigationState);

const workspaceFile = (): string => path.join(app.getPath('userData'), 'workspace.json');
const namedWorkspacesFile = (): string => path.join(app.getPath('userData'), 'named-workspaces.json');

const captureWorkspace = (): WorkspaceSnapshot => ({
    viewCount: pageViews.length,
    urls: pageViews.map(({ lastUrl, view }) => view.webContents.getURL() || lastUrl),
    serviceIds: pageViews.map(({ serviceId }) => serviceId),
    selectedIndex: Math.max(0, pageViews.findIndex(({ id }) => id === selectedViewId)),
    layout: workspaceLayoutForViewCount(pageViews.length),
});

const persistWorkspace = (): Promise<void> => {
  const snapshot = captureWorkspace();
  workspaceWriteQueue = workspaceWriteQueue.catch(() => undefined).then(() =>
    writeWorkspaceSnapshot(workspaceFile(), snapshot),
  );
  return workspaceWriteQueue;
};

const updateViewBounds = (): void => {
  if (!mainWindow) return;
  const { width, height } = mainWindow.getContentBounds();
  if (isLauncherOpen || isStartupSelectionOpen) {
    pageViews.forEach(({ view }) => view.setVisible(false));
    return;
  }
  if (focusedViewId !== null) {
    pageViews.forEach(({ id, view }) => {
      const isFocused = id === focusedViewId;
      view.setVisible(isFocused);
      if (isFocused) {
        view.setBounds({ x: 0, y: TOOLBAR_HEIGHT, width, height: Math.max(0, height - TOOLBAR_HEIGHT) });
      }
    });
    return;
  }
  const bounds = calculateViewBounds(pageViews.length, width, height, TOOLBAR_HEIGHT);
  pageViews.forEach(({ view }, index) => {
    view.setVisible(true);
    view.setBounds(bounds[index]);
  });
};

const ensureSplitMode = (): void => {
  if (focusedViewId !== null) throw new Error('集中表示を解除してから画面を変更してください。');
};

const replaceWorkspace = async (snapshot: WorkspaceSnapshot): Promise<NamedWorkspaceLoadResult> => {
  ensureSplitMode();
  if (isLauncherOpen) throw new Error('ランチャーを閉じてからワークスペースを切り替えてください。');
  isRestoringWorkspace = true;
  try {
    pageViews.forEach(({ view }) => {
      mainWindow?.contentView.removeChildView(view);
      view.webContents.close();
    });
    pageViews = snapshot.urls.map((url, index) =>
      createPageView(url, snapshot.serviceIds[index] ?? null, false),
    );
    selectedViewId = pageViews[snapshot.selectedIndex]?.id ?? pageViews[0].id;
    updateViewBounds();
    pageViews.forEach(({ lastUrl, view }) => {
      void view.webContents.loadURL(lastUrl).catch(() => undefined);
    });
  } finally {
    isRestoringWorkspace = false;
  }
  await persistWorkspace();
  return { states: getNavigationStates(), selectedViewId: selectedViewId! };
};

const createPageView = (
  url: string,
  serviceId: AiServiceId | null = getAiServiceByUrl(url)?.id ?? null,
  loadImmediately = true,
): PageView => {
  if (!mainWindow) throw new Error('アプリウィンドウがありません。');
  const pageView: PageView = {
    id: nextViewId++,
    lastUrl: url,
    serviceId,
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
    if (!isRestoringWorkspace) void persistWorkspace().catch(() => undefined);
  });
  pageView.view.webContents.on('did-navigate-in-page', () => {
    publishState();
    if (!isRestoringWorkspace) void persistWorkspace().catch(() => undefined);
  });
  pageView.view.webContents.on('did-start-loading', publishState);
  pageView.view.webContents.on('did-stop-loading', publishState);
  pageView.view.webContents.on('page-title-updated', publishState);
  mainWindow.contentView.addChildView(pageView.view);
  pageView.view.setVisible(!isLauncherOpen && !isStartupSelectionOpen);
  if (loadImmediately) void pageView.view.webContents.loadURL(url).catch(() => undefined);
  return pageView;
};

const addView = async (serviceId: unknown): Promise<NavigationState[]> => {
  ensureSplitMode();
  if (pageViews.length >= MAX_VIEWS) throw new Error('画面は4つまで追加できます。');
  const service = getAiService(serviceId);
  if (!service) throw new Error('AIサービスを選択してください。');
  const url = service.url;
  const pageView = createPageView(url, service.id, false);
  pageViews.push(pageView);
  selectedViewId = pageView.id;
  updateViewBounds();
  void pageView.view.webContents.loadURL(url).catch(() => undefined);
  await persistWorkspace();
  return getNavigationStates();
};

const removeView = async (viewId: unknown): Promise<NavigationState[]> => {
  ensureSplitMode();
  if (pageViews.length === 1) throw new Error('少なくとも1つの画面が必要です。');
  const pageView = getPageView(viewId);
  const removedIndex = pageViews.indexOf(pageView);
  mainWindow?.contentView.removeChildView(pageView.view);
  pageView.view.webContents.close();
  pageViews = pageViews.filter(({ id }) => id !== pageView.id);
  if (selectedViewId === pageView.id) {
    selectedViewId = pageViews[Math.min(removedIndex, pageViews.length - 1)].id;
  }
  updateViewBounds();
  await persistWorkspace();
  return getNavigationStates();
};

const moveView = async (
  viewId: unknown,
  direction: unknown,
): Promise<NavigationState[]> => {
  ensureSplitMode();
  const pageView = getPageView(viewId);
  if (direction !== 'left' && direction !== 'right') {
    throw new Error('画面の移動方向が不正です。');
  }
  const currentIndex = pageViews.indexOf(pageView);
  const targetIndex = currentIndex + (direction === 'left' ? -1 : 1);
  if (targetIndex < 0 || targetIndex >= pageViews.length) return getNavigationStates();
  [pageViews[currentIndex], pageViews[targetIndex]] = [
    pageViews[targetIndex],
    pageViews[currentIndex],
  ];
  updateViewBounds();
  await persistWorkspace();
  return getNavigationStates();
};

const bookmarksFile = (): string => path.join(app.getPath('userData'), 'bookmarks.json');

const readBookmarks = async (): Promise<Bookmark[]> => {
  try {
    return parseBookmarks(JSON.parse(await readFile(bookmarksFile(), 'utf8')));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) return [];
    throw error;
  }
};

const saveBookmarks = async (bookmarks: Bookmark[]): Promise<void> => {
  await writeFile(bookmarksFile(), `${JSON.stringify(bookmarks, null, 2)}\n`, 'utf8');
};

const registerIpcHandlers = (): void => {
  ipcMain.handle('app:ping', () => 'pong');
  ipcMain.handle(navigationChannels.getStates, getNavigationStates);
  ipcMain.handle(navigationChannels.add, (_event, serviceId: unknown) => addView(serviceId));
  ipcMain.handle(navigationChannels.move, (_event, viewId: unknown, direction: unknown) =>
    moveView(viewId, direction),
  );
  ipcMain.handle(navigationChannels.remove, (_event, viewId: unknown) => removeView(viewId));
  ipcMain.handle(navigationChannels.navigate, async (_event, viewId: unknown, input: unknown) => {
    if (typeof input !== 'string') throw new Error('URLを入力してください。');
    const pageView = getPageView(viewId);
    pageView.lastUrl = normalizeNavigationUrl(input);
    pageView.serviceId = getAiServiceByUrl(pageView.lastUrl)?.id ?? null;
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
  ipcMain.handle(navigationChannels.focus, (_event, viewId: unknown, focused: unknown) => {
    if (typeof focused !== 'boolean') throw new Error('集中表示の状態が不正です。');
    const pageView = getPageView(viewId);
    if (focused) {
      if (pageViews.length === 1) return;
      if (isLauncherOpen) throw new Error('ランチャーを閉じてから集中表示にしてください。');
      focusedViewId = pageView.id;
    } else {
      if (focusedViewId !== pageView.id) throw new Error('集中表示中の画面が一致しません。');
      focusedViewId = null;
    }
    updateViewBounds();
  });
  ipcMain.handle(workspaceChannels.getSelectedViewId, () => selectedViewId);
  ipcMain.handle(workspaceChannels.selectView, async (_event, viewId: unknown) => {
    const pageView = getPageView(viewId);
    if (focusedViewId !== null && focusedViewId !== pageView.id) {
      throw new Error('集中表示を解除してから別の画面を選択してください。');
    }
    selectedViewId = pageView.id;
    await persistWorkspace();
  });
  ipcMain.handle(launcherChannels.setOpen, (_event, open: unknown) => {
    if (typeof open !== 'boolean') throw new Error('ランチャーの状態が不正です。');
    if (open) ensureSplitMode();
    isLauncherOpen = open;
    updateViewBounds();
  });

  ipcMain.handle(namedWorkspaceChannels.getAll, async () =>
    summarizeNamedWorkspaces((await readNamedWorkspaceFile(namedWorkspacesFile())).workspaces),
  );
  ipcMain.handle(namedWorkspaceChannels.getStartupState, async (): Promise<StartupWorkspaceState> => ({
    required: isStartupSelectionOpen,
    workspaces: summarizeNamedWorkspaces((await readNamedWorkspaceFile(namedWorkspacesFile())).workspaces),
  }));
  ipcMain.handle(namedWorkspaceChannels.start, async (_event, selection: unknown) => {
    if (!isStartupSelectionOpen) throw new Error('起動ワークスペースは既に選択されています。');
    if (!selection || typeof selection !== 'object') throw new Error('起動ワークスペースの指定が不正です。');
    const candidate = selection as Partial<StartupWorkspaceSelection>;
    if (candidate.kind === 'last') {
      isStartupSelectionOpen = false;
      updateViewBounds();
      return { states: getNavigationStates(), selectedViewId: selectedViewId! };
    }
    if (candidate.kind !== 'named' || typeof candidate.workspaceId !== 'string') {
      throw new Error('起動ワークスペースの指定が不正です。');
    }
    const workspace = (await readNamedWorkspaceFile(namedWorkspacesFile())).workspaces.find(
      ({ id }) => id === candidate.workspaceId,
    );
    if (!workspace) throw new Error('ワークスペースが見つかりません。');
    const result = await replaceWorkspace(workspace.snapshot);
    isStartupSelectionOpen = false;
    updateViewBounds();
    return result;
  });
  ipcMain.handle(namedWorkspaceChannels.save, async (_event, input: unknown, overwrite: unknown) => {
    ensureSplitMode();
    if (typeof overwrite !== 'boolean') throw new Error('上書き指定が不正です。');
    const name = normalizeWorkspaceName(input);
    const snapshot = captureWorkspace();
    let summaries: NamedWorkspaceSummary[] = [];
    namedWorkspaceWriteQueue = namedWorkspaceWriteQueue.catch(() => undefined).then(async () => {
      const file = await readNamedWorkspaceFile(namedWorkspacesFile());
      const existing = file.workspaces.find((workspace) => workspaceNamesMatch(workspace.name, name));
      if (existing && !overwrite) throw new Error('同名のワークスペースが既にあります。');
      const now = new Date().toISOString();
      if (existing) {
        existing.name = name;
        existing.snapshot = snapshot;
        existing.updatedAt = now;
      } else {
        file.workspaces.push({ id: randomUUID(), name, snapshot, createdAt: now, updatedAt: now });
      }
      await writeNamedWorkspaceFile(namedWorkspacesFile(), file);
      summaries = summarizeNamedWorkspaces(file.workspaces);
    });
    await namedWorkspaceWriteQueue;
    return summaries;
  });
  ipcMain.handle(namedWorkspaceChannels.load, async (_event, workspaceId: unknown) => {
    if (typeof workspaceId !== 'string') throw new Error('ワークスペースが見つかりません。');
    const workspace = (await readNamedWorkspaceFile(namedWorkspacesFile())).workspaces.find(({ id }) => id === workspaceId);
    if (!workspace) throw new Error('ワークスペースが見つかりません。');
    return replaceWorkspace(workspace.snapshot);
  });
  ipcMain.handle(namedWorkspaceChannels.remove, async (_event, workspaceId: unknown) => {
    if (typeof workspaceId !== 'string') throw new Error('ワークスペースが見つかりません。');
    let summaries: NamedWorkspaceSummary[] = [];
    namedWorkspaceWriteQueue = namedWorkspaceWriteQueue.catch(() => undefined).then(async () => {
      const file = await readNamedWorkspaceFile(namedWorkspacesFile());
      const next = file.workspaces.filter(({ id }) => id !== workspaceId);
      if (next.length === file.workspaces.length) throw new Error('ワークスペースが見つかりません。');
      file.workspaces = next;
      await writeNamedWorkspaceFile(namedWorkspacesFile(), file);
      summaries = summarizeNamedWorkspaces(file.workspaces);
    });
    await namedWorkspaceWriteQueue;
    return summaries;
  });

  ipcMain.handle(bookmarkChannels.getAll, readBookmarks);
  ipcMain.handle(bookmarkChannels.add, async (_event, viewId: unknown) => {
    const state = getNavigationState(getPageView(viewId));
    if (!state.url) throw new Error('保存できるページがありません。');
    const service = getAiServiceByUrl(state.url);
    if (!service) throw new Error('対応AIサービスのページだけ保存できます。');
    const bookmarks = await readBookmarks();
    if (!bookmarks.some(({ url }) => url === state.url)) {
      bookmarks.push({ id: randomUUID(), title: state.title || state.url, url: state.url, serviceId: service.id });
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
    const pageView = getPageView(viewId);
    pageView.lastUrl = normalizeNavigationUrl(bookmark.url);
    pageView.serviceId = bookmark.serviceId;
    await pageView.view.webContents.loadURL(pageView.lastUrl);
    await persistWorkspace();
  });
};

const createMainWindow = (workspace: WorkspaceSnapshot, showStartupSelection: boolean): BrowserWindow => {
  const window = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 720,
    minHeight: 480,
    title: 'Multi-AI',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
  });
  mainWindow = window;
  isLauncherOpen = false;
  focusedViewId = null;
  isStartupSelectionOpen = showStartupSelection;
  void window.loadFile(path.join(__dirname, '../../dist-renderer/index.html'));
  isRestoringWorkspace = true;
  pageViews = workspace.urls.map((url, index) =>
    createPageView(url, workspace.serviceIds[index] ?? null, false),
  );
  selectedViewId = pageViews[workspace.selectedIndex]?.id ?? pageViews[0].id;
  updateViewBounds();
  pageViews.forEach(({ lastUrl, view }) => {
    void view.webContents.loadURL(lastUrl).catch(() => undefined);
  });
  isRestoringWorkspace = false;
  window.on('resize', updateViewBounds);
  let mayClose = false;
  window.on('close', (event) => {
    if (mayClose) return;
    event.preventDefault();
    void persistWorkspace().finally(() => {
      mayClose = true;
      window.close();
    });
  });
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
  const [workspace, namedWorkspaceFile] = await Promise.all([
    readWorkspaceSnapshot(workspaceFile(), DEFAULT_URLS),
    readNamedWorkspaceFile(namedWorkspacesFile()),
  ]);
  mainWindow = createMainWindow(workspace, namedWorkspaceFile.workspaces.length > 0);
  await persistWorkspace();
  app.on('activate', async () => {
    if (mainWindow === null) {
      const [restoredWorkspace, restoredNamedWorkspaceFile] = await Promise.all([
        readWorkspaceSnapshot(workspaceFile(), DEFAULT_URLS),
        readNamedWorkspaceFile(namedWorkspacesFile()),
      ]);
      mainWindow = createMainWindow(restoredWorkspace, restoredNamedWorkspaceFile.workspaces.length > 0);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
