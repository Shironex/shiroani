import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { modelUrl } from '../src/components/island/manifest.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const island = readFileSync(resolve(__dirname, '../src/components/island/Island.astro'), 'utf8');

// The host caches public/island for a week. A GLB swapped under the same name
// kept loading its old copy against new placements (Shiro-chan sank into the
// bench), so every model URL carries a hash of the file's bytes.
describe('island model URLs', () => {
  it('carry the version they are given', () => {
    assert.equal(modelUrl('character', 'abc123'), '/island/models/character.glb?v=abc123');
    assert.notEqual(modelUrl('character', 'a'), modelUrl('character', 'b'));
  });

  it('are versioned by a hash of each file on the page', () => {
    assert.match(island, /createHash\('sha256'\)\.update\(bytes\)/);
    assert.match(island, /modelUrl\(id, /);
  });
});
