/**
 * Sandboxed preloads can only require `electron`. A bare import of anything else
 * (zod through the `@shiroani/shared` root, for one) makes the preload throw at
 * load, and the whole `electronAPI` silently disappears from the renderer.
 *
 * @param {import('esbuild').Metafile} metafile
 * @param {string[]} preloadOutputs metafile output paths of the preload bundles
 */
export function assertPreloadImports(metafile, preloadOutputs) {
  const problems = [];
  for (const path of preloadOutputs) {
    const output = metafile.outputs[path];
    if (!output) {
      problems.push(`${path}: not found in build output`);
      continue;
    }
    for (const entry of output.imports) {
      if (entry.external && entry.path !== 'electron') {
        problems.push(`${path}: requires "${entry.path}"`);
      }
    }
  }
  if (problems.length > 0) {
    throw new Error(
      `Sandboxed preload may only import electron. Use import type, or the ` +
        `@shiroani/shared/backend-channels subpath.\n  ${problems.join('\n  ')}`
    );
  }
}
