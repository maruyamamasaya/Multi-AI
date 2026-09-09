import type { AiServiceId } from './ai-services';
import type { ViewId } from './navigation';

export type PromptSendStatus = 'success' | 'failure';

export interface PromptSendResult {
  viewId: ViewId;
  serviceId: AiServiceId | null;
  status: PromptSendStatus;
  message: string;
}

export const promptChannels = {
  send: 'prompt:send',
} as const;

export const normalizePrompt = (input: unknown): string => {
  if (typeof input !== 'string' || !input.trim()) throw new Error('プロンプトを入力してください。');
  if (input.length > 20_000) throw new Error('プロンプトは20000文字以内で入力してください。');
  return input;
};

export const parsePromptTargets = (input: unknown): ViewId[] => {
  if (!Array.isArray(input)) throw new Error('送信対象を選択してください。');
  const targets = [...new Set(input.filter((value): value is number => Number.isInteger(value)))];
  if (!targets.length) throw new Error('送信対象を1つ以上選択してください。');
  return targets;
};
