import { rmSync } from 'node:fs';
import { URL } from 'node:url';

for (const directory of ['dist-electron', 'dist-renderer']) {
  rmSync(new URL(`../${directory}`, import.meta.url), { force: true, recursive: true });
}
