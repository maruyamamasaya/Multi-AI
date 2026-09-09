import type { AiServiceId } from './ai-services';

export type ViewId = number;
export type ViewMoveDirection = 'left' | 'right';

export interface NavigationState {
  viewId: ViewId;
  serviceId: AiServiceId | null;
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
}

export const navigationChannels = {
  add: 'view:add',
  back: 'view:back',
  forward: 'view:forward',
  getStates: 'view:get-states',
  navigate: 'view:navigate',
  move: 'view:move',
  remove: 'view:remove',
  reload: 'view:reload',
  stateChanged: 'view:state-changed',
} as const;

export const normalizeNavigationUrl = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('URLを入力してください。');
  }

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(candidate);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('httpまたはhttpsのURLだけを指定できます。');
  }

  return url.href;
};
