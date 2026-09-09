import { readFile, writeFile } from 'node:fs/promises';
import { parseWorkspaceSnapshot, type WorkspaceSnapshot } from '../shared/workspace';

export const readWorkspaceSnapshot = async (
  filePath: string,
  fallbackUrls: readonly string[],
): Promise<WorkspaceSnapshot> => {
  try {
    return parseWorkspaceSnapshot(JSON.parse(await readFile(filePath, 'utf8')), fallbackUrls);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) {
      return parseWorkspaceSnapshot(undefined, fallbackUrls);
    }
    throw error;
  }
};

export const writeWorkspaceSnapshot = async (
  filePath: string,
  snapshot: WorkspaceSnapshot,
): Promise<void> => {
  await writeFile(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
};
