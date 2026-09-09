import { readFile, writeFile } from 'node:fs/promises';
import { parseNamedWorkspaceFile, type NamedWorkspaceFile } from '../shared/named-workspaces';

export const readNamedWorkspaceFile = async (filePath: string): Promise<NamedWorkspaceFile> => {
  try {
    return parseNamedWorkspaceFile(JSON.parse(await readFile(filePath, 'utf8')));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) {
      return parseNamedWorkspaceFile(undefined);
    }
    throw error;
  }
};

export const writeNamedWorkspaceFile = async (
  filePath: string,
  file: NamedWorkspaceFile,
): Promise<void> => {
  await writeFile(filePath, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
};
