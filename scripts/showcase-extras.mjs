#!/usr/bin/env node
/**
 * Language-aware extras on top of `showcase all`:
 *
 *   node scripts/showcase-extras.mjs            render assets/showcase/hero.<lang>.webp for every language
 *   node scripts/showcase-extras.mjs readme pl  print the README screenshot table for one language
 *
 * The kit renders one hero per run and keeps a single caption per shot, so
 * this script re-runs both per language with the captions and tagline from
 * LOCALIZED in showcase.config.mjs.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { hero, loadConfig, readmeSnippet } from '@noctcore/showcase-kit';

const configPath = resolve(import.meta.dirname, '..', 'showcase.config.mjs');
const { LOCALIZED = {} } = await import(pathToFileURL(configPath).href);
const base = await loadConfig(configPath);

function localized(lang) {
  const copy = LOCALIZED[lang];
  if (!copy) return base;
  const shots = base.shots.map(shot => {
    const text = copy.shots?.[shot.id];
    if (!text) return shot;
    return { ...shot, ...text, alt: `${base.name}: ${text.title}` };
  });
  return {
    ...base,
    shots,
    hero: { ...base.hero, lang, tagline: copy.tagline ?? base.hero.tagline },
  };
}

const [command, lang] = process.argv.slice(2);

if (command === 'readme') {
  const target = lang ?? base.langs[0];
  process.stdout.write(
    `${readmeSnippet(localized(target), { lang: target, cols: 2, base: '.' })}\n`
  );
} else if (command === undefined) {
  for (const code of base.langs) {
    const config = localized(code);
    await hero({ ...config, hero: { ...config.hero, lang: code } });
  }
} else {
  console.error(`Unknown command "${command}". Use no argument, or: readme <lang>`);
  process.exit(1);
}
