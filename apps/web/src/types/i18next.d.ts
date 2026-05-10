/**
 * Module augmentation for i18next so renderer `t()` calls are typed against
 * the actual Polish dictionaries. Resources are keyed off the PL JSONs because
 * those are the source-of-truth dictionaries — EN is a port, and tooling
 * (`pnpm check:locales`) keeps the two in lockstep.
 *
 * Plural buckets in our JSONs use the legacy nested-object form
 * (`entries: { one, few, many, other }`) instead of i18next v4's suffix form
 * (`entries_one`, `entries_few`, …). The runtime resolves both via
 * `ignoreJSONStructure`, but the v4 typescript layer only narrows plural keys
 * for the suffix form. `FlattenPlurals` collapses every plural-bucket object
 * to a single string at the type level so `t('logs.entries', { count })`
 * resolves to `string` instead of an object.
 */

import 'i18next';

import type anilist from '@/locales/pl/anilist.json';
import type browser from '@/locales/pl/browser.json';
import type changelog from '@/locales/pl/changelog.json';
import type common from '@/locales/pl/common.json';
import type diary from '@/locales/pl/diary.json';
import type discover from '@/locales/pl/discover.json';
import type errorBoundary from '@/locales/pl/errorBoundary.json';
import type feed from '@/locales/pl/feed.json';
import type library from '@/locales/pl/library.json';
import type nav from '@/locales/pl/nav.json';
import type onboarding from '@/locales/pl/onboarding.json';
import type profile from '@/locales/pl/profile.json';
import type schedule from '@/locales/pl/schedule.json';
import type settings from '@/locales/pl/settings.json';
import type splash from '@/locales/pl/splash.json';
import type status from '@/locales/pl/status.json';

type PluralSuffix = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

type IsPluralBucket<T> =
  T extends Record<string, string>
    ? keyof T extends PluralSuffix
      ? 'other' extends keyof T
        ? true
        : false
      : false
    : false;

type FlattenPlurals<T> = T extends string
  ? T
  : T extends readonly unknown[]
    ? T
    : T extends object
      ? IsPluralBucket<T> extends true
        ? string
        : { [K in keyof T]: FlattenPlurals<T[K]> }
      : T;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    nsSeparator: ':';
    keySeparator: '.';
    returnNull: false;
    returnEmptyString: false;
    allowObjectInHTMLChildren: false;
    resources: {
      anilist: FlattenPlurals<typeof anilist>;
      browser: FlattenPlurals<typeof browser>;
      changelog: FlattenPlurals<typeof changelog>;
      common: FlattenPlurals<typeof common>;
      diary: FlattenPlurals<typeof diary>;
      discover: FlattenPlurals<typeof discover>;
      errorBoundary: FlattenPlurals<typeof errorBoundary>;
      feed: FlattenPlurals<typeof feed>;
      library: FlattenPlurals<typeof library>;
      nav: FlattenPlurals<typeof nav>;
      onboarding: FlattenPlurals<typeof onboarding>;
      profile: FlattenPlurals<typeof profile>;
      schedule: FlattenPlurals<typeof schedule>;
      settings: FlattenPlurals<typeof settings>;
      splash: FlattenPlurals<typeof splash>;
      status: FlattenPlurals<typeof status>;
    };
  }
}
