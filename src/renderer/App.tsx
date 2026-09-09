import { type FormEvent, useEffect, useState } from 'react';
import type { Bookmark } from '../shared/bookmarks';
import type { NavigationState, ViewId } from '../shared/navigation';

const initialStates: NavigationState[] = [
  { viewId: 1, url: 'https://example.com/', title: '', canGoBack: false, canGoForward: false, isLoading: true },
  { viewId: 2, url: 'https://example.org/', title: '', canGoBack: false, canGoForward: false, isLoading: true },
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

export const App = () => {
  const [states, setStates] = useState(initialStates);
  const [isWorkspaceReady, setIsWorkspaceReady] = useState(false);
  const [selectedViewId, setSelectedViewId] = useState<ViewId>(1);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [selectedBookmarkId, setSelectedBookmarkId] = useState('');
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

  const addView = async () => {
    const next = await window.multiAI.addView();
    setStates(next);
    setSelectedViewId(next.at(-1)?.viewId ?? selectedViewId);
  };

  const removeView = async () => {
    const next = await window.multiAI.removeView(selectedViewId);
    setStates(next);
    setSelectedViewId(next[0].viewId);
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

  return (
    <header className="app-bar">
      <div className="workspace-row">
        <div className="brand"><span className="brand-mark">M</span><h1>Multi-AI</h1></div>
        <nav className="view-tabs" aria-label="画面選択">
          {states.map((state, index) => (
            <button key={state.viewId} disabled={!isWorkspaceReady} className={state.viewId === selectedViewId ? 'active' : ''} onClick={() => void selectView(state.viewId)}>
              画面 {index + 1}
            </button>
          ))}
        </nav>
        <div className="workspace-actions">
          <button aria-label="画面を減らす" disabled={!isWorkspaceReady || states.length === 1} onClick={() => void removeView()}>−</button>
          <button aria-label="画面を追加" disabled={!isWorkspaceReady || states.length === 4} onClick={() => void addView()}>＋</button>
        </div>
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
    </header>
  );
};
