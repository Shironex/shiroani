# lint:meta rule catalog

Run `pnpm lint:meta --list-rules` for the machine-readable list from the registry.

## Adding a rule

1. Pick a category folder under `tools/lint-meta/rules/`.
2. Export an `IMetaRule` object with `id`, `category`, `description`, and `run(ctx)`.
3. Register it in `tools/lint-meta/registry.ts`.
4. Run `pnpm generate:lint-meta-docs` to refresh this file.

## Rules

| Rule ID                           | Category    | CI-critical | What it guards                                                                                 |
| --------------------------------- | ----------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `eslint-config-no-warn`           | config      | no          | ESLint severities must be "error" or "off", not "warn".                                        |
| `eslint-override-paths-exist`     | config      | no          | Literal file paths in eslint.config.\* overrides must exist on disk.                           |
| `env-cascade-drift`               | config      | no          | Joi env-schema keys must be documented in .env.example.                                        |
| `no-inline-lint-disable`          | source-text | no          | Source files must not contain inline eslint-disable directives.                                |
| `no-ts-ignore`                    | source-text | no          | Source files must not contain @ts-ignore / @ts-expect-error suppressions.                      |
| `skipped-tests-need-tracking`     | testing     | no          | Skipped tests (.skip/.fixme/xit/xdescribe) must carry an issue URL or TODO(@owner).            |
| `routes-require-test-sibling`     | testing     | **yes**     | nestjs-trpc _.router.ts files must have a co-located _.router.spec.ts.                         |
| `github-actions-permissions`      | ci          | no          | GitHub Actions workflows must declare a top-level permissions block.                           |
| `github-actions-timeout-required` | ci          | no          | GitHub Actions jobs must declare an explicit timeout-minutes (reusable-workflow calls exempt). |
| `launch-path-parity`              | ci          | **yes**     | apps/api launch path (package.json/Dockerfile/CI) must match the emitted entrypoint.           |
| `pre-push-ci-parity`              | ci          | **yes**     | pre-push manifest commands must appear verbatim in the mirrored CI workflow.                   |
