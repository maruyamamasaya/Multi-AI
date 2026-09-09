import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    window.multiAI = {
      ping: vi.fn().mockResolvedValue('pong'),
    };
  });

  it('shows the app title and confirms IPC connectivity', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Multi-AI' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '接続を確認' }));

    expect(await screen.findByText('接続済み')).toBeInTheDocument();
    expect(window.multiAI.ping).toHaveBeenCalledOnce();
  });
});
