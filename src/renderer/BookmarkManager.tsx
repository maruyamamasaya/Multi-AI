import { type FormEvent, useMemo, useState } from 'react';
import { AI_SERVICES, getAiService, UNKNOWN_AI_SERVICE } from '../shared/ai-services';
import type { Bookmark, BookmarkUpdate } from '../shared/bookmarks';

interface BookmarkManagerProps {
  bookmarks: Bookmark[];
  onClose: () => Promise<void>;
  onDelete: (bookmarkId: string) => Promise<void>;
  onOpen: (bookmarkId: string) => Promise<void>;
  onUpdate: (bookmarkId: string, update: BookmarkUpdate) => Promise<void>;
}

const formatSavedAt = (savedAt?: string): string => savedAt
  ? new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(savedAt))
  : '日時不明（既存データ）';

export const BookmarkManager = ({ bookmarks, onClose, onDelete, onOpen, onUpdate }: BookmarkManagerProps) => {
  const [query, setQuery] = useState('');
  const [serviceId, setServiceId] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BookmarkUpdate>({ title: '', url: '' });
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('ja-JP');
  const filteredBookmarks = useMemo(() => bookmarks.filter((bookmark) =>
    (serviceId === 'all' || bookmark.serviceId === serviceId)
      && (!normalizedQuery || bookmark.title.toLocaleLowerCase('ja-JP').includes(normalizedQuery)),
  ), [bookmarks, normalizedQuery, serviceId]);

  const beginEdit = (bookmark: Bookmark) => {
    setEditingId(bookmark.id);
    setDraft({ title: bookmark.title, url: bookmark.url });
    setError('');
  };

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingId) return;
    setError('');
    try {
      await onUpdate(editingId, draft);
      setEditingId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '会話情報を更新できませんでした。');
    }
  };

  const openBookmark = async (bookmarkId: string) => {
    setError('');
    try {
      await onOpen(bookmarkId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'AI会話を開けませんでした。');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const bookmarkId = pendingDeleteId;
    setPendingDeleteId(null);
    setError('');
    try {
      await onDelete(bookmarkId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'AI会話を削除できませんでした。');
    }
  };

  return (
    <div className="bookmark-manager" role="dialog" aria-modal="true" aria-labelledby="bookmark-manager-title">
      <header className="bookmark-manager-header">
        <div><p>LIBRARY</p><h2 id="bookmark-manager-title">AI会話管理</h2></div>
        <button type="button" aria-label="AI会話管理を閉じる" onClick={() => void onClose()}>×</button>
      </header>
      <div className="bookmark-manager-filters">
        <label><span>タイトル検索</span><input type="search" value={query} placeholder="会話タイトルを検索" onChange={(event) => setQuery(event.target.value)} /></label>
        <label><span>AIサービス</span><select value={serviceId} onChange={(event) => setServiceId(event.target.value)}><option value="all">すべて</option>{AI_SERVICES.map((service) => <option value={service.id} key={service.id}>{service.name}</option>)}</select></label>
        <span className="bookmark-count">{filteredBookmarks.length} / {bookmarks.length}件</span>
      </div>
      {error ? <p className="bookmark-manager-error" role="alert">{error}</p> : null}
      <div className="bookmark-manager-list" aria-label="保存済みAI会話">
        {filteredBookmarks.length === 0 ? <p className="bookmark-manager-empty">該当する保存済み会話はありません。</p> : filteredBookmarks.map((bookmark) => {
          const service = getAiService(bookmark.serviceId) ?? UNKNOWN_AI_SERVICE;
          return editingId === bookmark.id ? (
            <form className="bookmark-edit-card" key={bookmark.id} onSubmit={(event) => void submitEdit(event)}>
              <label><span>タイトル</span><input value={draft.title} maxLength={200} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
              <label><span>URL</span><input value={draft.url} spellCheck={false} onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))} /></label>
              <div className="bookmark-card-actions"><button className="primary-button" type="submit">保存</button><button type="button" onClick={() => setEditingId(null)}>キャンセル</button></div>
            </form>
          ) : (
            <article className="bookmark-card" key={bookmark.id}>
              <span className={`service-mark service-${service.id}`} aria-hidden="true">{service.icon}</span>
              <div className="bookmark-card-content"><strong>{bookmark.title}</strong><span>{service.name} · 保存日時: {formatSavedAt(bookmark.savedAt)}</span><code title={bookmark.url}>{bookmark.url}</code></div>
              <div className="bookmark-card-actions"><button className="primary-button" type="button" onClick={() => void openBookmark(bookmark.id)}>開く</button><button type="button" onClick={() => beginEdit(bookmark)}>編集</button><button className="danger-button" type="button" onClick={() => setPendingDeleteId(bookmark.id)}>削除</button></div>
            </article>
          );
        })}
      </div>
      {pendingDeleteId ? <div className="bookmark-delete-confirm" role="alertdialog" aria-modal="true" aria-labelledby="bookmark-delete-title"><div><h3 id="bookmark-delete-title">このAI会話を削除しますか？</h3><p>保存した一覧から削除されます。元のAIサービス上の会話は削除されません。</p><div><button type="button" onClick={() => setPendingDeleteId(null)}>キャンセル</button><button className="danger-button" type="button" onClick={() => void confirmDelete()}>削除する</button></div></div></div> : null}
    </div>
  );
};
