jest.mock('electron');
jest.mock('../../logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// In-memory shim for the persisted settings the real `store` module (backed
// by electron-store) isn't safe to import in unit tests.
const storeState: Record<string, unknown> = {};
jest.mock('../../store', () => ({
  store: {
    get: jest.fn((key: string) => storeState[key]),
    set: jest.fn((key: string, value: unknown) => {
      storeState[key] = value;
    }),
    delete: jest.fn((key: string) => {
      delete storeState[key];
    }),
  },
}));

import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { app } from 'electron';
import {
  getMascotSpritesDir,
  getDefaultSpritePath,
  getActiveSpritePath,
  setCustomSpriteFileName,
  resolveSpritePath,
} from '../overlay-state';

describe('resolveSpritePath', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'shiroani-overlay-state-test-'));
    (app.getPath as jest.Mock).mockImplementation(() => tmpDir);
    Object.keys(storeState).forEach(k => delete storeState[k]);
  });

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  });

  // The stored name is renderer-writable. On every host the guard must reject
  // it by shape alone, since `path.join`/`path.resolve` treat a backslash as
  // an ordinary character on POSIX: a Windows drive-absolute or UNC name
  // never leaves the sprites folder through `resolve()` + `sep` containment
  // on macOS/Linux, so the shape check is the only thing that catches it here.
  it.each([
    ['a Windows drive-absolute name', 'C:\\x.png'],
    ['a UNC path', '\\\\srv\\share\\x.png'],
    ['a POSIX absolute path', '/abs/x.png'],
    ['a parent-relative name with a backslash', '..\\x.png'],
    ['a parent-relative name with a forward slash', '../x.png'],
    ['a nested traversal name', '../../etc/passwd'],
    ['a NUL byte', 'x.png\0.txt'],
    ['an empty name', ''],
  ])('rejects %s: %s', (_label, name) => {
    expect(resolveSpritePath(name)).toBeNull();
  });

  it('rejects a disallowed extension', () => {
    expect(resolveSpritePath('sprite-abc123.txt')).toBeNull();
  });

  it('resolves a legitimate stored name inside the sprites folder', () => {
    const resolved = resolveSpritePath('sprite-abc123.png');
    expect(resolved).toBe(join(getMascotSpritesDir(), 'sprite-abc123.png'));
  });
});

describe('getActiveSpritePath', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'shiroani-overlay-state-test-'));
    (app.getPath as jest.Mock).mockImplementation(() => tmpDir);
    Object.keys(storeState).forEach(k => delete storeState[k]);
  });

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns the bundled default when no custom sprite is stored', () => {
    expect(getActiveSpritePath()).toBe(getDefaultSpritePath());
  });

  it('returns the resolved path for a valid stored sprite that exists on disk', () => {
    const spritesDir = getMascotSpritesDir();
    mkdirSync(spritesDir, { recursive: true });
    writeFileSync(join(spritesDir, 'sprite-real.png'), 'x');
    setCustomSpriteFileName('sprite-real.png');

    expect(getActiveSpritePath()).toBe(join(spritesDir, 'sprite-real.png'));
  });

  it('falls back to the default when the stored name is missing on disk', () => {
    setCustomSpriteFileName('sprite-missing.png');
    expect(getActiveSpritePath()).toBe(getDefaultSpritePath());
  });

  // The traversal target exists on disk (outside the sprites folder) so a
  // regression that drops the guard would return it instead of falling back.
  it('falls back to the default for a traversal name, even when the target file exists', () => {
    mkdirSync(getMascotSpritesDir(), { recursive: true });
    writeFileSync(join(tmpDir, 'outside.png'), 'secret');
    setCustomSpriteFileName('../outside.png');

    expect(getActiveSpritePath()).toBe(getDefaultSpritePath());
  });
});
