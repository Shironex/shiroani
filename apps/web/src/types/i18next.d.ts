/**
 * Module augmentation for i18next so renderer `t()` calls are typed against
 * the actual Polish dictionaries. Resources are keyed off the PL JSONs because
 * those are the source-of-truth dictionaries — EN is a port, and tooling
 * (`pnpm check:locales`) keeps the two in lockstep.
 */

import 'i18next';

import type accounts from '@/locales/pl/accounts.json';
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
import type social from '@/locales/pl/social.json';
import type splash from '@/locales/pl/splash.json';
import type status from '@/locales/pl/status.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    nsSeparator: ':';
    keySeparator: '.';
    returnNull: false;
    returnEmptyString: false;
    allowObjectInHTMLChildren: false;
    resources: {
      accounts: typeof accounts;
      anilist: typeof anilist;
      browser: typeof browser;
      changelog: typeof changelog;
      common: typeof common;
      diary: typeof diary;
      discover: typeof discover;
      errorBoundary: typeof errorBoundary;
      feed: typeof feed;
      library: typeof library;
      nav: typeof nav;
      onboarding: typeof onboarding;
      profile: typeof profile;
      schedule: typeof schedule;
      settings: typeof settings;
      social: typeof social;
      splash: typeof splash;
      status: typeof status;
    };
  }
}
