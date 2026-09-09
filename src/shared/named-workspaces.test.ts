import { describe, expect, it } from 'vitest';
import { normalizeWorkspaceName, parseNamedWorkspaceFile, summarizeNamedWorkspaces } from './named-workspaces';

const saved = {
  id: 'workspace-1',
  name: '調査用',
  snapshot: { urls: ['https://chatgpt.com/', 'https://claude.ai/'], serviceIds: ['chatgpt', 'claude'], selectedIndex: 1 },
  createdAt: '2026-09-09T00:00:00.000Z',
  updatedAt: '2026-09-09T01:00:00.000Z',
};

describe('named workspaces', () => {
  it('normalizes names and validates workspace snapshots', () => {
    expect(normalizeWorkspaceName('  調査用  ')).toBe('調査用');
    expect(parseNamedWorkspaceFile({ version: 1, workspaces: [saved] }).workspaces[0]).toMatchObject({
      id: 'workspace-1', name: '調査用', snapshot: { viewCount: 2, selectedIndex: 1, layout: 'columns' },
    });
  });

  it('safely ignores corrupt entries and duplicate names', () => {
    const parsed = parseNamedWorkspaceFile({ version: 1, workspaces: [saved, { ...saved, id: 'workspace-2', name: '調査用' }, { name: 'broken' }] });
    expect(parsed.workspaces).toHaveLength(1);
  });

  it('returns an empty versioned file for corrupt input', () => {
    expect(parseNamedWorkspaceFile({ version: 99, workspaces: [saved] })).toEqual({ version: 1, workspaces: [] });
  });

  it('summarizes included AI services without duplicates', () => {
    const parsed = parseNamedWorkspaceFile({ version: 1, workspaces: [saved] });
    expect(summarizeNamedWorkspaces(parsed.workspaces)[0]).toMatchObject({
      viewCount: 2,
      serviceIds: ['chatgpt', 'claude'],
    });
  });

  it('rejects empty and overly long names', () => {
    expect(() => normalizeWorkspaceName('   ')).toThrow('ワークスペース名');
    expect(() => normalizeWorkspaceName('a'.repeat(61))).toThrow('60文字以内');
  });
});
