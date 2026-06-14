/*
 * Minimal ambient surface for the one micromatch helper the env-access rules
 * use. Avoids pulling @types/micromatch (and its transitive @types/braces)
 * into this internal plugin for a single function.
 */
declare module 'micromatch' {
  interface MicromatchOptions {
    readonly dot?: boolean;
  }

  function isMatch(
    str: string,
    patterns: string | readonly string[],
    options?: MicromatchOptions
  ): boolean;

  const micromatch: { isMatch: typeof isMatch };

  export { isMatch };
  export default micromatch;
}
