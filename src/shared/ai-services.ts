export const AI_SERVICES = [
  { id: 'chatgpt', name: 'ChatGPT', icon: 'C', url: 'https://chatgpt.com/', hosts: ['chatgpt.com', 'chat.openai.com'] },
  { id: 'claude', name: 'Claude', icon: 'Cl', url: 'https://claude.ai/', hosts: ['claude.ai'] },
  { id: 'gemini', name: 'Gemini', icon: 'G', url: 'https://gemini.google.com/', hosts: ['gemini.google.com'] },
  { id: 'perplexity', name: 'Perplexity', icon: 'P', url: 'https://www.perplexity.ai/', hosts: ['perplexity.ai'] },
  { id: 'grok', name: 'Grok', icon: 'Gr', url: 'https://grok.com/', hosts: ['grok.com'] },
  { id: 'copilot', name: 'Microsoft Copilot', icon: 'Co', url: 'https://copilot.microsoft.com/', hosts: ['copilot.microsoft.com'] },
  { id: 'notebooklm', name: 'NotebookLM', icon: 'N', url: 'https://notebooklm.google.com/', hosts: ['notebooklm.google.com', 'notebook.google.com'] },
] as const;

export type AiService = (typeof AI_SERVICES)[number];
export type AiServiceId = AiService['id'];

export const getAiService = (serviceId: unknown): AiService | undefined =>
  typeof serviceId === 'string'
    ? AI_SERVICES.find(({ id }) => id === serviceId)
    : undefined;

export const UNKNOWN_AI_SERVICE = {
  id: 'unknown',
  name: 'AIサービス',
  icon: 'AI',
} as const;

export const getAiServiceByUrl = (input: string): AiService | undefined => {
  try {
    const hostname = new URL(input).hostname.toLowerCase();
    return AI_SERVICES.find(({ hosts }) =>
      hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`)),
    );
  } catch {
    return undefined;
  }
};

export const launcherChannels = {
  setOpen: 'launcher:set-open',
} as const;
