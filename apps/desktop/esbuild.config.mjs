import { build } from 'esbuild';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { esbuildDecorators } from '@anatine/esbuild-decorators';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// Load apps/desktop/.env (if present) so the `define` block below can bake the
// PUBLIC client IDs (ANILIST_CLIENT_ID, MAL_CLIENT_ID) during local `pnpm dev`.
// CI / packaged builds supply them from the real build env, so a missing .env is
// fine. `process.loadEnvFile` is built into Node 20.12+/22 — no dotenv dependency.
// Resolved relative to this file so it works regardless of the invoking cwd.
const envPath = join(import.meta.dirname, '.env');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

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
  //
  // The MAL OAuth client ID is likewise PUBLIC and baked the same way. The MAL
  // client SECRET is deliberately NOT baked — it is read from process.env at
  // runtime only (auth-code + PKCE works without it for a public client), so a
  // confidential credential never ships inside the distributable bundle.
  define: {
    'process.env.ANILIST_CLIENT_ID': JSON.stringify(process.env.ANILIST_CLIENT_ID ?? ''),
    'process.env.MAL_CLIENT_ID': JSON.stringify(process.env.MAL_CLIENT_ID ?? ''),
  },
  plugins: [
    esbuildDecorators({
      tsconfig: './tsconfig.build.json',
    }),
  ],
  logLevel: 'info',
});
