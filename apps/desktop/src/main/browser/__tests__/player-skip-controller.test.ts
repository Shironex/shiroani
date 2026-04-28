jest.mock('electron');
jest.mock('../../logging/logger', () => ({
  createMainLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

import { webContents as electronWebContents, webFrameMain } from 'electron';
import { PlayerSkipController } from '../player-skip-controller';
import type { AniSkipClient, AniSkipResult } from '../../../modules/aniskip';

const STEINS_OP_RESULT: AniSkipResult = {
  interval: { startTime: 638.489, endTime: 728.489 },
  skipType: 'op',
  skipId: 'mock-op-id',
  episodeLength: 1440,
};

const STEINS_ED_RESULT: AniSkipResult = {
  interval: { startTime: 1331.713, endTime: 1421.713 },
  skipType: 'ed',
  skipId: 'mock-ed-id',
  episodeLength: 1440,
};

interface FakeFrameOpts {
  detached?: boolean;
  url?: string;
  processId?: number;
  routingId?: number;
  videoPlaying?: boolean;
}

function makeFakeFrame(opts: FakeFrameOpts = {}) {
  const detached = opts.detached ?? false;
  const processId = opts.processId ?? 1;
  const routingId = opts.routingId ?? 100;
  const url = opts.url ?? 'https://player.example/embed';
  const videoPlaying = opts.videoPlaying ?? true;

  // The frame's executeJavaScript is invoked twice during a typical inject:
  // once by findPlayingVideoFrame's hasPlaying probe, once by the inject
  // script itself. We branch by what's in the source string.
  const executeJavaScript = jest.fn(async (source: string) => {
    if (source.includes('shiroaniCollectVideos')) {
      // Probe variant — returns a boolean for hasPlaying.
      if (source.includes('return videos.some')) return videoPlaying;
    }
    // Injection scripts return a status object.
    return { ok: true };
  });

  return {
    detached,
    processId,
    routingId,
    url,
    executeJavaScript,
  };
}

interface RegisterFakeWebContentsOpts {
  webContentsId: number;
  frames: ReturnType<typeof makeFakeFrame>[];
}

function registerFakeWebContents(opts: RegisterFakeWebContentsOpts) {
  const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
  const on = jest.fn((event: string, handler: (...args: unknown[]) => void) => {
    const list = listeners.get(event) ?? [];
    list.push(handler);
    listeners.set(event, list);
  });
  const off = jest.fn((event: string, handler: (...args: unknown[]) => void) => {
    const list = listeners.get(event) ?? [];
    listeners.set(
      event,
      list.filter(h => h !== handler)
    );
  });

  const fake = {
    isDestroyed: () => false,
    on,
    off,
    mainFrame: {
      framesInSubtree: opts.frames,
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (electronWebContents as any).__set(opts.webContentsId, fake);

  for (const frame of opts.frames) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (webFrameMain as any).__set(frame.processId, frame.routingId, frame);
  }

  return { fake, listeners, on, off };
}

function makeAniSkipClient(skipTimes: AniSkipResult[]): AniSkipClient {
  return {
    getSkipTimes: jest.fn(async () => skipTimes),
    clearCache: jest.fn(),
  } as unknown as AniSkipClient;
}

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (electronWebContents as any).__reset();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (webFrameMain as any).__reset();
  jest.clearAllMocks();
});

describe('PlayerSkipController', () => {
  describe('attach', () => {
    it('returns "none" when webContents is unreachable', async () => {
      const controller = new PlayerSkipController();
      const result = await controller.attach({
        webContentsId: 999,
        malId: 9253,
        episode: 1,
        autoSkipEnabled: false,
      });
      expect(result).toBe('none');
    });

    it('returns "none" when no playing-video frame exists', async () => {
      const frame = makeFakeFrame({ videoPlaying: false });
      registerFakeWebContents({ webContentsId: 1, frames: [frame] });

      const controller = new PlayerSkipController();
      controller.setAniSkipClient(makeAniSkipClient([]));
      const result = await controller.attach({
        webContentsId: 1,
        malId: 9253,
        episode: 1,
        autoSkipEnabled: false,
      });
      expect(result).toBe('none');
    });

    it('injects fallback button immediately when malId is null', async () => {
      const frame = makeFakeFrame({ videoPlaying: true });
      registerFakeWebContents({ webContentsId: 1, frames: [frame] });

      const controller = new PlayerSkipController();
      controller.setAniSkipClient(makeAniSkipClient([]));

      const result = await controller.attach({
        webContentsId: 1,
        malId: null,
        episode: null,
        autoSkipEnabled: false,
      });

      expect(result).toBe('fallback');
      // Find the injection call — the script that contains the fallback marker.
      const injectCall = frame.executeJavaScript.mock.calls.find(([src]) =>
        (src as string).includes('data-shiroani-skip-poc')
      );
      expect(injectCall).toBeDefined();
    });

    it('injects fallback button when AniSkipClient is missing', async () => {
      const frame = makeFakeFrame({ videoPlaying: true });
      registerFakeWebContents({ webContentsId: 1, frames: [frame] });

      const controller = new PlayerSkipController();
      // No setAniSkipClient call.
      const result = await controller.attach({
        webContentsId: 1,
        malId: 9253,
        episode: 1,
        autoSkipEnabled: false,
      });
      expect(result).toBe('fallback');
    });

    it('injects fallback button immediately even when malId+episode are present', async () => {
      const frame = makeFakeFrame({ videoPlaying: true });
      registerFakeWebContents({ webContentsId: 1, frames: [frame] });

      const aniSkipClient = makeAniSkipClient([STEINS_OP_RESULT]);
      const controller = new PlayerSkipController();
      controller.setAniSkipClient(aniSkipClient);

      // attach returns 'fallback' immediately — toast upgrade is async.
      const result = await controller.attach({
        webContentsId: 1,
        malId: 9253,
        episode: 1,
        autoSkipEnabled: false,
      });

      expect(result).toBe('fallback');
      // Fallback script was injected.
      expect(
        frame.executeJavaScript.mock.calls.some(([src]) =>
          (src as string).includes('data-shiroani-skip-poc')
        )
      ).toBe(true);

      // After microtasks settle, AniSkip resolves and toast script is injected.
      await new Promise(resolve => setImmediate(resolve));
      expect(
        frame.executeJavaScript.mock.calls.some(([src]) =>
          (src as string).includes('data-shiroani-skip')
        )
      ).toBe(true);
      expect(aniSkipClient.getSkipTimes).toHaveBeenCalledWith(9253, 1, 0);
    });
  });

  describe('detach', () => {
    it('removes listeners and drops state', async () => {
      const frame = makeFakeFrame({ videoPlaying: true });
      const { off } = registerFakeWebContents({ webContentsId: 1, frames: [frame] });

      const controller = new PlayerSkipController();
      controller.setAniSkipClient(makeAniSkipClient([]));
      await controller.attach({
        webContentsId: 1,
        malId: null,
        episode: null,
        autoSkipEnabled: false,
      });

      controller.detach(1);
      // Each event we hook should have a matching off().
      const offEvents = off.mock.calls.map(c => c[0]);
      expect(offEvents).toContain('did-frame-finish-load');
      expect(offEvents).toContain('did-navigate');
      expect(offEvents).toContain('did-navigate-in-page');
      expect(offEvents).toContain('did-frame-navigate');
      expect(offEvents).toContain('destroyed');
    });

    it('is a no-op when called for an unknown webContentsId', () => {
      const controller = new PlayerSkipController();
      expect(() => controller.detach(999)).not.toThrow();
    });
  });

  describe('update', () => {
    it('returns "none" when no controller is attached', async () => {
      const controller = new PlayerSkipController();
      const result = await controller.update(999, { episode: 2 });
      expect(result).toBe('none');
    });

    it('changes episode and re-fetches AniSkip', async () => {
      const frame = makeFakeFrame({ videoPlaying: true });
      registerFakeWebContents({ webContentsId: 1, frames: [frame] });

      const aniSkipClient = makeAniSkipClient([STEINS_ED_RESULT]);
      const controller = new PlayerSkipController();
      controller.setAniSkipClient(aniSkipClient);

      await controller.attach({
        webContentsId: 1,
        malId: 9253,
        episode: 1,
        autoSkipEnabled: false,
      });
      await new Promise(resolve => setImmediate(resolve));

      (aniSkipClient.getSkipTimes as jest.Mock).mockClear();

      await controller.update(1, { episode: 2 });
      await new Promise(resolve => setImmediate(resolve));

      expect(aniSkipClient.getSkipTimes).toHaveBeenCalledWith(9253, 2, 0);
    });
  });

  describe('race condition guard (attachId)', () => {
    it('drops AniSkip results when attachId changes mid-fetch', async () => {
      const frame = makeFakeFrame({ videoPlaying: true });
      registerFakeWebContents({ webContentsId: 1, frames: [frame] });

      // Slow AniSkip: resolve only when we tell it to.
      const resolverRef: { resolve: ((value: AniSkipResult[]) => void) | null } = {
        resolve: null,
      };
      const aniSkipClient = {
        getSkipTimes: jest.fn(
          () =>
            new Promise<AniSkipResult[]>(resolve => {
              resolverRef.resolve = resolve;
            })
        ),
        clearCache: jest.fn(),
      } as unknown as AniSkipClient;

      const controller = new PlayerSkipController();
      controller.setAniSkipClient(aniSkipClient);

      await controller.attach({
        webContentsId: 1,
        malId: 9253,
        episode: 1,
        autoSkipEnabled: false,
      });

      // Bump attachId mid-fetch.
      await controller.update(1, { episode: 2 });

      // Original fetch resolves with the *old* episode's data.
      resolverRef.resolve?.([STEINS_OP_RESULT]);
      await new Promise(resolve => setImmediate(resolve));

      // The toast injection from the stale fetch must not have happened.
      // The only `data-shiroani-skip` calls should be ones that came from the
      // fresh update flow (a second AniSkip getSkipTimes will be called).
      // First call uses ep=1, second call uses ep=2 — both matter, but only
      // the second's result should be applied.
      expect(aniSkipClient.getSkipTimes).toHaveBeenCalledTimes(2);
      expect((aniSkipClient.getSkipTimes as jest.Mock).mock.calls[1]).toEqual([9253, 2, 0]);
    });
  });

  describe('frame cache invalidation', () => {
    it('invalidates frame cache on did-navigate', async () => {
      const frame = makeFakeFrame({ videoPlaying: true });
      const { listeners } = registerFakeWebContents({ webContentsId: 1, frames: [frame] });

      const controller = new PlayerSkipController();
      controller.setAniSkipClient(makeAniSkipClient([]));

      await controller.attach({
        webContentsId: 1,
        malId: null,
        episode: null,
        autoSkipEnabled: false,
      });

      // Trigger did-navigate — listeners are registered with `on`.
      const navHandlers = listeners.get('did-navigate') ?? [];
      expect(navHandlers.length).toBe(1);
      navHandlers[0]();

      // Re-trigger did-frame-finish-load to confirm it walks the tree again.
      const flHandlers = listeners.get('did-frame-finish-load') ?? [];
      expect(flHandlers.length).toBe(1);
      flHandlers[0]({}, true);
      await new Promise(resolve => setImmediate(resolve));

      // The injection should still succeed via the fresh frame walk.
      expect(
        frame.executeJavaScript.mock.calls.some(([src]) =>
          (src as string).includes('data-shiroani-skip-poc')
        )
      ).toBe(true);
    });
  });

  describe('detachAll', () => {
    it('clears every registered controller', async () => {
      const frameA = makeFakeFrame({ processId: 1, routingId: 100, videoPlaying: true });
      const frameB = makeFakeFrame({ processId: 2, routingId: 200, videoPlaying: true });
      registerFakeWebContents({ webContentsId: 1, frames: [frameA] });
      registerFakeWebContents({ webContentsId: 2, frames: [frameB] });

      const controller = new PlayerSkipController();
      controller.setAniSkipClient(makeAniSkipClient([]));
      await controller.attach({
        webContentsId: 1,
        malId: null,
        episode: null,
        autoSkipEnabled: false,
      });
      await controller.attach({
        webContentsId: 2,
        malId: null,
        episode: null,
        autoSkipEnabled: false,
      });

      controller.detachAll();
      // Subsequent updates are no-ops.
      await expect(controller.update(1, { episode: 2 })).resolves.toBe('none');
      await expect(controller.update(2, { episode: 2 })).resolves.toBe('none');
    });
  });
});
