/*
 * Categories trimmed to what this monorepo actually uses across Phase 1 + 2.
 * BoringStack's Drizzle/Elysia-specific categories are intentionally dropped.
 */
export type MetaRuleCategory = 'config' | 'source-text' | 'supply-chain' | 'ci' | 'testing';

export interface IViolation {
  readonly file: string;
  readonly rule: string;
  readonly message: string;
}

export interface IMetaContext {
  readonly root: string;
  readonly sourceFiles: readonly string[];
  readonly workflowFiles: readonly string[];
}

export interface IMetaRule {
  readonly id: string;
  readonly category: MetaRuleCategory;
  readonly description: string;
  readonly ciCritical?: boolean;
  // A rule provides `run` (sync), `runAsync` (async), or both. Both passes run
  // on every `pnpm lint:meta` invocation; a rule that needs ESLint's resolved
  // config (eslint-config-no-warn) is async-only.
  run?: (ctx: IMetaContext) => IViolation[];
  runAsync?: (ctx: IMetaContext) => Promise<IViolation[]>;
}
