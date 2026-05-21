import fs from 'node:fs/promises';
import path from 'node:path';
import { ipcMain, app } from 'electron';
import { createMainLogger } from '../logging/logger';
import { handle } from './with-ipc-handler';
import { fileWriteJsonSchema, fileReadJsonSchema } from './schemas';

const logger = createMainLogger('IPC:File');

/**
 * Allowed base directories for JSON file read/write operations.
 * Restricts filesystem access to prevent path traversal attacks.
 */
function getAllowedDirectories(): string[] {
  return [
    app.getPath('userData'),
    app.getPath('documents'),
    app.getPath('downloads'),
    app.getPath('desktop'),
  ];
}

/**
 * Security: Validate that the file path ends with .json and resides
 * within one of the allowed directories.
 */
function validateJsonPath(filePath: unknown): asserts filePath is string {
  if (typeof filePath !== 'string' || filePath.trim().length === 0) {
    throw new Error('Invalid file path: must be a non-empty string');
  }

  if (path.extname(filePath).toLowerCase() !== '.json') {
    throw new Error('Invalid file path: must end in .json');
  }

  const resolved = path.resolve(filePath);
  const allowed = getAllowedDirectories();

  const isAllowed = allowed.some(dir => resolved.startsWith(dir + path.sep) || resolved === dir);
  if (!isAllowed) {
    logger.warn(`[security] Blocked file access outside allowed directories: ${resolved}`);
    throw new Error('Invalid file path: outside allowed directories');
  }
}

/**
 * Register file IPC handlers
 */
export function registerFileHandlers(): void {
  handle(
    'file:write-json',
    async (_event, filePath, jsonString) => {
      validateJsonPath(filePath);
      await fs.writeFile(filePath, jsonString, 'utf-8');
      return { success: true };
    },
    { schema: fileWriteJsonSchema }
  );

  handle(
    'file:read-json',
    async (_event, filePath) => {
      validateJsonPath(filePath);
      return await fs.readFile(filePath, 'utf-8');
    },
    { schema: fileReadJsonSchema }
  );
}

/**
 * Clean up file IPC handlers
 */
export function cleanupFileHandlers(): void {
  ipcMain.removeHandler('file:write-json');
  ipcMain.removeHandler('file:read-json');
}
