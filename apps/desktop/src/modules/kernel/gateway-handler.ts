import type { ZodType } from 'zod';
import type { Logger } from '@shiroani/shared';
import { extractErrorMessage } from '@shiroani/shared';

/**
 * Shared utility for backend request handlers that follow the common pattern:
 *   1. Log the action
 *   2. (Optional) Validate the incoming payload against a Zod schema
 *   3. Execute the handler logic
 *   4. Return a default result with error on validation failure or caught exception
 *
 * Eliminates boilerplate per handler across domains.
 *
 * `TDefault` is the type of the fallback result (returned on error with an
 * error message). `TResult` is the type the handler returns on success (may
 * differ from `TDefault`). When a `schema` is supplied, `TPayload` is the
 * parsed payload type inferred from it.
 */

// Overload 1: with schema validation — handler receives the parsed payload.
// (Listed first so TS resolution picks it up when `schema` is present — it
// must be matched before the schema-less overload, whose `handler: () => ...`
// would otherwise structurally match a `(parsed) => ...` arrow with `any`.)
export function handleGatewayRequest<TDefault, TResult, TPayload>(options: {
  logger: Logger;
  action: string;
  /** Default result returned (with error appended) on validation failure or caught exception. */
  defaultResult: TDefault;
  schema: ZodType<TPayload>;
  payload: unknown;
  handler: (parsed: TPayload) => Promise<TResult>;
}): Promise<TResult | (TDefault & { error: string })>;

// Overload 2: no schema — existing call sites continue to work unchanged.
export function handleGatewayRequest<TDefault, TResult = TDefault>(options: {
  logger: Logger;
  action: string;
  /** Default result returned (with error appended) on caught exception. */
  defaultResult: TDefault;
  handler: () => Promise<TResult>;
}): Promise<TResult | (TDefault & { error: string })>;

// Implementation signature.
export async function handleGatewayRequest<TDefault, TResult, TPayload>(
  options:
    | {
        logger: Logger;
        action: string;
        defaultResult: TDefault;
        handler: () => Promise<TResult>;
      }
    | {
        logger: Logger;
        action: string;
        defaultResult: TDefault;
        schema: ZodType<TPayload>;
        payload: unknown;
        handler: (parsed: TPayload) => Promise<TResult>;
      }
): Promise<TResult | (TDefault & { error: string })> {
  const { logger, action, defaultResult } = options;
  logger.info(`${action}`);

  try {
    if ('schema' in options) {
      const result = options.schema.safeParse(options.payload);
      if (!result.success) {
        const message = result.error.issues
          .map(issue => {
            const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
            return `${path}: ${issue.message}`;
          })
          .join('; ');
        // Validation failures are expected client errors, not server faults — warn, don't error.
        logger.warn(`Validation failed for ${action}: ${message}`);
        return { ...defaultResult, error: message };
      }
      return await options.handler(result.data);
    }

    return await options.handler();
  } catch (error) {
    const message = extractErrorMessage(error, 'Unknown error');
    logger.error(`Error ${action}:`, error);
    return { ...defaultResult, error: message };
  }
}
