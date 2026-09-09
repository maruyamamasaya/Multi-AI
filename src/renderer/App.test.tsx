import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const states = [
  { viewId: 1, serviceId: null, url: 'https://example.com/', title: 'Example', canGoBack: false, canGoForward: false, isLoading: false, isVisible: true },
  { viewId: 2, serviceId: null, url: 'https://example.org/', title: 'Example Org', canGoBack: false, canGoForward: false, isLoading: false, isVisible: true },
];

describe('App', () => {
  afterEach(() => vi.restoreAllMocks());

  beforeEach(() => {
    window.multiAI = {
      addBookmark: vi.fn().mockResolvedValue([]),
      addView: vi.fn().mockResolvedValue([...states, { ...states[0], viewId: 3 }]),
      back: vi.fn().mockResolvedValue(undefined),
      exitComparison: vi.fn().mockResolvedValue(undefined),
      forward: vi.fn().mockResolvedValue(undefined),
      getZoomPercent: vi.fn().mockResolvedValue(100),
      getBookmarks: vi.fn().mockResolvedValue([]),
      getNamedWorkspaces: vi.fn().mockResolvedValue([]),
      getStartupWorkspaceState: vi.fn().mockResolvedValue({ required: false, workspaces: [] }),
      getNavigationStates: vi.fn().mockResolvedValue(states),
      getSelectedViewId: vi.fn().mockResolvedValue(1),
      navigate: vi.fn().mockResolvedValue(undefined),
      moveView: vi.fn().mockResolvedValue([states[1], states[0]]),
      loadNamedWorkspace: vi.fn().mockResolvedValue({ states: [states[1], states[0]], selectedViewId: 2 }),
      onNavigationState: vi.fn().mockReturnValue(vi.fn()),
      openBookmark: vi.fn().mockResolvedValue(undefined),
      ping: vi.fn().mockResolvedValue('pong'),
      reload: vi.fn().mockResolvedValue(undefined),
      removeBookmark: vi.fn().mockResolvedValue([]),
      setBookmarkManagerOpen: vi.fn().mockResolvedValue(undefined),
      removeNamedWorkspace: vi.fn().mockResolvedValue([]),
      removeView: vi.fn().mockResolvedValue([states[0]]),
      selectView: vi.fn().mockResolvedValue(undefined),
      saveNamedWorkspace: vi.fn().mockResolvedValue([{ id: 'saved-1', name: '調査用', viewCount: 2, serviceIds: [], updatedAt: '2026-09-09T00:00:00.000Z' }]),
      sendPrompt: vi.fn().mockResolvedValue([]),
      setFocusMode: vi.fn().mockResolvedValue(undefined),
      setComparisonLayout: vi.fn().mockResolvedValue(undefined),
      setLauncherOpen: vi.fn().mockResolvedValue(undefined),
      setTabVisibility: vi.fn().mockResolvedValue({ visibleViewIds: [1, 2], selectedViewId: 1 }),
      setPaneScrollOffset: vi.fn().mockResolvedValue(undefined),
      setHeaderCollapsed: vi.fn().mockResolvedValue(undefined),
      changeZoom: vi.fn().mockImplementation(async (action) => action === 'in' ? 110 : action === 'out' ? 90 : 100),
      startWorkspace: vi.fn().mockResolvedValue({ states, selectedViewId: 1 }),
      updateBookmark: vi.fn().mockResolvedValue([]),
    };
  });

  it('hides and restores the common header without changing page state', async () => {
    render(<App />);
    const hide = await screen.findByRole('button', { name: 'ヘッダーを隠す' });
    fireEvent.click(hide);
    await waitFor(() => expect(window.multiAI.setHeaderCollapsed).toHaveBeenCalledWith(true));
    expect(screen.getByRole('button', { name: 'ヘッダーを表示' })).toBeInTheDocument();
    expect(window.multiAI.reload).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'ヘッダーを表示' }));
    await waitFor(() => expect(window.multiAI.setHeaderCollapsed).toHaveBeenLastCalledWith(false));
    expect(screen.getByRole('button', { name: 'ヘッダーを隠す' })).toBeInTheDocument();
    expect(window.multiAI.reload).not.toHaveBeenCalled();
  });

  it('opens the launcher and adds the selected AI in a new view', async () => {
    render(<App />);
    const addButton = screen.getByRole('button', { name: '画面を追加' });
    await waitFor(() => expect(addButton).toBeEnabled());
    fireEvent.click(addButton);
    expect(await screen.findByRole('dialog', { name: 'AIサービスを選択' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Claude' }));
    expect(await screen.findByRole('button', { name: '画面 3: AIサービス' })).toHaveClass('active');
    expect(window.multiAI.addView).toHaveBeenCalledWith('claude');
    expect(window.multiAI.setLauncherOpen).toHaveBeenNthCalledWith(1, true);
    expect(window.multiAI.setLauncherOpen).toHaveBeenNthCalledWith(2, false);
  });

  it('lists every supported AI and cancels without adding a view', async () => {
    render(<App />);
    const addButton = screen.getByRole('button', { name: '画面を追加' });
    await waitFor(() => expect(addButton).toBeEnabled());
    fireEvent.click(addButton);
    await screen.findByRole('dialog', { name: 'AIサービスを選択' });
    for (const name of [
      'ChatGPT',
      'Claude',
      'Gemini',
      'Perplexity',
      'Grok',
      'Microsoft Copilot',
      'NotebookLM',
    ]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    fireEvent.click(screen.getAllByRole('button', { name: 'キャンセル' }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(window.multiAI.addView).not.toHaveBeenCalled();
  });

  it('allows more than four tabs while keeping only four visible', async () => {
    window.multiAI.getNavigationStates = vi.fn().mockResolvedValue([
      ...states,
      { ...states[0], viewId: 3 },
      { ...states[1], viewId: 4 },
    ]);
    render(<App />);
    const addButton = screen.getByRole('button', { name: '画面を追加' });
    await waitFor(() => expect(addButton).toBeEnabled());
    fireEvent.click(addButton);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('changes and resets the shared zoom from the toolbar', async () => {
    window.multiAI.changeZoom = vi.fn()
      .mockResolvedValueOnce(110)
      .mockResolvedValueOnce(90)
      .mockResolvedValueOnce(100);
    render(<App />);

    expect(await screen.findByRole('button', { name: '全画面を100%に戻す' })).toHaveTextContent('100%');
    fireEvent.click(screen.getByRole('button', { name: '全画面を拡大' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '全画面を100%に戻す' })).toHaveTextContent('110%'));
    fireEvent.click(screen.getByRole('button', { name: '全画面を縮小' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '全画面を100%に戻す' })).toHaveTextContent('90%'));
    fireEvent.click(screen.getByRole('button', { name: '全画面を100%に戻す' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '全画面を100%に戻す' })).toHaveTextContent('100%'));
    expect(window.multiAI.changeZoom).toHaveBeenNthCalledWith(1, 'in');
    expect(window.multiAI.changeZoom).toHaveBeenNthCalledWith(2, 'out');
    expect(window.multiAI.changeZoom).toHaveBeenNthCalledWith(3, 'reset');
  });

  it('restores the selected view', async () => {
    window.multiAI.getSelectedViewId = vi.fn().mockResolvedValue(2);
    render(<App />);
    expect(await screen.findByRole('button', { name: '画面 2: AIサービス' })).toHaveClass('active');
  });

  it('starts immediately without a selector when there are no named workspaces', async () => {
    render(<App />);
    await waitFor(() => expect(window.multiAI.getStartupWorkspaceState).toHaveBeenCalled());
    expect(screen.queryByRole('dialog', { name: '開始するワークスペース' })).not.toBeInTheDocument();
    expect(window.multiAI.startWorkspace).not.toHaveBeenCalled();
  });

  it('shows named workspace details and continues from the previous workspace', async () => {
    window.multiAI.getStartupWorkspaceState = vi.fn().mockResolvedValue({
      required: true,
      workspaces: [{ id: 'startup-1', name: '調査セット', viewCount: 3, serviceIds: ['chatgpt', 'claude'], updatedAt: '2026-09-09T00:00:00.000Z' }],
    });
    render(<App />);
    const dialog = await screen.findByRole('dialog', { name: '開始するワークスペース' });
    expect(dialog).toHaveTextContent('調査セット');
    expect(dialog).toHaveTextContent('3画面');
    expect(dialog).toHaveTextContent('ChatGPT · Claude');
    fireEvent.click(screen.getByRole('button', { name: /前回の続き/ }));
    await waitFor(() => expect(window.multiAI.startWorkspace).toHaveBeenCalledWith({ kind: 'last' }));
    expect(screen.queryByRole('dialog', { name: '開始するワークスペース' })).not.toBeInTheDocument();
  });

  it('starts with the selected named workspace and restores its selection', async () => {
    window.multiAI.getStartupWorkspaceState = vi.fn().mockResolvedValue({
      required: true,
      workspaces: [{ id: 'startup-1', name: '調査セット', viewCount: 2, serviceIds: ['gemini'], updatedAt: '2026-09-09T00:00:00.000Z' }],
    });
    window.multiAI.startWorkspace = vi.fn().mockResolvedValue({ states: [states[1], states[0]], selectedViewId: 2 });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /調査セット/ }));
    await waitFor(() => expect(window.multiAI.startWorkspace).toHaveBeenCalledWith({ kind: 'named', workspaceId: 'startup-1' }));
    expect(screen.getByRole('button', { name: '画面 1: AIサービス' })).toHaveClass('active');
  });

  it('toggles focus mode without changing the view order and locks layout actions', async () => {
    render(<App />);
    const focus = screen.getByRole('button', { name: '選択中画面を集中表示' });
    await waitFor(() => expect(focus).toBeEnabled());
    fireEvent.click(focus);
    await waitFor(() => expect(window.multiAI.setFocusMode).toHaveBeenCalledWith(1, true));
    expect(screen.getByRole('status')).toHaveTextContent('集中表示中');
    expect(screen.getByRole('button', { name: '画面 1: AIサービス' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '画面を追加' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '画面を減らす' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '選択中画面を左へ移動' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '選択中画面を右へ移動' })).toBeDisabled();
    expect(screen.getAllByRole('button', { name: /画面 \d: AIサービス/ })).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: '分割表示に戻す' }));
    await waitFor(() => expect(window.multiAI.setFocusMode).toHaveBeenLastCalledWith(1, false));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '画面を追加' })).toBeEnabled();
  });

  it('disables focus mode when only one view exists', async () => {
    window.multiAI.getNavigationStates = vi.fn().mockResolvedValue([states[0]]);
    render(<App />);
    const focus = screen.getByRole('button', { name: '選択中画面を集中表示' });
    await waitFor(() => expect(focus).toBeDisabled());
    fireEvent.click(focus);
    expect(window.multiAI.setFocusMode).not.toHaveBeenCalled();
  });

  it('moves the selected view left with its state and keeps it selected', async () => {
    window.multiAI.getSelectedViewId = vi.fn().mockResolvedValue(2);
    render(<App />);
    const moveLeft = screen.getByRole('button', { name: '選択中画面を左へ移動' });
    await waitFor(() => expect(moveLeft).toBeEnabled());
    fireEvent.click(moveLeft);
    await waitFor(() => expect(window.multiAI.moveView).toHaveBeenCalledWith(2, 'left'));
    expect(screen.getByRole('button', { name: '画面 1: AIサービス' })).toHaveClass('active');
  });

  it('disables reorder controls at the selected view boundaries', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByRole('button', { name: '選択中画面を左へ移動' })).toBeDisabled());
    expect(screen.getByRole('button', { name: '選択中画面を右へ移動' })).toBeEnabled();
  });

  it('selects the adjacent view after removing the selected view', async () => {
    window.multiAI.getSelectedViewId = vi.fn().mockResolvedValue(2);
    window.multiAI.removeView = vi.fn().mockResolvedValue([states[0]]);
    render(<App />);
    const remove = screen.getByRole('button', { name: '画面を減らす' });
    await waitFor(() => expect(remove).toBeEnabled());
    fireEvent.click(remove);
    await waitFor(() => expect(window.multiAI.removeView).toHaveBeenCalledWith(2));
    expect(screen.getByRole('button', { name: '画面 1: AIサービス' })).toHaveClass('active');
  });

  it('navigates the selected view', async () => {
    render(<App />);
    const input = await screen.findByRole('textbox', { name: 'URL' });
    fireEvent.change(input, { target: { value: 'example.net' } });
    fireEvent.submit(screen.getByRole('form', { name: '選択中ビューのナビゲーション' }));
    await waitFor(() => expect(window.multiAI.navigate).toHaveBeenCalledWith(1, 'example.net'));
  });

  it('saves the selected page as a bookmark', async () => {
    window.multiAI.getNavigationStates = vi.fn().mockResolvedValue([
      { ...states[0], serviceId: 'chatgpt', url: 'https://chatgpt.com/c/example' },
      states[1],
    ]);
    render(<App />);
    const save = screen.getByRole('button', { name: '現在のAI会話を保存' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(window.multiAI.addBookmark).toHaveBeenCalledWith(1));
  });

  it('does not allow an unsupported page to be bookmarked', async () => {
    render(<App />);
    const save = screen.getByRole('button', { name: '現在のAI会話を保存' });
    await waitFor(() => expect(save).toBeDisabled());
    fireEvent.click(save);
    expect(window.multiAI.addBookmark).not.toHaveBeenCalled();
  });

  it('lists a saved conversation with its AI icon, name, and display name', async () => {
    window.multiAI.getBookmarks = vi.fn().mockResolvedValue([
      { id: 'conversation-1', title: '設計相談', url: 'https://claude.ai/chat/example', serviceId: 'claude' },
    ]);
    render(<App />);
    const list = await screen.findByRole('combobox', { name: 'AI会話ブックマーク' });
    expect(list).toHaveTextContent('Cl Claude · 設計相談');
    fireEvent.change(list, { target: { value: 'conversation-1' } });
    fireEvent.click(screen.getByRole('button', { name: '選択中画面でAI会話を開く' }));
    await waitFor(() => expect(window.multiAI.openBookmark).toHaveBeenCalledWith(1, 'conversation-1'));
  });

  it('manages saved conversations in a dedicated searchable and editable screen', async () => {
    const saved = [
      { id: 'chat-1', title: '設計相談', url: 'https://chatgpt.com/c/design', serviceId: 'chatgpt' as const, savedAt: '2026-09-09T00:00:00.000Z' },
      { id: 'claude-1', title: '調査メモ', url: 'https://claude.ai/chat/research', serviceId: 'claude' as const },
    ];
    window.multiAI.getBookmarks = vi.fn().mockResolvedValue(saved);
    window.multiAI.updateBookmark = vi.fn().mockResolvedValue(saved);
    window.multiAI.removeBookmark = vi.fn().mockResolvedValue([saved[1]]);
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'AI会話管理を開く' }));
    const manager = await screen.findByRole('dialog', { name: 'AI会話管理' });
    expect(window.multiAI.setBookmarkManagerOpen).toHaveBeenCalledWith(true);
    expect(screen.getByText(/ChatGPT · 保存日時:/)).toBeInTheDocument();
    expect(screen.getByText(/Claude · 保存日時: 日時不明/)).toBeInTheDocument();

    fireEvent.change(within(manager).getByRole('searchbox', { name: 'タイトル検索' }), { target: { value: '設計' } });
    expect(screen.getByText('設計相談')).toBeInTheDocument();
    expect(screen.queryByText('調査メモ')).not.toBeInTheDocument();
    fireEvent.change(within(manager).getByRole('searchbox', { name: 'タイトル検索' }), { target: { value: '' } });
    fireEvent.change(within(manager).getByRole('combobox', { name: 'AIサービス' }), { target: { value: 'claude' } });
    expect(screen.getByText('調査メモ')).toBeInTheDocument();
    expect(screen.queryByText('設計相談')).not.toBeInTheDocument();

    fireEvent.click(within(manager).getByRole('button', { name: '編集' }));
    fireEvent.change(within(manager).getByRole('textbox', { name: 'タイトル' }), { target: { value: '更新タイトル' } });
    fireEvent.change(within(manager).getByRole('textbox', { name: 'URL' }), { target: { value: 'https://claude.ai/chat/updated' } });
    fireEvent.click(within(manager).getByRole('button', { name: '保存' }));
    await waitFor(() => expect(window.multiAI.updateBookmark).toHaveBeenCalledWith('claude-1', { title: '更新タイトル', url: 'https://claude.ai/chat/updated' }));

    fireEvent.click(within(manager).getByRole('button', { name: '削除' }));
    expect(screen.getByRole('alertdialog', { name: 'このAI会話を削除しますか？' })).toBeInTheDocument();
    expect(window.multiAI.removeBookmark).not.toHaveBeenCalled();
    fireEvent.click(within(manager).getByRole('button', { name: '削除する' }));
    await waitFor(() => expect(window.multiAI.removeBookmark).toHaveBeenCalledWith('claude-1'));
  });

  it('opens a managed conversation in the selected pane and returns to the workspace', async () => {
    window.multiAI.getBookmarks = vi.fn().mockResolvedValue([
      { id: 'conversation-1', title: '設計相談', url: 'https://claude.ai/chat/example', serviceId: 'claude' },
    ]);
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'AI会話管理を開く' }));
    const manager = await screen.findByRole('dialog', { name: 'AI会話管理' });
    fireEvent.click(within(manager).getByRole('button', { name: '開く' }));
    await waitFor(() => expect(window.multiAI.openBookmark).toHaveBeenCalledWith(1, 'conversation-1'));
    expect(window.multiAI.setBookmarkManagerOpen).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('dialog', { name: 'AI会話管理' })).not.toBeInTheDocument();
  });

  it('saves the current workspace with a name', async () => {
    render(<App />);
    const name = await screen.findByRole('textbox', { name: 'ワークスペース名' });
    fireEvent.change(name, { target: { value: '調査用' } });
    fireEvent.click(screen.getByRole('button', { name: 'ワークスペース保存' }));
    await waitFor(() => expect(window.multiAI.saveNamedWorkspace).toHaveBeenCalledWith('調査用', false));
    expect(screen.getByRole('combobox', { name: 'ワークスペース一覧' })).toHaveValue('saved-1');
  });

  it('confirms before overwriting a workspace with the same name', async () => {
    window.multiAI.getStartupWorkspaceState = vi.fn().mockResolvedValue({ required: false, workspaces: [
      { id: 'saved-1', name: '調査用', viewCount: 2, serviceIds: [], updatedAt: '2026-09-09T00:00:00.000Z' },
    ] });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    fireEvent.change(await screen.findByRole('textbox', { name: 'ワークスペース名' }), { target: { value: '調査用' } });
    fireEvent.click(screen.getByRole('button', { name: 'ワークスペース保存' }));
    await waitFor(() => expect(window.multiAI.saveNamedWorkspace).toHaveBeenCalledWith('調査用', true));
    expect(window.confirm).toHaveBeenCalledWith('「調査用」を上書きしますか？');
  });

  it('loads a named workspace and restores its selected view', async () => {
    window.multiAI.getStartupWorkspaceState = vi.fn().mockResolvedValue({ required: false, workspaces: [
      { id: 'saved-1', name: '調査用', viewCount: 2, serviceIds: [], updatedAt: '2026-09-09T00:00:00.000Z' },
    ] });
    render(<App />);
    const list = await screen.findByRole('combobox', { name: 'ワークスペース一覧' });
    fireEvent.change(list, { target: { value: 'saved-1' } });
    fireEvent.click(screen.getByRole('button', { name: '切り替え' }));
    await waitFor(() => expect(window.multiAI.loadNamedWorkspace).toHaveBeenCalledWith('saved-1'));
    expect(screen.getByRole('button', { name: '画面 1: AIサービス' })).toHaveClass('active');
  });

  it('confirms and removes a saved workspace', async () => {
    window.multiAI.getStartupWorkspaceState = vi.fn().mockResolvedValue({ required: false, workspaces: [
      { id: 'saved-1', name: '調査用', viewCount: 2, serviceIds: [], updatedAt: '2026-09-09T00:00:00.000Z' },
    ] });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    fireEvent.change(await screen.findByRole('combobox', { name: 'ワークスペース一覧' }), { target: { value: 'saved-1' } });
    fireEvent.click(screen.getByRole('button', { name: '保存済みワークスペースを削除' }));
    await waitFor(() => expect(window.multiAI.removeNamedWorkspace).toHaveBeenCalledWith('saved-1'));
    expect(screen.getByRole('combobox', { name: 'ワークスペース一覧' })).toHaveValue('');
  });

  it('shows compact service icons for conversation URLs and a safe fallback', async () => {
    window.multiAI.getNavigationStates = vi.fn().mockResolvedValue([
      { ...states[0], url: 'https://chatgpt.com/c/first' },
      { ...states[1], url: 'https://example.org/' },
    ]);
    render(<App />);
    const chatGpt = await screen.findByRole('button', { name: '画面 1: ChatGPT' });
    expect(chatGpt).toHaveTextContent('1C');
    expect(chatGpt).not.toHaveTextContent('ChatGPT');
    expect(screen.getByRole('button', { name: '画面 2: AIサービス' })).toHaveTextContent('2AI');
  });

  it('shows duplicate instances of the same AI independently', async () => {
    window.multiAI.getNavigationStates = vi.fn().mockResolvedValue([
      { ...states[0], url: 'https://claude.ai/chat/one' },
      { ...states[1], url: 'https://claude.ai/chat/two' },
    ]);
    render(<App />);
    expect(await screen.findByRole('button', { name: '画面 1: Claude' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '画面 2: Claude' })).toBeInTheDocument();
  });

  it('selects duplicate AI views independently as prompt targets', async () => {
    window.multiAI.getNavigationStates = vi.fn().mockResolvedValue([
      { ...states[0], serviceId: 'claude', url: 'https://claude.ai/chat/one' },
      { ...states[1], serviceId: 'claude', url: 'https://claude.ai/chat/two' },
    ]);
    window.multiAI.sendPrompt = vi.fn().mockResolvedValue([
      { viewId: 1, serviceId: 'claude', status: 'success', message: '送信操作を完了しました。' },
    ]);
    render(<App />);
    const prompt = await screen.findByRole('textbox', { name: '共通プロンプト' });
    const targets = screen.getAllByRole('checkbox');
    await waitFor(() => expect(targets[0]).toBeChecked());
    expect(targets[1]).toBeChecked();
    fireEvent.click(targets[1]);
    fireEvent.change(prompt, { target: { value: '同じ質問' } });
    fireEvent.click(screen.getByRole('button', { name: '選択したAIへ送信' }));
    await waitFor(() => expect(window.multiAI.sendPrompt).toHaveBeenCalledWith('同じ質問', [1]));
    expect(await screen.findByText('画面 1 Claude: 成功')).toBeInTheDocument();
  });

  it('disables common prompt submission for empty text or zero targets', async () => {
    window.multiAI.getNavigationStates = vi.fn().mockResolvedValue([
      { ...states[0], serviceId: 'gemini', url: 'https://gemini.google.com/app' },
    ]);
    render(<App />);
    const send = screen.getByRole('button', { name: '選択したAIへ送信' });
    await waitFor(() => expect(screen.getByRole('checkbox')).toBeChecked());
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: '共通プロンプト' }), { target: { value: '質問' } });
    expect(send).toBeEnabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(send).toBeDisabled();
  });

  it('shows per-view success and failure without dropping either result', async () => {
    window.multiAI.getNavigationStates = vi.fn().mockResolvedValue([
      { ...states[0], serviceId: 'chatgpt', url: 'https://chatgpt.com/' },
      { ...states[1], serviceId: 'perplexity', url: 'https://www.perplexity.ai/' },
    ]);
    window.multiAI.sendPrompt = vi.fn().mockResolvedValue([
      { viewId: 1, serviceId: 'chatgpt', status: 'failure', message: '入力欄が見つかりません。' },
      { viewId: 2, serviceId: 'perplexity', status: 'success', message: '送信操作を完了しました。' },
    ]);
    render(<App />);
    fireEvent.change(await screen.findByRole('textbox', { name: '共通プロンプト' }), { target: { value: '比較して' } });
    fireEvent.click(screen.getByRole('button', { name: '選択したAIへ送信' }));
    expect(await screen.findByText('画面 1 ChatGPT: 失敗')).toBeInTheDocument();
    expect(screen.getByText('画面 2 Perplexity: 成功')).toBeInTheDocument();
  });

  it('shows conservative per-pane answer statuses without treating send success as completion', async () => {
    window.multiAI.getNavigationStates = vi.fn().mockResolvedValue([
      { ...states[0], serviceId: 'chatgpt', url: 'https://chatgpt.com/' },
      { ...states[1], serviceId: 'perplexity', url: 'https://www.perplexity.ai/' },
    ]);
    let resolveSend!: (results: Awaited<ReturnType<typeof window.multiAI.sendPrompt>>) => void;
    window.multiAI.sendPrompt = vi.fn().mockReturnValue(new Promise((resolve) => { resolveSend = resolve; }));
    render(<App />);
    expect(await screen.findByLabelText('ChatGPTの回答状態: 未実行')).toBeInTheDocument();
    expect(screen.getByLabelText('Perplexityの回答状態: 未実行')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: '共通プロンプト' }), { target: { value: '状態確認' } });
    fireEvent.click(screen.getByRole('button', { name: '選択したAIへ送信' }));
    expect(await screen.findByLabelText('ChatGPTの回答状態: 実行中')).toBeInTheDocument();
    expect(screen.getByLabelText('Perplexityの回答状態: 実行中')).toBeInTheDocument();

    resolveSend([
      { viewId: 1, serviceId: 'chatgpt', status: 'success', message: '送信操作を完了しました。' },
      { viewId: 2, serviceId: 'perplexity', status: 'failure', message: '送信ボタンが見つかりません。' },
    ]);
    expect(await screen.findByLabelText('Perplexityの回答状態: 失敗')).toBeInTheDocument();
    expect(screen.getByLabelText('ChatGPTの回答状態: 実行中')).toBeInTheDocument();
    expect(screen.queryByLabelText('ChatGPTの回答状態: 完了')).not.toBeInTheDocument();
  });

  it('compares sent views, excludes and restores a target, focuses, and exits', async () => {
    window.multiAI.getNavigationStates = vi.fn().mockResolvedValue([
      { ...states[0], serviceId: 'chatgpt', url: 'https://chatgpt.com/' },
      { ...states[1], serviceId: 'perplexity', url: 'https://www.perplexity.ai/' },
    ]);
    window.multiAI.sendPrompt = vi.fn().mockResolvedValue([
      { viewId: 1, serviceId: 'chatgpt', status: 'success', message: '送信操作を完了しました。' },
      { viewId: 2, serviceId: 'perplexity', status: 'failure', message: '送信ボタンが見つかりません。' },
    ]);
    render(<App />);
    fireEvent.change(await screen.findByRole('textbox', { name: '共通プロンプト' }), { target: { value: '比較用質問' } });
    fireEvent.click(screen.getByRole('button', { name: '選択したAIへ送信' }));
    fireEvent.click(await screen.findByRole('button', { name: '回答を比較' }));
    await waitFor(() => expect(window.multiAI.setComparisonLayout).toHaveBeenCalledWith({ activeViewIds: [1, 2], focusedViewId: null }));
    expect(screen.getByRole('region', { name: '回答比較モード' })).toHaveTextContent('ChatGPT');
    expect(screen.getByRole('region', { name: '回答比較モード' })).toHaveTextContent('送信失敗');
    expect(screen.getByRole('button', { name: '画面を追加' })).toBeDisabled();

    const targets = screen.getAllByRole('checkbox');
    fireEvent.click(targets[1]);
    await waitFor(() => expect(window.multiAI.setComparisonLayout).toHaveBeenLastCalledWith({ activeViewIds: [1], focusedViewId: null }));
    fireEvent.click(targets[1]);
    await waitFor(() => expect(window.multiAI.setComparisonLayout).toHaveBeenLastCalledWith({ activeViewIds: [1, 2], focusedViewId: null }));

    fireEvent.click(screen.getByRole('button', { name: '画面 1を比較内で集中表示' }));
    await waitFor(() => expect(window.multiAI.setComparisonLayout).toHaveBeenLastCalledWith({ activeViewIds: [1, 2], focusedViewId: 1 }));
    fireEvent.click(screen.getByRole('button', { name: '比較表示へ戻る' }));
    await waitFor(() => expect(window.multiAI.setComparisonLayout).toHaveBeenLastCalledWith({ activeViewIds: [1, 2], focusedViewId: null }));
    fireEvent.click(screen.getByRole('button', { name: '比較モードを終了' }));
    await waitFor(() => expect(window.multiAI.exitComparison).toHaveBeenCalled());
    expect(screen.queryByRole('region', { name: '回答比較モード' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '画面を追加' })).toBeEnabled();
  });

  it('keeps the selected AI identity through an external authentication URL', async () => {
    window.multiAI.getNavigationStates = vi.fn().mockResolvedValue([
      { ...states[0], serviceId: 'notebooklm', url: 'https://accounts.google.com/signin' },
      states[1],
    ]);
    render(<App />);
    const notebookTab = await screen.findByRole('button', { name: '画面 1: NotebookLM' });
    expect(notebookTab).toHaveTextContent('1N');
    expect(notebookTab).not.toHaveTextContent('NotebookLM');
  });

  it('keeps many independent tabs, displays up to six, and labels duplicate AI panes', async () => {
    const manyTabs = [
      { ...states[0], viewId: 1, serviceId: 'chatgpt' as const, url: 'https://chatgpt.com/c/one' },
      { ...states[0], viewId: 2, serviceId: 'chatgpt' as const, url: 'https://chatgpt.com/c/two' },
      { ...states[0], viewId: 3, serviceId: 'chatgpt' as const, url: 'https://chatgpt.com/c/three' },
      { ...states[0], viewId: 4, serviceId: 'claude' as const, url: 'https://claude.ai/chat/one' },
      { ...states[0], viewId: 5, serviceId: 'gemini' as const, url: 'https://gemini.google.com/app', isVisible: false },
      { ...states[0], viewId: 6, serviceId: 'perplexity' as const, url: 'https://www.perplexity.ai/', isVisible: false },
    ];
    window.multiAI.getNavigationStates = vi.fn().mockResolvedValue(manyTabs);
    render(<App />);
    await waitFor(() => expect(screen.getAllByRole('button', { name: /画面 \d: / })).toHaveLength(6));
    const headers = screen.getByLabelText('表示中タブ');
    expect(headers.firstElementChild?.children).toHaveLength(4);
    expect(headers).toHaveTextContent('ChatGPT 1');
    expect(headers).toHaveTextContent('ChatGPT 2');
    expect(headers).toHaveTextContent('ChatGPT 3');
    expect(screen.getByRole('button', { name: 'Geminiを表示する' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Geminiを表示する' })).toHaveTextContent('◌');
    expect(screen.getByRole('button', { name: 'ChatGPT 1を完全に閉じる' })).toBeEnabled();
  });

  it('separates hiding from closing and can restore a hidden tab', async () => {
    window.multiAI.getNavigationStates = vi.fn().mockResolvedValue([
      { ...states[0], serviceId: 'chatgpt', url: 'https://chatgpt.com/c/one' },
      { ...states[1], serviceId: 'claude', url: 'https://claude.ai/chat/one' },
    ]);
    window.multiAI.setTabVisibility = vi.fn()
      .mockResolvedValueOnce({ visibleViewIds: [2], selectedViewId: 2 })
      .mockResolvedValueOnce({ visibleViewIds: [1, 2], selectedViewId: 1 });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'ChatGPTを待機中にする' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'ChatGPTを表示する' })).toHaveTextContent('◌'));
    expect(window.multiAI.removeView).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'ChatGPTを表示する' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'ChatGPTを待機中にする' })).toHaveTextContent('◉'));
    fireEvent.click(screen.getByRole('button', { name: 'ChatGPTを完全に閉じる' }));
    await waitFor(() => expect(window.multiAI.removeView).toHaveBeenCalledWith(1));
  });

  it('offers URL, reload, minimize, and close controls on each visible pane', async () => {
    window.multiAI.setTabVisibility = vi.fn().mockResolvedValue({ visibleViewIds: [2], selectedViewId: 2 });
    render(<App />);

    const headers = await screen.findByLabelText('表示中タブ');
    expect(screen.getByLabelText('AIサービス 1の現在のURL: https://example.com/')).toBeInTheDocument();
    expect(screen.getByLabelText('AIサービス 2の現在のURL: https://example.org/')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'AIサービス 1を更新' }));
    await waitFor(() => expect(window.multiAI.reload).toHaveBeenCalledWith(1));

    fireEvent.click(screen.getByRole('button', { name: 'AIサービス 1を最小化' }));
    await waitFor(() => expect(window.multiAI.setTabVisibility).toHaveBeenCalledWith(1, false));
    expect(headers.firstElementChild?.children).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'AIサービス 2をこの画面から完全に閉じる' }));
    await waitFor(() => expect(window.multiAI.removeView).toHaveBeenCalledWith(2));
  });

  it('reorders page blocks by dragging one pane header onto another', async () => {
    window.multiAI.moveView = vi.fn().mockResolvedValue([states[1], states[0]]);
    render(<App />);
    const track = (await screen.findByLabelText('表示中タブ')).firstElementChild!;
    const source = track.children[0];
    const target = track.children[1];
    const transfer = {
      value: '',
      dropEffect: 'none',
      effectAllowed: 'none',
      setData(_type: string, value: string) { this.value = value; },
      getData() { return this.value; },
    };

    fireEvent.dragStart(source, { dataTransfer: transfer });
    fireEvent.dragOver(target, { dataTransfer: transfer });
    fireEvent.drop(target, { dataTransfer: transfer });

    await waitFor(() => expect(window.multiAI.moveView).toHaveBeenCalledWith(1, 'right'));
  });

  it('shows a lightweight limit message when a seventh pane is requested', async () => {
    const sixVisible = Array.from({ length: 6 }, (_, index) => ({
      ...states[0],
      viewId: index + 1,
      serviceId: 'chatgpt' as const,
      url: `https://chatgpt.com/c/${index + 1}`,
    }));
    const waiting = { ...states[1], viewId: 7, serviceId: 'claude' as const, url: 'https://claude.ai/chat/one', isVisible: false };
    window.multiAI.getNavigationStates = vi.fn().mockResolvedValue([...sixVisible, waiting]);
    window.multiAI.setTabVisibility = vi.fn().mockRejectedValue(new Error('最大6画面です。別のタブを待機中にしてから表示してください。'));
    render(<App />);

    const showButton = await screen.findByRole('button', { name: 'Claudeを表示する' });
    expect(showButton).toHaveAttribute('title', '最大6画面です');
    fireEvent.click(showButton);
    expect(await screen.findByRole('alert')).toHaveTextContent('最大6画面です');
  });

});
