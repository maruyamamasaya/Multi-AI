import { type FormEvent, useEffect, useRef, useState } from 'react';
import {
  AI_SERVICES,
  UNKNOWN_AI_SERVICE,
  getAiService,
  getAiServiceByUrl,
  type AiServiceId,
} from '../shared/ai-services';
import type { Bookmark, BookmarkUpdate } from '../shared/bookmarks';
import type { NamedWorkspaceSummary } from '../shared/named-workspaces';
import type { PromptSendResult } from '../shared/prompt';
import type { NavigationState, ViewId, ViewMoveDirection } from '../shared/navigation';
import { DEFAULT_ZOOM_PERCENT, type ZoomAction } from '../shared/zoom';
import { MAX_VISIBLE_TABS, MINIMUM_PANE_WIDTH } from '../shared/pane-layout';
import { ja } from '../shared/locales/ja';
import { parseUiTheme, UI_THEMES, UI_THEME_STORAGE_KEY, type UiThemeId } from '../shared/themes';
import { BookmarkManager } from './BookmarkManager';

type AnswerStatus = 'idle' | 'running' | 'completed' | 'failed';

const answerStatusLabels: Record<AnswerStatus, string> = {
  idle: '未実行',
  running: '実行中',
  completed: '完了',
  failed: '失敗',
};

const initialStates: NavigationState[] = [
  { viewId: 1, serviceId: null, url: 'https://example.com/', title: '', canGoBack: false, canGoForward: false, isLoading: true, isVisible: true },
];

const NavigationBar = ({ disabled = false, state }: { disabled?: boolean; state: NavigationState }) => {
  const [url, setUrl] = useState(state.url);
  const [error, setError] = useState('');
  useEffect(() => setUrl(state.url), [state.url]);

  const navigate = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await window.multiAI.navigate(state.viewId, url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'ページを開けませんでした。');
    }
  };

  const run = async (action: (viewId: ViewId) => Promise<void>) => {
    setError('');
    try {
      await action(state.viewId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '操作を完了できませんでした。');
    }
  };

  return (
    <form className="navigation-bar" onSubmit={navigate} aria-label="選択中ビューのナビゲーション">
      <button type="button" aria-label="戻る" disabled={disabled || !state.canGoBack} onClick={() => void run(window.multiAI.back)}>←</button>
      <button type="button" aria-label="進む" disabled={disabled || !state.canGoForward} onClick={() => void run(window.multiAI.forward)}>→</button>
      <button type="button" aria-label="再読み込み" disabled={disabled} onClick={() => void run(window.multiAI.reload)}>↻</button>
      <label className="url-field">
        <span className="sr-only">URL</span>
        <input aria-label="URL" aria-invalid={Boolean(error)} value={url} disabled={disabled} onChange={(event) => setUrl(event.target.value)} spellCheck={false} />
        {state.isLoading ? <span className="loading-indicator" aria-label="読み込み中" /> : null}
      </label>
      <button className="primary-button" type="submit" disabled={disabled}>開く</button>
      {error ? <span className="url-error">{error}</span> : null}
    </form>
  );
};

const ServiceLauncher = ({
  onCancel,
  onSelect,
}: {
  onCancel: () => Promise<void>;
  onSelect: (serviceId: AiServiceId) => Promise<void>;
}) => (
  <div className="launcher-backdrop">
    <section className="service-launcher" role="dialog" aria-modal="true" aria-labelledby="launcher-title">
      <div className="launcher-heading">
        <div>
          <p className="launcher-eyebrow">{ja.launcher.newView}</p>
          <h2 id="launcher-title">AIサービスを選択</h2>
          <p>新しい画面で使うサービスを選んでください。</p>
        </div>
        <button type="button" className="launcher-close" aria-label="キャンセル" onClick={() => void onCancel()}>×</button>
      </div>
      <div className="service-grid">
        {AI_SERVICES.map((service) => (
          <button type="button" key={service.id} aria-label={service.name} onClick={() => void onSelect(service.id)}>
            <span className={`service-mark service-${service.id}`} aria-hidden="true">{service.icon}</span>
            <span>{service.name}</span>
          </button>
        ))}
      </div>
      <button type="button" className="launcher-cancel" onClick={() => void onCancel()}>キャンセル</button>
    </section>
  </div>
);

const StartupWorkspaceSelector = ({
  error,
  onSelect,
  workspaces,
}: {
  error: string;
  onSelect: (selection: { kind: 'last' } | { kind: 'named'; workspaceId: string }) => Promise<void>;
  workspaces: NamedWorkspaceSummary[];
}) => (
  <div className="launcher-backdrop startup-backdrop">
    <section className="startup-selector" role="dialog" aria-modal="true" aria-labelledby="startup-title">
      <p className="launcher-eyebrow">{ja.launcher.startWorkspace}</p>
      <h2 id="startup-title">開始するワークスペース</h2>
      <p className="startup-description">使う構成を1つ選んでください。</p>
      <div className="startup-options">
        <button type="button" onClick={() => void onSelect({ kind: 'last' })}>
          <strong>前回の続き</strong>
          <span>最後に閉じた画面構成</span>
        </button>
        {workspaces.map((workspace) => (
          <button type="button" key={workspace.id} onClick={() => void onSelect({ kind: 'named', workspaceId: workspace.id })}>
            <strong>{workspace.name}</strong>
            <span>{workspace.viewCount}画面</span>
            <span className="startup-services">
              {workspace.serviceIds.length
                ? workspace.serviceIds.map((serviceId) => getAiService(serviceId)?.name).filter(Boolean).join(' · ')
                : 'AIサービス未設定'}
            </span>
          </button>
        ))}
      </div>
      {error ? <p className="startup-error" role="alert">{error}</p> : null}
    </section>
  </div>
);

export const App = () => {
  const [uiTheme, setUiTheme] = useState<UiThemeId>(() => {
    try {
      return parseUiTheme(window.localStorage.getItem(UI_THEME_STORAGE_KEY));
    } catch {
      return 'default';
    }
  });
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [states, setStates] = useState(initialStates);
  const [isWorkspaceReady, setIsWorkspaceReady] = useState(false);
  const [selectedViewId, setSelectedViewId] = useState<ViewId>(1);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [selectedBookmarkId, setSelectedBookmarkId] = useState('');
  const [bookmarkError, setBookmarkError] = useState('');
  const [isBookmarkManagerOpen, setIsBookmarkManagerOpen] = useState(false);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [launcherError, setLauncherError] = useState('');
  const [namedWorkspaces, setNamedWorkspaces] = useState<NamedWorkspaceSummary[]>([]);
  const [workspaceName, setWorkspaceName] = useState('');
  const [savedWorkspaceId, setSavedWorkspaceId] = useState('');
  const [workspaceError, setWorkspaceError] = useState('');
  const [startupWorkspaces, setStartupWorkspaces] = useState<NamedWorkspaceSummary[]>([]);
  const [isStartupSelectionOpen, setIsStartupSelectionOpen] = useState(false);
  const [startupError, setStartupError] = useState('');
  const [commonPrompt, setCommonPrompt] = useState('');
  const [promptTargets, setPromptTargets] = useState<Set<ViewId>>(new Set());
  const [promptResults, setPromptResults] = useState<PromptSendResult[]>([]);
  const [isSendingPrompt, setIsSendingPrompt] = useState(false);
  const [promptError, setPromptError] = useState('');
  const [answerStatuses, setAnswerStatuses] = useState<Map<ViewId, AnswerStatus>>(new Map());
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [comparisonCandidates, setComparisonCandidates] = useState<PromptSendResult[]>([]);
  const [comparisonTargets, setComparisonTargets] = useState<Set<ViewId>>(new Set());
  const [comparisonFocusedViewId, setComparisonFocusedViewId] = useState<ViewId | null>(null);
  const [comparisonError, setComparisonError] = useState('');
  const [zoomPercent, setZoomPercent] = useState(DEFAULT_ZOOM_PERCENT);
  const [zoomError, setZoomError] = useState('');
  const [tabError, setTabError] = useState('');
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [draggedPaneId, setDraggedPaneId] = useState<ViewId | null>(null);
  const [dropTargetPaneId, setDropTargetPaneId] = useState<ViewId | null>(null);
  const paneHeadersRef = useRef<HTMLDivElement>(null);
  const promptEligibility = useRef(new Map<ViewId, boolean>());
  const selectedState = states.find(({ viewId }) => viewId === selectedViewId) ?? states[0];
  const selectedBookmarkService = getAiServiceByUrl(selectedState?.url ?? '');
  const visibleStates = states.filter(({ isVisible }) => isVisible);
  const tabLabel = (state: NavigationState): string => {
    const service = getAiService(state.serviceId) ?? getAiServiceByUrl(state.url) ?? UNKNOWN_AI_SERVICE;
    const matching = states.filter((candidate) =>
      (getAiService(candidate.serviceId) ?? getAiServiceByUrl(candidate.url) ?? UNKNOWN_AI_SERVICE).id === service.id,
    );
    return matching.length > 1 ? `${service.name} ${matching.indexOf(state) + 1}` : service.name;
  };

  useEffect(() => {
    document.documentElement.dataset.theme = uiTheme;
    try {
      window.localStorage.setItem(UI_THEME_STORAGE_KEY, uiTheme);
    } catch {
      // The theme still applies for this session when storage is unavailable.
    }
  }, [uiTheme]);

  useEffect(() => {
    const updateState = (next: NavigationState) => {
      setStates((current) => current.map((state) => (state.viewId === next.viewId ? next : state)));
    };
    const unsubscribe = window.multiAI.onNavigationState(updateState);
    const unsubscribeBookmarkManager = window.multiAI.onBookmarkManagerOpenRequested(() => {
      setBookmarkError('');
      void window.multiAI.setBookmarkManagerOpen(true)
        .then(() => setIsBookmarkManagerOpen(true))
        .catch((reason: unknown) => {
          setBookmarkError(reason instanceof Error ? reason.message : 'AI会話管理を開けませんでした。');
        });
    });
    void Promise.all([
      window.multiAI.getNavigationStates(),
      window.multiAI.getSelectedViewId(),
      window.multiAI.getZoomPercent(),
    ])
      .then(([next, restoredViewId, currentZoomPercent]) => {
        setZoomPercent(currentZoomPercent);
        if (next.length) {
          setStates(next);
          const restoredExists = next.some(({ viewId }) => viewId === restoredViewId);
          setSelectedViewId(restoredExists && restoredViewId !== null ? restoredViewId : next[0].viewId);
        }
      })
      .catch(() => undefined)
      .finally(() => setIsWorkspaceReady(true));
    void window.multiAI.getBookmarks().then(setBookmarks);
    void window.multiAI.getStartupWorkspaceState()
      .then(({ required, workspaces }) => {
        setNamedWorkspaces(workspaces);
        setStartupWorkspaces(workspaces);
        setIsStartupSelectionOpen(required);
      })
      .catch(async () => {
        try {
          const result = await window.multiAI.startWorkspace({ kind: 'last' });
          setStates(result.states);
          setSelectedViewId(result.selectedViewId);
          setZoomPercent(result.zoomPercent);
        } catch {
          setStartupError('起動ワークスペースを確認できませんでした。');
        }
      });
    return () => {
      unsubscribe();
      unsubscribeBookmarkManager();
    };
  }, []);

  useEffect(() => {
    if (!isLauncherOpen) return undefined;
    const cancelWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') void closeLauncher();
    };
    window.addEventListener('keydown', cancelWithEscape);
    return () => window.removeEventListener('keydown', cancelWithEscape);
  }, [isLauncherOpen]);

  useEffect(() => {
    const previousEligibility = promptEligibility.current;
    const nextEligibility = new Map(states.map((state) => [state.viewId, state.isVisible && Boolean(getAiServiceByUrl(state.url))]));
    setPromptTargets((current) => {
      const next = new Set([...current].filter((viewId) => nextEligibility.get(viewId)));
      states.forEach(({ viewId }) => {
        if (nextEligibility.get(viewId) && !previousEligibility.get(viewId)) next.add(viewId);
      });
      return next;
    });
    promptEligibility.current = nextEligibility;
  }, [states]);

  const openLauncher = async () => {
    setLauncherError('');
    await window.multiAI.setLauncherOpen(true);
    setIsLauncherOpen(true);
  };

  async function closeLauncher() {
    await window.multiAI.setLauncherOpen(false);
    setIsLauncherOpen(false);
  }

  const addView = async (serviceId: AiServiceId) => {
    setLauncherError('');
    try {
      const next = await window.multiAI.addView(serviceId);
      setStates(next);
      setSelectedViewId([...next].reverse().find(({ isVisible }) => isVisible)?.viewId ?? selectedViewId);
      await closeLauncher();
    } catch (reason) {
      setLauncherError(reason instanceof Error ? reason.message : '画面を追加できませんでした。');
    }
  };

  const removeView = async (viewId: ViewId) => {
    const removedIndex = states.findIndex((state) => state.viewId === viewId);
    const next = await window.multiAI.removeView(viewId);
    setStates(next);
    if (viewId === selectedViewId) {
      setSelectedViewId((next.find(({ isVisible }) => isVisible) ?? next[Math.min(removedIndex, next.length - 1)]).viewId);
    }
  };

  const toggleTabVisibility = async (state: NavigationState) => {
    setTabError('');
    try {
      const result = await window.multiAI.setTabVisibility(state.viewId, !state.isVisible);
      const visibleIds = new Set(result.visibleViewIds);
      setStates((current) => current.map((tab) => ({ ...tab, isVisible: visibleIds.has(tab.viewId) })));
      setSelectedViewId(result.selectedViewId);
    } catch (reason) {
      setTabError(reason instanceof Error ? reason.message : 'タブの表示を変更できませんでした。');
    }
  };

  const reloadPane = async (state: NavigationState) => {
    setTabError('');
    try {
      await window.multiAI.reload(state.viewId);
    } catch (reason) {
      setTabError(reason instanceof Error ? reason.message : 'ページを更新できませんでした。');
    }
  };

  useEffect(() => {
    const headers = paneHeadersRef.current;
    if (!headers || isFocusMode || isComparisonMode) return;
    headers.scrollLeft = 0;
    void window.multiAI.setPaneScrollOffset(0);
  }, [visibleStates.length, isFocusMode, isComparisonMode]);

  const moveView = async (direction: ViewMoveDirection) => {
    setStates(await window.multiAI.moveView(selectedViewId, direction));
  };

  const reorderPane = async (sourceId: ViewId, targetId: ViewId) => {
    if (sourceId === targetId || isFocusMode || isComparisonMode) return;
    const sourceIndex = states.findIndex(({ viewId }) => viewId === sourceId);
    const targetIndex = states.findIndex(({ viewId }) => viewId === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const direction: ViewMoveDirection = sourceIndex < targetIndex ? 'right' : 'left';
    let next = states;
    setTabError('');
    try {
      for (let index = 0; index < Math.abs(targetIndex - sourceIndex); index += 1) {
        next = await window.multiAI.moveView(sourceId, direction);
      }
      setStates(next);
    } catch (reason) {
      setTabError(reason instanceof Error ? reason.message : '画面を並び替えられませんでした。');
    }
  };

  const toggleFocusMode = async () => {
    const nextFocused = !isFocusMode;
    await window.multiAI.setFocusMode(selectedViewId, nextFocused);
    setIsFocusMode(nextFocused);
  };

  const selectView = async (viewId: ViewId) => {
    setSelectedViewId(viewId);
    await window.multiAI.selectView(viewId);
  };

  const addBookmark = async () => {
    setBookmarkError('');
    try {
      setBookmarks(await window.multiAI.addBookmark(selectedViewId));
    } catch (reason) {
      setBookmarkError(reason instanceof Error ? reason.message : 'AI会話を保存できませんでした。');
    }
  };

  const openBookmark = async () => {
    if (!selectedBookmarkId) return;
    setBookmarkError('');
    try {
      await window.multiAI.openBookmark(selectedViewId, selectedBookmarkId);
    } catch (reason) {
      setBookmarkError(reason instanceof Error ? reason.message : 'AI会話を開けませんでした。');
    }
  };

  const removeBookmark = async () => {
    if (!selectedBookmarkId) return;
    setBookmarkError('');
    try {
      setBookmarks(await window.multiAI.removeBookmark(selectedBookmarkId));
      setSelectedBookmarkId('');
    } catch (reason) {
      setBookmarkError(reason instanceof Error ? reason.message : 'AI会話を削除できませんでした。');
    }
  };

  const openBookmarkManager = async () => {
    setBookmarkError('');
    try {
      await window.multiAI.setBookmarkManagerOpen(true);
      setIsBookmarkManagerOpen(true);
    } catch (reason) {
      setBookmarkError(reason instanceof Error ? reason.message : 'AI会話管理を開けませんでした。');
    }
  };

  const closeBookmarkManager = async () => {
    await window.multiAI.setBookmarkManagerOpen(false);
    setIsBookmarkManagerOpen(false);
  };

  const openManagedBookmark = async (bookmarkId: string) => {
    await window.multiAI.openBookmark(selectedViewId, bookmarkId);
    await closeBookmarkManager();
  };

  const updateManagedBookmark = async (bookmarkId: string, update: BookmarkUpdate) => {
    setBookmarks(await window.multiAI.updateBookmark(bookmarkId, update));
  };

  const deleteManagedBookmark = async (bookmarkId: string) => {
    setBookmarks(await window.multiAI.removeBookmark(bookmarkId));
    if (selectedBookmarkId === bookmarkId) setSelectedBookmarkId('');
  };

  const saveNamedWorkspace = async (event: FormEvent) => {
    event.preventDefault();
    setWorkspaceError('');
    const name = workspaceName.trim();
    const existing = namedWorkspaces.find(({ name: savedName }) =>
      savedName.localeCompare(name, undefined, { sensitivity: 'accent' }) === 0,
    );
    if (existing && !window.confirm(`「${existing.name}」を上書きしますか？`)) return;
    try {
      const next = await window.multiAI.saveNamedWorkspace(name, Boolean(existing));
      setNamedWorkspaces(next);
      setSavedWorkspaceId(next.find(({ name: savedName }) =>
        savedName.localeCompare(name, undefined, { sensitivity: 'accent' }) === 0,
      )?.id ?? '');
      setWorkspaceName('');
    } catch (reason) {
      setWorkspaceError(reason instanceof Error ? reason.message : 'ワークスペースを保存できませんでした。');
    }
  };

  const loadNamedWorkspace = async () => {
    if (!savedWorkspaceId) return;
    setWorkspaceError('');
    try {
      const result = await window.multiAI.loadNamedWorkspace(savedWorkspaceId);
      setStates(result.states);
      setSelectedViewId(result.selectedViewId);
      setZoomPercent(result.zoomPercent);
    } catch (reason) {
      setWorkspaceError(reason instanceof Error ? reason.message : 'ワークスペースを切り替えられませんでした。');
    }
  };

  const removeNamedWorkspace = async () => {
    if (!savedWorkspaceId) return;
    const workspace = namedWorkspaces.find(({ id }) => id === savedWorkspaceId);
    if (!workspace || !window.confirm(`「${workspace.name}」を削除しますか？`)) return;
    setWorkspaceError('');
    try {
      setNamedWorkspaces(await window.multiAI.removeNamedWorkspace(savedWorkspaceId));
      setSavedWorkspaceId('');
    } catch (reason) {
      setWorkspaceError(reason instanceof Error ? reason.message : 'ワークスペースを削除できませんでした。');
    }
  };

  const startWorkspace = async (selection: { kind: 'last' } | { kind: 'named'; workspaceId: string }) => {
    setStartupError('');
    try {
      const result = await window.multiAI.startWorkspace(selection);
      setStates(result.states);
      setSelectedViewId(result.selectedViewId);
      setZoomPercent(result.zoomPercent);
      setIsStartupSelectionOpen(false);
    } catch (reason) {
      setStartupError(reason instanceof Error ? reason.message : 'ワークスペースを開始できませんでした。');
    }
  };

  const togglePromptTarget = (viewId: ViewId) => {
    setPromptTargets((current) => {
      const next = new Set(current);
      if (next.has(viewId)) next.delete(viewId);
      else next.add(viewId);
      return next;
    });
  };

  const sendCommonPrompt = async (event: FormEvent) => {
    event.preventDefault();
    const targetIds = states.map(({ viewId }) => viewId).filter((viewId) => promptTargets.has(viewId));
    if (!commonPrompt.trim() || !targetIds.length || isSendingPrompt) return;
    setPromptError('');
    setPromptResults([]);
    setIsSendingPrompt(true);
    setAnswerStatuses((current) => {
      const next = new Map(current);
      targetIds.forEach((viewId) => next.set(viewId, 'running'));
      return next;
    });
    try {
      const results = await window.multiAI.sendPrompt(commonPrompt, targetIds);
      setPromptResults(results);
      setAnswerStatuses((current) => {
        const next = new Map(current);
        results.forEach((result) => {
          if (result.status === 'failure') next.set(result.viewId, 'failed');
        });
        return next;
      });
    } catch (reason) {
      setAnswerStatuses((current) => {
        const next = new Map(current);
        targetIds.forEach((viewId) => next.set(viewId, 'failed'));
        return next;
      });
      setPromptError(reason instanceof Error ? reason.message : '共通プロンプトを送信できませんでした。');
    } finally {
      setIsSendingPrompt(false);
    }
  };

  const startComparison = async () => {
    const candidates = promptResults.filter((result) => visibleStates.some(({ viewId }) => viewId === result.viewId));
    if (candidates.length < 2) return;
    const targetIds = candidates.slice(0, 4).map(({ viewId }) => viewId);
    setComparisonError('');
    try {
      await window.multiAI.setComparisonLayout({ activeViewIds: targetIds, focusedViewId: null });
      setComparisonCandidates(candidates);
      setComparisonTargets(new Set(targetIds));
      setComparisonFocusedViewId(null);
      setIsComparisonMode(true);
    } catch (reason) {
      setPromptError(reason instanceof Error ? reason.message : '比較モードを開始できませんでした。');
    }
  };

  const updateComparison = async (nextTargets: Set<ViewId>, focusedViewId: ViewId | null) => {
    setComparisonError('');
    try {
      await window.multiAI.setComparisonLayout({ activeViewIds: [...nextTargets], focusedViewId });
      setComparisonTargets(nextTargets);
      setComparisonFocusedViewId(focusedViewId);
    } catch (reason) {
      setComparisonError(reason instanceof Error ? reason.message : '比較表示を変更できませんでした。');
    }
  };

  const toggleComparisonTarget = (viewId: ViewId) => {
    const next = new Set(comparisonTargets);
    if (next.has(viewId)) {
      if (next.size === 1) return;
      next.delete(viewId);
    } else {
      next.add(viewId);
    }
    void updateComparison(next, comparisonFocusedViewId === viewId ? null : comparisonFocusedViewId);
  };

  const focusComparisonView = (viewId: ViewId) => {
    void updateComparison(new Set(comparisonTargets), viewId);
  };

  const returnToComparison = () => {
    void updateComparison(new Set(comparisonTargets), null);
  };

  const exitComparison = async () => {
    setComparisonError('');
    try {
      await window.multiAI.exitComparison();
      setIsComparisonMode(false);
      setComparisonFocusedViewId(null);
    } catch (reason) {
      setComparisonError(reason instanceof Error ? reason.message : '比較モードを終了できませんでした。');
    }
  };

  const changeZoom = async (action: ZoomAction) => {
    setZoomError('');
    try {
      setZoomPercent(await window.multiAI.changeZoom(action));
    } catch (reason) {
      setZoomError(reason instanceof Error ? reason.message : '表示倍率を変更できませんでした。');
    }
  };

  const toggleHeader = async () => {
    const collapsed = !isHeaderCollapsed;
    await window.multiAI.setHeaderCollapsed(collapsed);
    setIsHeaderCollapsed(collapsed);
  };

  if (!selectedState) return null;
  const selectedIndex = states.findIndex(({ viewId }) => viewId === selectedViewId);
  const paneStates = isComparisonMode
    ? comparisonFocusedViewId === null
      ? states.filter(({ viewId }) => comparisonTargets.has(viewId))
      : states.filter(({ viewId }) => viewId === comparisonFocusedViewId)
    : isFocusMode
      ? states.filter(({ viewId }) => viewId === selectedViewId)
      : visibleStates;

  return (
    <header className={`app-bar${isFocusMode ? ' focus-mode' : ''}${isHeaderCollapsed ? ' collapsed' : ''}`}>
      <button
        type="button"
        className="header-toggle"
        aria-expanded={!isHeaderCollapsed}
        aria-label={isHeaderCollapsed ? 'ヘッダーを表示' : 'ヘッダーを隠す'}
        title={isHeaderCollapsed ? 'ヘッダーを表示' : 'ヘッダーを隠す'}
        onClick={() => void toggleHeader()}
      >{isHeaderCollapsed ? '▼ ヘッダーを表示' : '▲ ヘッダーを隠す'}</button>
      <div className="workspace-row">
        <div className="brand"><span className="brand-mark">M</span><h1>Multi-AI</h1></div>
        <nav className="view-tabs" aria-label="画面選択">
          {states.map((state, index) => {
            const service = getAiService(state.serviceId) ?? getAiServiceByUrl(state.url) ?? UNKNOWN_AI_SERVICE;
            const isSelected = state.viewId === selectedViewId;
            return (
              <div
                className={`view-tab${isSelected ? ' active' : ''}${state.isVisible ? '' : ' hidden'}`}
                key={state.viewId}
                title={`${tabLabel(state)}\n${state.isVisible ? '表示中' : '待機中'}\n${state.url}`}
              >
              <button
                disabled={!isWorkspaceReady || isFocusMode || isComparisonMode || !state.isVisible}
                className={isSelected ? 'active' : ''}
                aria-current={isSelected ? 'page' : undefined}
                aria-label={`画面 ${index + 1}: ${service.name}`}
                onClick={() => void selectView(state.viewId)}
              >
                <span className="view-number">{index + 1}</span>
                <span className={`view-service-icon service-${service.id}`} aria-hidden="true">{service.icon}</span>
              </button>
              <button className="tab-visibility" type="button" title={state.isVisible ? '閉じずに待機中へ移す' : visibleStates.length >= MAX_VISIBLE_TABS ? '最大6画面です' : 'ワークスペースに表示する'} aria-label={`${tabLabel(state)}を${state.isVisible ? '待機中にする' : '表示する'}`} disabled={isFocusMode || isComparisonMode || (state.isVisible && visibleStates.length === 1)} onClick={() => void toggleTabVisibility(state)}>
                <span aria-hidden="true">{state.isVisible ? '◉' : '◌'}</span>
              </button>
              <button className="tab-close" type="button" title="タブを完全に閉じる" aria-label={`${tabLabel(state)}を完全に閉じる`} disabled={isFocusMode || isComparisonMode || states.length === 1} onClick={() => void removeView(state.viewId)}>×</button>
              </div>
            );
          })}
        </nav>
        <div className="workspace-actions">
          <button aria-label="画面を減らす" disabled={!isWorkspaceReady || isFocusMode || isComparisonMode || states.length === 1} onClick={() => void removeView(selectedViewId)}>−</button>
          <div className="reorder-actions" role="group" aria-label="画面の並び順">
            <button title="左へ移動" aria-label="選択中画面を左へ移動" disabled={!isWorkspaceReady || isFocusMode || isComparisonMode || selectedIndex <= 0} onClick={() => void moveView('left')}>‹</button>
            <button title="右へ移動" aria-label="選択中画面を右へ移動" disabled={!isWorkspaceReady || isFocusMode || isComparisonMode || selectedIndex >= states.length - 1} onClick={() => void moveView('right')}>›</button>
          </div>
          <button
            className="focus-button"
            title={isFocusMode ? '分割表示に戻す' : '選択中画面を集中表示'}
            aria-label={isFocusMode ? '分割表示に戻す' : '選択中画面を集中表示'}
            aria-pressed={isFocusMode}
            disabled={!isWorkspaceReady || isComparisonMode || states.length === 1}
            onClick={() => void toggleFocusMode()}
          >{isFocusMode ? '⊞' : '⛶'}</button>
          <button aria-label="画面を追加" title="新しいタブ" disabled={!isWorkspaceReady || isFocusMode || isComparisonMode || states.length === 32} onClick={() => void openLauncher()}>＋</button>
        </div>
        <div className="zoom-actions" role="group" aria-label="全画面の表示倍率">
          <button aria-label="全画面を縮小" title={ja.zoom.out} disabled={zoomPercent <= 50} onClick={() => void changeZoom('out')}>−</button>
          <button className="zoom-reset" aria-label="全画面を100%に戻す" title={ja.zoom.reset} disabled={zoomPercent === 100} onClick={() => void changeZoom('reset')}>{zoomPercent}%</button>
          <button aria-label="全画面を拡大" title={ja.zoom.in} disabled={zoomPercent >= 200} onClick={() => void changeZoom('in')}>＋</button>
          {zoomError ? <span className="zoom-error" role="alert">{zoomError}</span> : null}
        </div>
        <div className="theme-control">
          <button
            type="button"
            className="theme-trigger"
            aria-label="UIテーマ"
            aria-expanded={isThemeMenuOpen}
            aria-haspopup="dialog"
            title="UIテーマを切り替える"
            onClick={() => setIsThemeMenuOpen((open) => !open)}
          ><span aria-hidden="true">◈</span><span>Theme</span></button>
          {isThemeMenuOpen ? (
            <section className="theme-menu" role="dialog" aria-label="UIテーマを選択">
              <header><div><span>APPEARANCE</span><strong>テーマを選択</strong></div><button type="button" aria-label="テーマ選択を閉じる" onClick={() => setIsThemeMenuOpen(false)}>×</button></header>
              <div className="theme-options" role="radiogroup" aria-label="利用可能なUIテーマ">
                {UI_THEMES.map((theme) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={uiTheme === theme.id}
                    className={`theme-option theme-preview-${theme.id}`}
                    key={theme.id}
                    onClick={() => { setUiTheme(theme.id); setIsThemeMenuOpen(false); }}
                  >
                    <span className="theme-preview" aria-hidden="true"><i /><i /><i /><b>{theme.glyph}</b></span>
                    <span className="theme-copy"><strong>{theme.name}</strong><small>{theme.description}</small></span>
                    <span className="theme-check" aria-hidden="true">{uiTheme === theme.id ? '✓' : ''}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>
        {isFocusMode ? <span className="focus-status" role="status">集中表示中</span> : null}
        <div className="bookmark-actions">
          <button aria-label="現在のAI会話を保存" title={selectedBookmarkService ? '現在のAI会話を保存' : '対応AIサービスのページだけ保存できます'} disabled={!selectedBookmarkService || isComparisonMode} onClick={() => void addBookmark()}>☆</button>
          <select aria-label="AI会話ブックマーク" value={selectedBookmarkId} disabled={isComparisonMode} onChange={(event) => setSelectedBookmarkId(event.target.value)}>
            <option value="">AI会話一覧</option>
            {bookmarks.map((bookmark) => {
              const service = getAiService(bookmark.serviceId) ?? UNKNOWN_AI_SERVICE;
              return <option key={bookmark.id} value={bookmark.id}>{service.icon} {service.name} · {bookmark.title}</option>;
            })}
          </select>
          <button aria-label="選択中画面でAI会話を開く" disabled={!selectedBookmarkId || isComparisonMode} onClick={() => void openBookmark()}>開く</button>
          <button aria-label="AI会話ブックマークを削除" disabled={!selectedBookmarkId || isComparisonMode} onClick={() => void removeBookmark()}>×</button>
          <button aria-label="AI会話管理を開く" title="保存済みAI会話を管理" disabled={!isWorkspaceReady || isFocusMode || isComparisonMode} onClick={() => void openBookmarkManager()}>管理</button>
        </div>
      </div>
      {tabError ? <span className="tab-error" role="alert">{tabError}</span> : null}
      <div className="saved-workspace-row">
        <form className="workspace-save-form" aria-label="名前付きワークスペース保存" onSubmit={(event) => void saveNamedWorkspace(event)}>
          <input aria-label="ワークスペース名" value={workspaceName} maxLength={60} placeholder="ワークスペース名" disabled={!isWorkspaceReady || isFocusMode || isComparisonMode} onChange={(event) => setWorkspaceName(event.target.value)} />
          <button type="submit" disabled={!isWorkspaceReady || isFocusMode || isComparisonMode || !workspaceName.trim()}>ワークスペース保存</button>
        </form>
        <div className="workspace-library-actions">
          <select aria-label="ワークスペース一覧" value={savedWorkspaceId} disabled={!isWorkspaceReady || isFocusMode || isComparisonMode} onChange={(event) => setSavedWorkspaceId(event.target.value)}>
            <option value="">ワークスペース一覧</option>
            {namedWorkspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}（{workspace.viewCount}画面）</option>)}
          </select>
          <button disabled={!savedWorkspaceId || isFocusMode || isComparisonMode} onClick={() => void loadNamedWorkspace()}>切り替え</button>
          <button aria-label="保存済みワークスペースを削除" disabled={!savedWorkspaceId || isFocusMode || isComparisonMode} onClick={() => void removeNamedWorkspace()}>削除</button>
        </div>
        {workspaceError ? <span className="workspace-error" role="alert">{workspaceError}</span> : null}
      </div>
      {isComparisonMode ? (
        <section className="comparison-row" aria-label="回答比較モード">
          <div className="comparison-heading"><strong>比較モード</strong><span>{comparisonTargets.size}画面を比較中</span></div>
          <div className="comparison-targets">
            {comparisonCandidates.map((result) => {
              const state = states.find(({ viewId }) => viewId === result.viewId);
              const index = states.findIndex(({ viewId }) => viewId === result.viewId);
              const service = getAiService(result.serviceId) ?? (state ? getAiServiceByUrl(state.url) : undefined) ?? UNKNOWN_AI_SERVICE;
              const isActive = comparisonTargets.has(result.viewId);
              return (
                <div className={`comparison-target ${isActive ? 'active' : 'excluded'}`} key={result.viewId}>
                  <label>
                    <input type="checkbox" checked={isActive} disabled={isActive && comparisonTargets.size === 1} onChange={() => toggleComparisonTarget(result.viewId)} />
                    <span>画面 {index + 1}</span><span className={`prompt-service-icon service-${service.id}`} aria-hidden="true">{service.icon}</span><strong>{service.name}</strong>
                  </label>
                  <span className={`comparison-send-status ${result.status}`}>{result.status === 'success' ? '送信成功' : '送信失敗'}</span>
                  <button aria-label={`画面 ${index + 1}を比較内で集中表示`} disabled={!isActive || comparisonFocusedViewId === result.viewId} onClick={() => focusComparisonView(result.viewId)}>集中</button>
                </div>
              );
            })}
          </div>
          <div className="comparison-actions">
            {comparisonFocusedViewId !== null ? <button className="primary-button" onClick={returnToComparison}>比較表示へ戻る</button> : null}
            <button onClick={() => void exitComparison()}>比較モードを終了</button>
          </div>
          {comparisonError ? <span className="comparison-error" role="alert">{comparisonError}</span> : null}
        </section>
      ) : <form className="common-prompt-row" aria-label="共通プロンプト送信" onSubmit={(event) => void sendCommonPrompt(event)}>
        <textarea aria-label="共通プロンプト" value={commonPrompt} maxLength={20000} placeholder="複数AIへ送るプロンプト" onChange={(event) => setCommonPrompt(event.target.value)} />
        <fieldset className="prompt-targets">
          <legend>送信先</legend>
          {visibleStates.map((state) => {
            const index = states.findIndex(({ viewId }) => viewId === state.viewId);
            const currentService = getAiServiceByUrl(state.url);
            const displayService = currentService ?? getAiService(state.serviceId) ?? UNKNOWN_AI_SERVICE;
            return (
              <label key={state.viewId} title={currentService ? displayService.name : '現在のページには送信できません'}>
                <input type="checkbox" checked={promptTargets.has(state.viewId)} disabled={!currentService || isSendingPrompt} onChange={() => togglePromptTarget(state.viewId)} />
                <span>{index + 1}</span>
                <span className={`prompt-service-icon service-${displayService.id}`} aria-hidden="true">{displayService.icon}</span>
                <span>{displayService.name}</span>
              </label>
            );
          })}
        </fieldset>
        <button className="prompt-send-button" type="submit" disabled={isSendingPrompt || !commonPrompt.trim() || promptTargets.size === 0}>{isSendingPrompt ? '送信中…' : '選択したAIへ送信'}</button>
        <div className="prompt-results" aria-live="polite">
          {isSendingPrompt ? [...promptTargets].map((viewId) => <span key={viewId} className="sending">画面 {states.findIndex((state) => state.viewId === viewId) + 1}: 送信中</span>) : null}
          {promptResults.map((result) => {
            const index = states.findIndex(({ viewId }) => viewId === result.viewId);
            const service = getAiService(result.serviceId) ?? UNKNOWN_AI_SERVICE;
            return <span key={result.viewId} className={result.status} title={result.message}>画面 {index + 1} {service.name}: {result.status === 'success' ? '成功' : '失敗'}</span>;
          })}
          {promptResults.filter((result) => visibleStates.some(({ viewId }) => viewId === result.viewId)).length >= 2 ? <button type="button" className="compare-button" onClick={() => void startComparison()}>回答を比較</button> : null}
          {promptError ? <span className="failure" role="alert">{promptError}</span> : null}
        </div>
      </form>}
      <NavigationBar state={selectedState} disabled={isComparisonMode} />
      <div
        className={`pane-headers panes-${paneStates.length}`}
        aria-label="表示中タブ"
        ref={paneHeadersRef}
        onScroll={(event) => void window.multiAI.setPaneScrollOffset(event.currentTarget.scrollLeft)}
      >
        <div className="pane-headers-track" style={{ '--pane-count': paneStates.length, '--minimum-pane-width': `${MINIMUM_PANE_WIDTH}px` } as React.CSSProperties}>
        {paneStates.map((state) => {
          const service = getAiService(state.serviceId) ?? getAiServiceByUrl(state.url) ?? UNKNOWN_AI_SERVICE;
          const answerStatus = answerStatuses.get(state.viewId) ?? 'idle';
          return <div
            className={`pane-header${draggedPaneId === state.viewId ? ' dragging' : ''}${dropTargetPaneId === state.viewId ? ' drop-target' : ''}`}
            draggable={!isFocusMode && !isComparisonMode}
            key={state.viewId}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', String(state.viewId));
              setDraggedPaneId(state.viewId);
            }}
            onDragOver={(event) => {
              if (draggedPaneId !== null && draggedPaneId !== state.viewId) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDropTargetPaneId(state.viewId);
              }
            }}
            onDragLeave={() => setDropTargetPaneId((current) => current === state.viewId ? null : current)}
            onDrop={(event) => {
              event.preventDefault();
              const sourceId = Number(event.dataTransfer.getData('text/plain'));
              setDraggedPaneId(null);
              setDropTargetPaneId(null);
              if (Number.isInteger(sourceId)) void reorderPane(sourceId, state.viewId);
            }}
            onDragEnd={() => {
              setDraggedPaneId(null);
              setDropTargetPaneId(null);
            }}
          >
            <span className={`view-service-icon service-${service.id}`} aria-hidden="true">{service.icon}</span>
            <strong className="pane-title">{tabLabel(state)}</strong>
            <span className="pane-url" title={state.url} aria-label={`${tabLabel(state)}の現在のURL: ${state.url}`}>{state.url}</span>
            <span className={`answer-status ${answerStatus}`} aria-label={`${tabLabel(state)}の回答状態: ${answerStatusLabels[answerStatus]}`}>
              <span aria-hidden="true">●</span> {answerStatusLabels[answerStatus]}
            </span>
            <div className="pane-actions" role="group" aria-label={`${tabLabel(state)}の操作`}>
              <button type="button" title="このページを更新" aria-label={`${tabLabel(state)}を更新`} disabled={!isWorkspaceReady} onClick={() => void reloadPane(state)}>↻</button>
              <button type="button" title="閉じずに待機中へ移す" aria-label={`${tabLabel(state)}を最小化`} disabled={!isWorkspaceReady || isFocusMode || isComparisonMode || visibleStates.length === 1} onClick={() => void toggleTabVisibility(state)}>−</button>
              <button type="button" title="タブを完全に閉じる" aria-label={`${tabLabel(state)}をこの画面から完全に閉じる`} disabled={!isWorkspaceReady || isFocusMode || isComparisonMode || states.length === 1} onClick={() => void removeView(state.viewId)}>×</button>
            </div>
          </div>;
        })}
        </div>
      </div>
      {isLauncherOpen ? <ServiceLauncher onCancel={closeLauncher} onSelect={addView} /> : null}
      {launcherError ? <p className="launcher-error" role="alert">{launcherError}</p> : null}
      {bookmarkError ? <p className="bookmark-error" role="alert">{bookmarkError}</p> : null}
      {isStartupSelectionOpen ? <StartupWorkspaceSelector error={startupError} onSelect={startWorkspace} workspaces={startupWorkspaces} /> : null}
      {isBookmarkManagerOpen ? <BookmarkManager bookmarks={bookmarks} onClose={closeBookmarkManager} onDelete={deleteManagedBookmark} onOpen={openManagedBookmark} onUpdate={updateManagedBookmark} /> : null}
    </header>
  );
};
