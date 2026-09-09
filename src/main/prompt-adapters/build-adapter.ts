import type { PromptAdapter, PromptAdapterConfig } from './types';

export const buildPromptScript = (config: PromptAdapterConfig, prompt: string): string => `
(async () => {
  const inputSelectors = ${JSON.stringify(config.inputSelectors)};
  const submitSelectors = ${JSON.stringify(config.submitSelectors)};
  const prompt = ${JSON.stringify(prompt)};
  const visible = (element) => Boolean(element && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
  const input = inputSelectors.map((selector) => document.querySelector(selector)).find(visible);
  if (!input) return { success: false, message: '入力欄が見つかりません。ログイン状態や表示ページを確認してください。' };
  if (input.disabled || input.getAttribute('aria-disabled') === 'true') return { success: false, message: '入力欄を現在利用できません。' };
  const currentText = 'value' in input ? input.value : input.textContent;
  if (currentText && currentText.trim()) return { success: false, message: '入力欄に未送信のテキストがあります。' };
  input.focus();
  if ('value' in input) {
    const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (!setter) return { success: false, message: '入力欄へテキストを設定できません。' };
    setter.call(input, prompt);
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: prompt }));
  } else if (input.isContentEditable) {
    input.textContent = '';
    const inserted = document.execCommand('insertText', false, prompt);
    if (!inserted) input.textContent = prompt;
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: prompt }));
  } else {
    return { success: false, message: '対応する入力欄ではありません。' };
  }
  await new Promise((resolve) => setTimeout(resolve, 180));
  const submit = submitSelectors.map((selector) => document.querySelector(selector)).find(visible);
  if (!submit || submit.disabled || submit.getAttribute('aria-disabled') === 'true') {
    return { success: false, message: '送信ボタンが見つからないか、現在利用できません。' };
  }
  submit.click();
  return { success: true, message: '送信操作を完了しました。' };
})()
`.trim();

export const createPromptAdapter = (config: PromptAdapterConfig): PromptAdapter => ({
  serviceId: config.serviceId,
  buildScript: (prompt) => buildPromptScript(config, prompt),
});
