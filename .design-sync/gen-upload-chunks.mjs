import fs from 'node:fs';
import path from 'node:path';
const root = 'ds-bundle';
const out = [];
function walk(d) {
  for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) {
    const rel = d ? d + '/' + e.name : e.name;
    if (e.isDirectory()) {
      if (['_screenshots', '_sb', '.sb-static'].includes(e.name)) continue;
      walk(rel);
    } else {
      const base = path.basename(rel);
      if (base.startsWith('.')) continue;
      if (rel === '_ds_sync.json' || rel === '_ds_needs_recompile') continue;
      out.push(rel.split(path.sep).join('/'));
    }
  }
}
walk('');
const fonts = out.filter(p => p.startsWith('fonts/') && /\.woff2?$/.test(p));
const rest = out.filter(p => !(p.startsWith('fonts/') && /\.woff2?$/.test(p)));
const chunks = [];
for (let i = 0; i < rest.length; i += 220) chunks.push(rest.slice(i, i + 220));
if (fonts.length) chunks.push(fonts);
fs.mkdirSync('.design-sync/.upload', { recursive: true });
chunks.forEach((c, i) =>
  fs.writeFileSync(
    '.design-sync/.upload/chunk' + i + '.json',
    JSON.stringify(c.map(p => ({ path: p, localPath: p })))
  )
);
console.log(
  'total files:',
  out.length,
  '| chunks:',
  chunks.length,
  '| sizes:',
  chunks.map(c => c.length).join(',')
);
