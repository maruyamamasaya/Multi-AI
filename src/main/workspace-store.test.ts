import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readWorkspaceSnapshot, writeWorkspaceSnapshot } from './workspace-store';

const fallback = ['https://example.com/'];
const temporaryDirectories: string[] = [];

const temporaryWorkspaceFile = async (): Promise<string> => {
  const directory = await mkdtemp(path.join(tmpdir(), 'multi-ai-workspace-'));
  temporaryDirectories.push(directory);
  return path.join(directory, 'workspace.json');
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe('workspace store', () => {
  it('starts with one safe view when the file does not exist', async () => {
    const file = await temporaryWorkspaceFile();
    await expect(readWorkspaceSnapshot(file, fallback)).resolves.toEqual({
      viewCount: 1,
      urls: fallback,
      serviceIds: [null],
      visibleIndices: [0],
      selectedIndex: 0,
      layout: 'single',
      zoomPercent: 80,
    });
  });

  it('starts with one safe view when the file is malformed', async () => {
    const file = await temporaryWorkspaceFile();
    await writeFile(file, '{broken', 'utf8');
    await expect(readWorkspaceSnapshot(file, fallback)).resolves.toEqual({
      viewCount: 1,
      urls: fallback,
      serviceIds: [null],
      visibleIndices: [0],
      selectedIndex: 0,
      layout: 'single',
      zoomPercent: 80,
    });
  });

  it('writes the complete workspace snapshot', async () => {
    const file = await temporaryWorkspaceFile();
    const snapshot = {
      viewCount: 2,
      urls: ['https://example.com/', 'https://example.org/'],
      serviceIds: [null, null],
      visibleIndices: [0, 1],
      selectedIndex: 1,
      layout: 'columns' as const,
      zoomPercent: 90,
    };
    await writeWorkspaceSnapshot(file, snapshot);
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(snapshot);
  });
});
