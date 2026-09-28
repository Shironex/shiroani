import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const setPath = jest.fn();

jest.mock('electron', () => ({
  app: { setPath: (...args: unknown[]) => setPath(...args) },
}));

import { applyUserDataOverride } from '../user-data-override';

describe('applyUserDataOverride', () => {
  beforeEach(() => {
    setPath.mockClear();
  });

  it('does nothing when ELECTRON_USER_DATA_DIR is unset or blank', () => {
    expect(applyUserDataOverride({})).toBeNull();
    expect(applyUserDataOverride({ ELECTRON_USER_DATA_DIR: '   ' })).toBeNull();
    expect(setPath).not.toHaveBeenCalled();
  });

  it('creates the directory and points userData at its absolute path', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'shiroani-userdata-'));
    const target = path.join(base, 'nested', 'profile');

    const result = applyUserDataOverride({ ELECTRON_USER_DATA_DIR: target });

    expect(result).toBe(path.resolve(target));
    expect(fs.existsSync(target)).toBe(true);
    expect(setPath).toHaveBeenCalledWith('userData', path.resolve(target));
    fs.rmSync(base, { recursive: true, force: true });
  });
});

describe('main/index.ts import order', () => {
  it('imports user-data-override before any other module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'index.ts'), 'utf8');
    const firstImport = source.match(/^import\s+[^;]*?['"]([^'"]+)['"];?/m);

    // store.ts and the logger read userData while their modules load, so any
    // import ahead of the override would write to the real profile.
    expect(firstImport?.[1]).toBe('./user-data-override');
  });
});
