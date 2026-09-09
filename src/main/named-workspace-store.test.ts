import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readNamedWorkspaceFile } from './named-workspace-store';

let testDirectory: string | undefined;

afterEach(async () => {
  if (testDirectory) await rm(testDirectory, { recursive: true, force: true });
  testDirectory = undefined;
});

describe('named workspace store', () => {
  it('starts with an empty list when the JSON file is corrupt', async () => {
    testDirectory = await mkdtemp(path.join(tmpdir(), 'multi-ai-named-workspaces-'));
    const filePath = path.join(testDirectory, 'named-workspaces.json');
    await writeFile(filePath, '{ invalid json', 'utf8');
    await expect(readNamedWorkspaceFile(filePath)).resolves.toEqual({ version: 1, workspaces: [] });
  });
});
