import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AI_SERVICES } from '../../shared/ai-services';
import { buildPromptScript } from './build-adapter';
import { promptAdapters } from './index';

describe('prompt adapters', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue({ length: 1 } as DOMRectList);
  });

  it('registers one isolated adapter for every supported AI service', () => {
    expect([...promptAdapters.keys()]).toEqual(AI_SERVICES.map(({ id }) => id));
    expect(new Set([...promptAdapters.values()].map((adapter) => adapter.buildScript('test'))).size).toBe(7);
  });

  it('fills an empty input and clicks the configured submit button', async () => {
    document.body.innerHTML = '<textarea id="prompt"></textarea><button id="send">Send</button>';
    const click = vi.spyOn(document.querySelector<HTMLButtonElement>('#send')!, 'click');
    const script = buildPromptScript({ serviceId: 'chatgpt', inputSelectors: ['#prompt'], submitSelectors: ['#send'] }, 'same prompt');
    await expect(Function(`return ${script}`)()).resolves.toEqual({ success: true, message: '送信操作を完了しました。' });
    expect(document.querySelector<HTMLTextAreaElement>('#prompt')).toHaveValue('same prompt');
    expect(click).toHaveBeenCalledOnce();
  });

  it('fails safely without overwriting an existing draft or clicking send', async () => {
    document.body.innerHTML = '<textarea id="prompt">draft</textarea><button id="send">Send</button>';
    const click = vi.spyOn(document.querySelector<HTMLButtonElement>('#send')!, 'click');
    const script = buildPromptScript({ serviceId: 'claude', inputSelectors: ['#prompt'], submitSelectors: ['#send'] }, 'new prompt');
    await expect(Function(`return ${script}`)()).resolves.toMatchObject({ success: false, message: '入力欄に未送信のテキストがあります。' });
    expect(document.querySelector<HTMLTextAreaElement>('#prompt')).toHaveValue('draft');
    expect(click).not.toHaveBeenCalled();
  });

  it('supports the current Grok textbox and submit identifiers', async () => {
    document.body.innerHTML = '<div contenteditable="true" role="textbox" aria-label="Ask Grok anything"></div><button data-testid="chat-submit">Send</button>';
    const input = document.querySelector<HTMLElement>('[role="textbox"]')!;
    const send = document.querySelector<HTMLButtonElement>('[data-testid="chat-submit"]')!;
    const click = vi.spyOn(send, 'click');
    Object.defineProperty(input, 'isContentEditable', { value: true });
    Object.defineProperty(send, 'disabled', { value: false });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn((_command: string, _showUi: boolean, value: string) => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.textContent = value;
        return true;
      }),
    });

    const script = promptAdapters.get('grok')!.buildScript('same prompt');
    await expect(Function(`return ${script}`)()).resolves.toEqual({ success: true, message: '送信操作を完了しました。' });
    expect(document.querySelector('[role="textbox"]')).toHaveTextContent('same prompt');
    expect(click).toHaveBeenCalledOnce();
  });
});
