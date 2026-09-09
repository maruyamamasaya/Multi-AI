import type { NavigationState, ViewId } from './navigation';
import type { AiServiceId } from './ai-services';
import { parseWorkspaceSnapshot, type WorkspaceSnapshot } from './workspace';

export interface NamedWorkspace {
  id: string;
  name: string;
  snapshot: WorkspaceSnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface NamedWorkspaceSummary {
  id: string;
  name: string;
  viewCount: number;
  serviceIds: AiServiceId[];
  updatedAt: string;
}

export interface NamedWorkspaceLoadResult {
  states: NavigationState[];
  selectedViewId: ViewId;
  zoomPercent: number;
}

export interface StartupWorkspaceState {
  required: boolean;
  workspaces: NamedWorkspaceSummary[];
}

export type StartupWorkspaceSelection =
  | { kind: 'last' }
  | { kind: 'named'; workspaceId: string };

export interface NamedWorkspaceFile {
  version: 1;
  workspaces: NamedWorkspace[];
}

export const namedWorkspaceChannels = {
  getAll: 'named-workspace:get-all',
  load: 'named-workspace:load',
  remove: 'named-workspace:remove',
  save: 'named-workspace:save',
  getStartupState: 'startup-workspace:get-state',
  start: 'startup-workspace:start',
} as const;

export const normalizeWorkspaceName = (input: unknown): string => {
  if (typeof input !== 'string') throw new Error('ワークスペース名を入力してください。');
  const name = input.trim();
  if (!name) throw new Error('ワークスペース名を入力してください。');
  if (name.length > 60) throw new Error('ワークスペース名は60文字以内で入力してください。');
  if (/\p{Cc}/u.test(name)) throw new Error('ワークスペース名に制御文字は使えません。');
  return name;
};

export const workspaceNamesMatch = (left: string, right: string): boolean =>
  left.localeCompare(right, undefined, { sensitivity: 'accent' }) === 0;

export const parseNamedWorkspaceFile = (input: unknown): NamedWorkspaceFile => {
  if (!input || typeof input !== 'object') return { version: 1, workspaces: [] };
  const candidate = input as Partial<NamedWorkspaceFile>;
  if (candidate.version !== 1 || !Array.isArray(candidate.workspaces)) {
    return { version: 1, workspaces: [] };
  }

  const names = new Set<string>();
  const workspaces: NamedWorkspace[] = [];
  for (const item of candidate.workspaces) {
    try {
      if (!item || typeof item !== 'object') continue;
      const value = item as Partial<NamedWorkspace>;
      if (typeof value.id !== 'string' || !value.id) continue;
      const name = normalizeWorkspaceName(value.name);
      const nameKey = name.toLocaleLowerCase();
      if (names.has(nameKey)) continue;
      if (typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))) continue;
      if (typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt))) continue;
      const snapshot = parseWorkspaceSnapshot(value.snapshot, []);
      if (snapshot.urls.length === 0) continue;
      names.add(nameKey);
      workspaces.push({ id: value.id, name, snapshot, createdAt: value.createdAt, updatedAt: value.updatedAt });
    } catch {
      continue;
    }
  }
  return { version: 1, workspaces };
};

export const summarizeNamedWorkspaces = (workspaces: NamedWorkspace[]): NamedWorkspaceSummary[] =>
  workspaces.map(({ id, name, snapshot, updatedAt }) => ({
    id,
    name,
    viewCount: snapshot.viewCount,
    serviceIds: [...new Set(snapshot.serviceIds.filter((serviceId): serviceId is AiServiceId => serviceId !== null))],
    updatedAt,
  }));
