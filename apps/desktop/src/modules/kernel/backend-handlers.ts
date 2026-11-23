import type { BackendRequestChannel, BackendWire } from '@shiroani/shared';
import { BackendEvents } from '@shiroani/shared';

/**
 * Every request channel mapped to its handler, so a channel with no handler is a
 * compile error. Handlers validate their own payload, and report domain errors in
 * the response envelope instead of throwing.
 */
export type BackendHandlers = {
  [C in BackendRequestChannel]: (payload: unknown) => Promise<BackendWire<C>>;
};

export function createSystemHandlers(): Pick<BackendHandlers, typeof BackendEvents.PING> {
  return {
    [BackendEvents.PING]: async () => ({ ok: true }),
  };
}
