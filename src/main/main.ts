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
import { comparisonChannels, parseComparisonLayout, type ComparisonLayoutState } from '../shared/comparison';
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
import { normalizePrompt, parsePromptTargets, promptChannels, type PromptSendResult } from '../shared/prompt';
import { nextZoomPercent, parseZoomAction, zoomChannels } from '../shared/zoom';
import { tabVisibilityChannels, type TabVisibilityResult } from '../shared/tab-visibility';
import {
  workspaceChannels,
  workspaceLayoutForViewCount,
  type WorkspaceSnapshot,
} from '../shared/workspace';
import { calculateViewBounds } from './layout';
import { readNamedWorkspaceFile, writeNamedWorkspaceFile } from './named-workspace-store';
import { promptAdapters } from './prompt-adapters';
import type { AdapterExecutionResult } from './prompt-adapters/types';
import { readWorkspaceSnapshot, writeWorkspaceSnapshot } from './workspace-store';

const TOOLBAR_HEIGHT = 278;
const DEFAULT_URLS = ['https://example.com/'] as const;
const MAX_TABS = 32;

interface PageView {
  id: ViewId;
  lastUrl: string;
  serviceId: AiServiceId | null;
  isVisible: boolean;
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
let comparisonLayout: (ComparisonLayoutState & { candidateViewIds: ViewId[] }) | null = null;
let zoomPercent = 100;
let zoomWriteQueue = Promise.resolve();

const applyZoomToAllViews = async (): Promise<void> => {
  for (const { view } of pageViews) {
    view.webContents.setZoomFactor(zoomPercent / 100);
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
};

const getPageView = (viewId: unknown): PageView => {
  if (!Number.isInteger(viewId)) throw new Error('対象のビューが見つかりません。');
  const pageView = pageViews.find(({ id }) => id === viewId);
  if (!pageView) throw new Error('対象のビューが見つかりません。');
  return pageView;
};

const getNavigationState = ({ id, lastUrl, serviceId, isVisible, view }: PageView): NavigationState => ({
  viewId: id,
  serviceId,
  url: view.webContents.getURL() || lastUrl,
  title: view.webContents.getTitle(),
  canGoBack: view.webContents.navigationHistory.canGoBack(),
  canGoForward: view.webContents.navigationHistory.canGoForward(),
  isLoading: view.webContents.isLoading(),
  isVisible,
});

const getNavigationStates = (): NavigationState[] => pageViews.map(getNavigationState);
const getVisiblePageViews = (): PageView[] => pageViews.filter(({ isVisible }) => isVisible);

const workspaceFile = (): string => path.join(app.getPath('userData'), 'workspace.json');
const namedWorkspacesFile = (): string => path.join(app.getPath('userData'), 'named-workspaces.json');

const captureWorkspace = (): WorkspaceSnapshot => ({
    viewCount: pageViews.length,
    urls: pageViews.map(({ lastUrl, view }) => view.webContents.getURL() || lastUrl),
    serviceIds: pageViews.map(({ serviceId }) => serviceId),
    visibleIndices: pageViews.flatMap(({ isVisible }, index) => isVisible ? [index] : []),
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
  if (comparisonLayout) {
    const visibleIds = comparisonLayout.focusedViewId === null
      ? comparisonLayout.activeViewIds
      : [comparisonLayout.focusedViewId];
    const bounds = calculateViewBounds(visibleIds.length, width, height, TOOLBAR_HEIGHT);
    pageViews.forEach(({ id, view }) => {
      const visibleIndex = visibleIds.indexOf(id);
      view.setVisible(visibleIndex >= 0);
      if (visibleIndex >= 0) view.setBounds(bounds[visibleIndex]);
    });
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
  const visiblePageViews = getVisiblePageViews();
  const bounds = calculateViewBounds(visiblePageViews.length, width, height, TOOLBAR_HEIGHT);
  pageViews.forEach(({ view, isVisible }) => view.setVisible(isVisible));
  visiblePageViews.forEach(({ view }, index) => {
    view.setBounds(bounds[index]);
  });
};

const ensureSplitMode = (): void => {
  if (focusedViewId !== null) throw new Error('集中表示を解除してから画面を変更してください。');
  if (comparisonLayout !== null) throw new Error('比較モードを終了してから画面を変更してください。');
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
      createPageView(url, snapshot.serviceIds[index] ?? null, false, snapshot.visibleIndices.includes(index)),
    );
    selectedViewId = pageViews[snapshot.selectedIndex]?.isVisible
      ? pageViews[snapshot.selectedIndex].id
      : getVisiblePageViews()[0].id;
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
  isVisible = true,
): PageView => {
  if (!mainWindow) throw new Error('アプリウィンドウがありません。');
  const pageView: PageView = {
    id: nextViewId++,
    lastUrl: url,
    serviceId,
    isVisible,
    view: new WebContentsView({
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
    }),
  };
  pageView.view.webContents.setZoomMode('isolated');
  const applyCurrentZoom = () => pageView.view.webContents.setZoomFactor(zoomPercent / 100);
  applyCurrentZoom();
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
  pageView.view.webContents.on('did-finish-load', applyCurrentZoom);
  pageView.view.webContents.on('page-title-updated', publishState);
  mainWindow.contentView.addChildView(pageView.view);
  pageView.view.setVisible(!isLauncherOpen && !isStartupSelectionOpen);
  if (loadImmediately) void pageView.view.webContents.loadURL(url).catch(() => undefined);
  return pageView;
};

const addView = async (serviceId: unknown): Promise<NavigationState[]> => {
  ensureSplitMode();
  if (pageViews.length >= MAX_TABS) throw new Error('タブは32個まで追加できます。');
  const service = getAiService(serviceId);
  if (!service) throw new Error('AIサービスを選択してください。');
  const url = service.url;
  const pageView = createPageView(url, service.id, false, getVisiblePageViews().length < 4);
  pageViews.push(pageView);
  if (pageView.isVisible) selectedViewId = pageView.id;
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
  if (!getVisiblePageViews().length) {
    pageViews[Math.min(removedIndex, pageViews.length - 1)].isVisible = true;
  }
  if (selectedViewId === pageView.id) {
    selectedViewId = getVisiblePageViews()[0].id;
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

const sendCommonPrompt = async (input: unknown, targetInput: unknown): Promise<PromptSendResult[]> => {
  const prompt = normalizePrompt(input);
  const targetIds = parsePromptTargets(targetInput);
  return Promise.all(targetIds.map(async (viewId): Promise<PromptSendResult> => {
    let pageView: PageView;
    try {
      pageView = getPageView(viewId);
    } catch {
      return { viewId, serviceId: null, status: 'failure', message: '対象の画面が見つかりません。' };
    }
    const currentUrl = pageView.view.webContents.getURL() || pageView.lastUrl;
    const service = getAiServiceByUrl(currentUrl);
    if (!service) {
      return { viewId, serviceId: pageView.serviceId, status: 'failure', message: '対応AIサービスの入力画面ではありません。' };
    }
    const adapter = promptAdapters.get(service.id);
    if (!adapter) {
      return { viewId, serviceId: service.id, status: 'failure', message: 'このAIサービスの送信方式がありません。' };
    }
    try {
      const result: unknown = await pageView.view.webContents.executeJavaScript(adapter.buildScript(prompt), true);
      if (!result || typeof result !== 'object') throw new Error('送信結果を確認できませんでした。');
      const execution = result as Partial<AdapterExecutionResult>;
      return {
        viewId,
        serviceId: service.id,
        status: execution.success ? 'success' : 'failure',
        message: typeof execution.message === 'string' ? execution.message : '送信結果を確認できませんでした。',
      };
    } catch (error) {
      return {
        viewId,
        serviceId: service.id,
        status: 'failure',
        message: error instanceof Error ? error.message : '送信処理に失敗しました。',
      };
    }
  }));
};

const registerIpcHandlers = (): void => {
  ipcMain.handle('app:ping', () => 'pong');
  ipcMain.handle(zoomChannels.get, () => zoomPercent);
  ipcMain.handle(zoomChannels.change, async (_event, input: unknown) => {
    const action = parseZoomAction(input);
    let appliedZoom = zoomPercent;
    zoomWriteQueue = zoomWriteQueue.then(async () => {
      zoomPercent = nextZoomPercent(zoomPercent, action);
      appliedZoom = zoomPercent;
      await applyZoomToAllViews();
    });
    await zoomWriteQueue;
    return appliedZoom;
  });
  ipcMain.handle(promptChannels.send, (_event, prompt: unknown, viewIds: unknown) =>
    sendCommonPrompt(prompt, viewIds),
  );
  ipcMain.handle(comparisonChannels.set, (_event, input: unknown) => {
    if (focusedViewId !== null || isLauncherOpen || isStartupSelectionOpen) {
      throw new Error('現在の表示モードでは比較を開始できません。');
    }
    const layout = parseComparisonLayout(input);
    layout.activeViewIds.forEach((viewId) => {
      getPageView(viewId);
    });
    const existingCandidates = comparisonLayout?.candidateViewIds;
    if (existingCandidates && layout.activeViewIds.some((viewId) => !existingCandidates.includes(viewId))) {
      throw new Error('共通プロンプトを送信した画面だけ比較できます。');
    }
    comparisonLayout = {
      ...layout,
      candidateViewIds: comparisonLayout?.candidateViewIds ?? [...layout.activeViewIds],
    };
    updateViewBounds();
  });
  ipcMain.handle(comparisonChannels.exit, () => {
    comparisonLayout = null;
    updateViewBounds();
  });
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
    if (comparisonLayout !== null) throw new Error('比較モード中は比較画面の集中表示を使ってください。');
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
    if (!pageView.isVisible) throw new Error('非表示のタブは先に表示してください。');
    if (focusedViewId !== null && focusedViewId !== pageView.id) {
      throw new Error('集中表示を解除してから別の画面を選択してください。');
    }
    selectedViewId = pageView.id;
    await persistWorkspace();
  });
  ipcMain.handle(tabVisibilityChannels.set, async (_event, viewId: unknown, visible: unknown): Promise<TabVisibilityResult> => {
    ensureSplitMode();
    if (typeof visible !== 'boolean') throw new Error('タブの表示状態が不正です。');
    const pageView = getPageView(viewId);
    if (visible && !pageView.isVisible && getVisiblePageViews().length >= 4) {
      throw new Error('同時に表示できるタブは4つまでです。');
    }
    if (!visible && pageView.isVisible && getVisiblePageViews().length === 1) {
      throw new Error('少なくとも1つのタブを表示してください。');
    }
    pageView.isVisible = visible;
    if (!visible && selectedViewId === pageView.id) selectedViewId = getVisiblePageViews()[0].id;
    if (visible) selectedViewId = pageView.id;
    updateViewBounds();
    await persistWorkspace();
    return { visibleViewIds: getVisiblePageViews().map(({ id }) => id), selectedViewId: selectedViewId! };
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
  zoomPercent = 100;
  isLauncherOpen = false;
  focusedViewId = null;
  comparisonLayout = null;
  isStartupSelectionOpen = showStartupSelection;
  void window.loadFile(path.join(__dirname, '../../dist-renderer/index.html'));
  isRestoringWorkspace = true;
  pageViews = workspace.urls.map((url, index) =>
    createPageView(url, workspace.serviceIds[index] ?? null, false, workspace.visibleIndices.includes(index)),
  );
  selectedViewId = pageViews[workspace.selectedIndex]?.isVisible
    ? pageViews[workspace.selectedIndex].id
    : getVisiblePageViews()[0].id;
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
