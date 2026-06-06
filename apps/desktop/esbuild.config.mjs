import { build } from 'esbuild';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { esbuildDecorators } from '@anatine/esbuild-decorators';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// Clean dist/main/ before bundling to prevent stale artifact accumulation
const outdir = 'dist/main';
if (existsSync(outdir)) {
  rmSync(outdir, { recursive: true });
}
mkdirSync(outdir, { recursive: true });

// Externalize all npm dependencies — they're bundled by electron-builder at
// package time via node_modules.  Workspace packages are kept bundled (tiny)
// to avoid workspace-protocol resolution issues in production builds.
const external = [
  'electron',
  ...Object.keys(pkg.dependencies ?? {}).filter(
    (d) => !d.startsWith('@shiroani/')
  ),
];

await build({
  entryPoints: [
    'src/main/index.ts',
    'src/main/preload.ts',
    'src/main/menu-preload.ts',
  ],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outdir: 'dist/main',
  sourcemap: true,
  external,
  // The AniList OAuth client ID is PUBLIC (no secret in implicit grant) and is
  // read via `process.env.ANILIST_CLIENT_ID` at runtime. A packaged app has no
  // such env var on the user's machine, so bake the build-time value into the
  // bundle here. In CI it comes from the ANILIST_CLIENT_ID build env; locally it
  // comes from the shell that runs `pnpm dev` (esbuild and electron share it).
  define: {
    'process.env.ANILIST_CLIENT_ID': JSON.stringify(process.env.ANILIST_CLIENT_ID ?? ''),
  },
  plugins: [
    esbuildDecorators({
      tsconfig: './tsconfig.build.json',
    }),
  ],
  logLevel: 'info',
});
