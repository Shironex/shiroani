import { readdir, stat } from 'fs/promises';
import { join } from 'path';

/**
 * Total size in bytes of the regular files directly inside `dir`. A missing
 * folder counts as empty, and so does a file removed while it is measured.
 */
export async function folderSizeBytes(dir: string): Promise<number> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return 0;
    throw err;
  }

  let total = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    try {
      total += (await stat(join(dir, entry.name))).size;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }
  return total;
}

/** Tail of the pending quota-checked writes, per folder. */
const folderQueues = new Map<string, Promise<void>>();

/**
 * Run `write` only when the folder stays within `maxBytes` after adding
 * `incomingBytes`, and resolve to `null` otherwise (nothing is deleted to make
 * room). Calls for the same folder run one after another, so a burst of
 * parallel IPC calls cannot all pass the check before any of them has written.
 */
export async function writeWithinFolderQuota<T>(
  dir: string,
  maxBytes: number,
  incomingBytes: number,
  write: () => Promise<T>
): Promise<T | null> {
  const previous = folderQueues.get(dir) ?? Promise.resolve();
  let release!: () => void;
  const done = new Promise<void>(resolve => (release = resolve));
  const tail = previous.then(() => done);
  folderQueues.set(dir, tail);

  await previous;
  try {
    if ((await folderSizeBytes(dir)) + incomingBytes > maxBytes) return null;
    return await write();
  } finally {
    release();
    if (folderQueues.get(dir) === tail) folderQueues.delete(dir);
  }
}
