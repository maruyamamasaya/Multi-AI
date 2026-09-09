import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const states = [
  { viewId: 1, url: 'https://example.com/', title: 'Example', canGoBack: false, canGoForward: false, isLoading: false },
  { viewId: 2, url: 'https://example.org/', title: 'Example Org', canGoBack: false, canGoForward: false, isLoading: false },
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
      onNavigationState: vi.fn().mockReturnValue(vi.fn()),
      openBookmark: vi.fn().mockResolvedValue(undefined),
      ping: vi.fn().mockResolvedValue('pong'),
      reload: vi.fn().mockResolvedValue(undefined),
      removeBookmark: vi.fn().mockResolvedValue([]),
      removeView: vi.fn().mockResolvedValue([states[0]]),
      selectView: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('adds a third view and selects it', async () => {
    render(<App />);
    const addButton = screen.getByRole('button', { name: '画面を追加' });
    await waitFor(() => expect(addButton).toBeEnabled());
    fireEvent.click(addButton);
    expect(await screen.findByRole('button', { name: '画面 3' })).toHaveClass('active');
  });

  it('restores the selected view', async () => {
    window.multiAI.getSelectedViewId = vi.fn().mockResolvedValue(2);
    render(<App />);
    expect(await screen.findByRole('button', { name: '画面 2' })).toHaveClass('active');
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
});
