import { type FormEvent, useEffect, useState } from 'react';
import {
  AI_SERVICES,
  UNKNOWN_AI_SERVICE,
  getAiService,
  getAiServiceByUrl,
  type AiServiceId,
} from '../shared/ai-services';
import type { Bookmark } from '../shared/bookmarks';
import type { NavigationState, ViewId, ViewMoveDirection } from '../shared/navigation';

const initialStates: NavigationState[] = [
  { viewId: 1, serviceId: null, url: 'https://example.com/', title: '', canGoBack: false, canGoForward: false, isLoading: true },
];

const NavigationBar = ({ state }: { state: NavigationState }) => {
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
      <button type="button" aria-label="戻る" disabled={!state.canGoBack} onClick={() => void run(window.multiAI.back)}>←</button>
      <button type="button" aria-label="進む" disabled={!state.canGoForward} onClick={() => void run(window.multiAI.forward)}>→</button>
      <button type="button" aria-label="再読み込み" onClick={() => void run(window.multiAI.reload)}>↻</button>
      <label className="url-field">
        <span className="sr-only">URL</span>
        <input aria-label="URL" aria-invalid={Boolean(error)} value={url} onChange={(event) => setUrl(event.target.value)} spellCheck={false} />
        {state.isLoading ? <span className="loading-indicator" aria-label="読み込み中" /> : null}
      </label>
      <button className="primary-button" type="submit">開く</button>
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
          <p className="launcher-eyebrow">NEW VIEW</p>
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

export const App = () => {
  const [states, setStates] = useState(initialStates);
  const [isWorkspaceReady, setIsWorkspaceReady] = useState(false);
  const [selectedViewId, setSelectedViewId] = useState<ViewId>(1);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [selectedBookmarkId, setSelectedBookmarkId] = useState('');
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [launcherError, setLauncherError] = useState('');
  const selectedState = states.find(({ viewId }) => viewId === selectedViewId) ?? states[0];

  useEffect(() => {
    const updateState = (next: NavigationState) => {
      setStates((current) => current.map((state) => (state.viewId === next.viewId ? next : state)));
    };
    const unsubscribe = window.multiAI.onNavigationState(updateState);
    void Promise.all([
      window.multiAI.getNavigationStates(),
      window.multiAI.getSelectedViewId(),
    ])
      .then(([next, restoredViewId]) => {
        if (next.length) {
          setStates(next);
          const restoredExists = next.some(({ viewId }) => viewId === restoredViewId);
          setSelectedViewId(restoredExists && restoredViewId !== null ? restoredViewId : next[0].viewId);
        }
      })
      .catch(() => undefined)
      .finally(() => setIsWorkspaceReady(true));
    void window.multiAI.getBookmarks().then(setBookmarks);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isLauncherOpen) return undefined;
    const cancelWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') void closeLauncher();
    };
    window.addEventListener('keydown', cancelWithEscape);
    return () => window.removeEventListener('keydown', cancelWithEscape);
  }, [isLauncherOpen]);

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
      setSelectedViewId(next.at(-1)?.viewId ?? selectedViewId);
      await closeLauncher();
    } catch (reason) {
      setLauncherError(reason instanceof Error ? reason.message : '画面を追加できませんでした。');
    }
  };

  const removeView = async () => {
    const removedIndex = states.findIndex(({ viewId }) => viewId === selectedViewId);
    const next = await window.multiAI.removeView(selectedViewId);
    setStates(next);
    setSelectedViewId(next[Math.min(removedIndex, next.length - 1)].viewId);
  };

  const moveView = async (direction: ViewMoveDirection) => {
    setStates(await window.multiAI.moveView(selectedViewId, direction));
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
    setBookmarks(await window.multiAI.addBookmark(selectedViewId));
  };

  const openBookmark = async () => {
    if (selectedBookmarkId) await window.multiAI.openBookmark(selectedViewId, selectedBookmarkId);
  };

  const removeBookmark = async () => {
    if (!selectedBookmarkId) return;
    setBookmarks(await window.multiAI.removeBookmark(selectedBookmarkId));
    setSelectedBookmarkId('');
  };

  if (!selectedState) return null;
  const selectedIndex = states.findIndex(({ viewId }) => viewId === selectedViewId);

  return (
    <header className={`app-bar${isFocusMode ? ' focus-mode' : ''}`}>
      <div className="workspace-row">
        <div className="brand"><span className="brand-mark">M</span><h1>Multi-AI</h1></div>
        <nav className="view-tabs" aria-label="画面選択">
          {states.map((state, index) => {
            const service = getAiService(state.serviceId) ?? getAiServiceByUrl(state.url) ?? UNKNOWN_AI_SERVICE;
            const isSelected = state.viewId === selectedViewId;
            return (
              <button
                key={state.viewId}
                disabled={!isWorkspaceReady || isFocusMode}
                className={isSelected ? 'active' : ''}
                aria-current={isSelected ? 'page' : undefined}
                aria-label={`画面 ${index + 1}: ${service.name}`}
                onClick={() => void selectView(state.viewId)}
              >
                <span className="view-number">{index + 1}</span>
                <span className={`view-service-icon service-${service.id}`} aria-hidden="true">{service.icon}</span>
                <span className="view-service-name">{service.name}</span>
              </button>
            );
          })}
        </nav>
        <div className="workspace-actions">
          <button aria-label="画面を減らす" disabled={!isWorkspaceReady || isFocusMode || states.length === 1} onClick={() => void removeView()}>−</button>
          <div className="reorder-actions" role="group" aria-label="画面の並び順">
            <button title="左へ移動" aria-label="選択中画面を左へ移動" disabled={!isWorkspaceReady || isFocusMode || selectedIndex <= 0} onClick={() => void moveView('left')}>‹</button>
            <button title="右へ移動" aria-label="選択中画面を右へ移動" disabled={!isWorkspaceReady || isFocusMode || selectedIndex >= states.length - 1} onClick={() => void moveView('right')}>›</button>
          </div>
          <button
            className="focus-button"
            title={isFocusMode ? '分割表示に戻す' : '選択中画面を集中表示'}
            aria-label={isFocusMode ? '分割表示に戻す' : '選択中画面を集中表示'}
            aria-pressed={isFocusMode}
            disabled={!isWorkspaceReady || states.length === 1}
            onClick={() => void toggleFocusMode()}
          >{isFocusMode ? '⊞' : '⛶'}</button>
          <button aria-label="画面を追加" disabled={!isWorkspaceReady || isFocusMode || states.length === 4} onClick={() => void openLauncher()}>＋</button>
        </div>
        {isFocusMode ? <span className="focus-status" role="status">集中表示中</span> : null}
        <div className="bookmark-actions">
          <button aria-label="現在のページをブックマーク" onClick={() => void addBookmark()}>☆</button>
          <select aria-label="ブックマーク" value={selectedBookmarkId} onChange={(event) => setSelectedBookmarkId(event.target.value)}>
            <option value="">ブックマーク</option>
            {bookmarks.map((bookmark) => <option key={bookmark.id} value={bookmark.id}>{bookmark.title}</option>)}
          </select>
          <button disabled={!selectedBookmarkId} onClick={() => void openBookmark()}>開く</button>
          <button aria-label="ブックマークを削除" disabled={!selectedBookmarkId} onClick={() => void removeBookmark()}>×</button>
        </div>
      </div>
      <NavigationBar state={selectedState} />
      {isLauncherOpen ? <ServiceLauncher onCancel={closeLauncher} onSelect={addView} /> : null}
      {launcherError ? <p className="launcher-error" role="alert">{launcherError}</p> : null}
    </header>
  );
};
