/**
 * Stands in for `socket.io-client` in the showcase build (aliased in
 * vite.config.ts). Requests are answered from the fixtures in memory; no
 * network connection is ever opened.
 */
import { respond } from './fixtures/responses';

type Listener = (...args: unknown[]) => void;

declare global {
  interface Window {
    /** Socket requests the fixtures did not answer, for the capture to report. */
    __showcaseUnhandled?: string[];
  }
}

class Emitter {
  private readonly listeners = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener): this {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return this;
  }

  off(event?: string, listener?: Listener): this {
    if (event === undefined) this.listeners.clear();
    else if (listener === undefined) this.listeners.delete(event);
    else this.listeners.get(event)?.delete(listener);
    return this;
  }

  protected dispatch(event: string, ...args: unknown[]): void {
    for (const listener of [...(this.listeners.get(event) ?? [])]) listener(...args);
  }
}

class Manager extends Emitter {}

export class Socket extends Emitter {
  connected = false;
  disconnected = true;
  recovered = false;
  readonly io = new Manager();

  connect(): this {
    setTimeout(() => {
      this.connected = true;
      this.disconnected = false;
      this.dispatch('connect');
    }, 0);
    return this;
  }

  open(): this {
    return this.connect();
  }

  disconnect(): this {
    this.connected = false;
    this.disconnected = true;
    return this;
  }

  close(): this {
    return this.disconnect();
  }

  emit(event: string, ...args: unknown[]): this {
    const last = args[args.length - 1];
    const ack = typeof last === 'function' ? (last as (response: unknown) => void) : undefined;
    const payload = args[0] === ack ? undefined : args[0];
    const reply = respond(event, payload);
    if (!reply) {
      const unhandled = (window.__showcaseUnhandled ??= []);
      if (!unhandled.includes(event)) unhandled.push(event);
      console.warn(`[showcase] no fixture for socket event "${event}"`);
      return this;
    }
    setTimeout(() => {
      ack?.(reply.ack);
      for (const [name, data] of reply.broadcasts ?? []) this.dispatch(name, data);
    }, 0);
    return this;
  }
}

export function io(): Socket {
  return new Socket();
}

export default io;
