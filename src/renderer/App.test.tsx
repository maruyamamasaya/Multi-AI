import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const states = [
  { viewId: 1, serviceId: null, url: 'https://example.com/', title: 'Example', canGoBack: false, canGoForward: false, isLoading: false },
  { viewId: 2, serviceId: null, url: 'https://example.org/', title: 'Example Org', canGoBack: false, canGoForward: false, isLoading: false },
];

describe('App', () => {
  beforeEach(() => {
    window.multiAI = {
      addBookmark: vi.fn().mockResolvedValue([]),
      addView: vi.fn().mockResolvedValue([...states, { ...states[0], viewId: 3 }]),
      back: vi.fn().mockResolvedValue(undefined),
      forward: vi.fn().mockResolvedValue(undefined),
      getBookmarks: vi.fn().mockResolvedValue([]),
      getNavigationStates: vi.fn().mockResolvedValue(states),
      getSelectedViewId: vi.fn().mockResolvedValue(1),
      navigate: vi.fn().mockResolvedValue(undefined),
      moveView: vi.fn().mockResolvedValue([states[1], states[0]]),
      onNavigationState: vi.fn().mockReturnValue(vi.fn()),
      openBookmark: vi.fn().mockResolvedValue(undefined),
      ping: vi.fn().mockResolvedValue('pong'),
      reload: vi.fn().mockResolvedValue(undefined),
      removeBookmark: vi.fn().mockResolvedValue([]),
      removeView: vi.fn().mockResolvedValue([states[0]]),
      selectView: vi.fn().mockResolvedValue(undefined),
      setLauncherOpen: vi.fn().mockResolvedValue(undefined),
    };
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

  it('keeps the four-view limit', async () => {
    window.multiAI.getNavigationStates = vi.fn().mockResolvedValue([
      ...states,
      { ...states[0], viewId: 3 },
      { ...states[1], viewId: 4 },
    ]);
    render(<App />);
    const addButton = screen.getByRole('button', { name: '画面を追加' });
    await waitFor(() => expect(addButton).toBeDisabled());
    fireEvent.click(addButton);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('restores the selected view', async () => {
    window.multiAI.getSelectedViewId = vi.fn().mockResolvedValue(2);
    render(<App />);
    expect(await screen.findByRole('button', { name: '画面 2: AIサービス' })).toHaveClass('active');
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
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '現在のページをブックマーク' }));
    await waitFor(() => expect(window.multiAI.addBookmark).toHaveBeenCalledWith(1));
  });

  it('shows the service name and icon for conversation URLs and a safe fallback', async () => {
    window.multiAI.getNavigationStates = vi.fn().mockResolvedValue([
      { ...states[0], url: 'https://chatgpt.com/c/first' },
      { ...states[1], url: 'https://example.org/' },
    ]);
    render(<App />);
    const chatGpt = await screen.findByRole('button', { name: '画面 1: ChatGPT' });
    expect(chatGpt).toHaveTextContent('CChatGPT');
    expect(screen.getByRole('button', { name: '画面 2: AIサービス' })).toHaveTextContent('AIAIサービス');
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

  it('keeps the selected AI identity through an external authentication URL', async () => {
    window.multiAI.getNavigationStates = vi.fn().mockResolvedValue([
      { ...states[0], serviceId: 'notebooklm', url: 'https://accounts.google.com/signin' },
      states[1],
    ]);
    render(<App />);
    expect(await screen.findByRole('button', { name: '画面 1: NotebookLM' })).toHaveTextContent('NNotebookLM');
  });
});
