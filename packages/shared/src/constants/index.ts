// Public app constants. Symbols that are only consumed inside `packages/shared`
// (e.g. GitHub repo owner/name fragments, logger ring-buffer clamps) are NOT
// re-exported here — they stay reachable via relative imports within the package
// but are kept out of the cross-app `@shiroani/shared` surface.
export {
  APP_NAME,
  LOCALHOST,
  VITE_DEV_PORT,
  GITHUB_RELEASES_URL,
  GITHUB_RELEASES_API_URL,
  DISCORD_INVITE_URL,
  LANDING_URL,
  NEW_TAB_URL,
  isNewTabUrl,
  ADBLOCK_WHITELIST_MAX_ENTRIES,
  LOG_FILE_PREFIX,
  LOG_MAX_FILE_SIZE,
  LOG_MAX_AGE_MS,
  LOG_MAX_TOTAL_DIR_BYTES,
  LOG_FLUSH_INTERVAL_MS,
  LOG_BUFFER_MAX_ENTRIES,
  LOG_CLEANUP_INTERVAL_MS,
  LOG_REDACT_KEYS,
  LOG_REDACT_PLACEHOLDER,
} from './app';
export * from './anilist';
export * from './discord';
export * from './events';
export * from './genres';
export * from './discover-filters';
