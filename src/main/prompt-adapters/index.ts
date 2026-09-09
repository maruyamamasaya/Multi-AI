import type { AiServiceId } from '../../shared/ai-services';
import { chatGptPromptAdapter } from './chatgpt';
import { claudePromptAdapter } from './claude';
import { copilotPromptAdapter } from './copilot';
import { geminiPromptAdapter } from './gemini';
import { grokPromptAdapter } from './grok';
import { notebookLmPromptAdapter } from './notebooklm';
import { perplexityPromptAdapter } from './perplexity';
import type { PromptAdapter } from './types';

const adapters: PromptAdapter[] = [
  chatGptPromptAdapter,
  claudePromptAdapter,
  geminiPromptAdapter,
  perplexityPromptAdapter,
  grokPromptAdapter,
  copilotPromptAdapter,
  notebookLmPromptAdapter,
];

export const promptAdapters = new Map<AiServiceId, PromptAdapter>(
  adapters.map((adapter) => [adapter.serviceId, adapter]),
);
