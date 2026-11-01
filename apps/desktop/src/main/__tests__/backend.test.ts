import { BACKEND_REQUEST_CHANNELS } from '@shiroani/shared';
import { AniListClient } from '../../modules/anime/anilist-client';
import { MalClient } from '../../modules/anime/mal-client';
import { DatabaseService } from '../../modules/database/database.service';
import { FeedService } from '../../modules/feed/feed.service';
import { FeedSchedulerService } from '../../modules/feed/feed-scheduler.service';
import { ElectronMalTokenAdapter } from '../auth/mal-token.adapter';
import { ElectronAniListTokenAdapter } from '../auth/anilist-token.adapter';
import { createBackend, type Backend } from '../backend';

jest.mock('electron');
jest.mock('../../modules/anime/anilist-client');
jest.mock('../../modules/anime/mal-client');
jest.mock('../auth/mal-token.adapter');
jest.mock('../auth/anilist-token.adapter');

const events = { emit: jest.fn() };

/** Records call order across the stub database and the spies below. */
function buildBackend(calls: string[] = []) {
  const database = {
    db: {},
    init: jest.fn(() => calls.push('db.init')),
    dispose: jest.fn(() => calls.push('db.dispose')),
  } as unknown as DatabaseService;
  const seed = jest.spyOn(FeedService.prototype, 'seedDefaultSources').mockImplementation(() => {
    calls.push('feed.seed');
  });
  const start = jest
    .spyOn(FeedSchedulerService.prototype, 'startPolling')
    .mockImplementation(() => {
      calls.push('scheduler.start');
    });
  const dispose = jest.spyOn(FeedSchedulerService.prototype, 'dispose').mockImplementation(() => {
    calls.push('scheduler.dispose');
  });
  const backend = createBackend({ dbPath: '/tmp/test.db', events, createDatabase: () => database });
  return { backend, database, seed, start, dispose };
}

describe('createBackend', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it('opens the database before seeding and starting the scheduler', () => {
    const calls: string[] = [];
    buildBackend(calls);
    expect(calls).toEqual(['db.init', 'feed.seed', 'scheduler.start']);
  });

  it('keeps one adapter per provider and the existing client counts', () => {
    buildBackend();

    expect(ElectronMalTokenAdapter).toHaveBeenCalledTimes(1);
    expect(ElectronAniListTokenAdapter).toHaveBeenCalledTimes(1);
    expect(AniListClient).toHaveBeenCalledTimes(3);
    expect(MalClient).toHaveBeenCalledTimes(2);

    const malPort = jest.mocked(ElectronMalTokenAdapter).mock.instances[0];
    const aniPort = jest.mocked(ElectronAniListTokenAdapter).mock.instances[0];
    for (const [port] of jest.mocked(MalClient).mock.calls) expect(port).toBe(malPort);
    for (const [port] of jest.mocked(AniListClient).mock.calls) expect(port).toBe(aniPort);
  });

  it('gives gateway-facing services no method Nest would call on a useValue provider', () => {
    const { backend } = buildBackend();
    const hooks = [
      'onModuleInit',
      'onApplicationBootstrap',
      'onModuleDestroy',
      'beforeApplicationShutdown',
      'onApplicationShutdown',
    ];
    const services: Array<keyof Backend> = [
      'anime',
      'animeProfile',
      'animeSocial',
      'animeRecommendations',
      'library',
      'diary',
      'schedule',
      'importExport',
      'feed',
      'aniListSync',
      'malSync',
    ];
    for (const name of services) {
      for (const hook of hooks) {
        expect((backend[name] as unknown as Record<string, unknown>)[hook]).toBeUndefined();
      }
    }
  });

  it('stops the scheduler before closing the database', async () => {
    const calls: string[] = [];
    const { backend } = buildBackend(calls);
    calls.length = 0;

    await backend.shutdown();

    expect(calls).toEqual(['scheduler.dispose', 'db.dispose']);
  });

  it('runs disposers last-registered first and continues past a failing one', async () => {
    const calls: string[] = [];
    const { backend } = buildBackend(calls);
    calls.length = 0;
    backend.addDisposer('first', () => {
      calls.push('first');
    });
    backend.addDisposer('failing', () => {
      calls.push('failing');
      throw new Error('boom');
    });

    await backend.shutdown();

    expect(calls).toEqual(['failing', 'first', 'scheduler.dispose', 'db.dispose']);
  });

  it('removes handlers, stops the scheduler, drains, then closes the database', async () => {
    const calls: string[] = [];
    const { backend } = buildBackend(calls);
    calls.length = 0;
    backend.addDisposer('backend ipc', () => {
      calls.push('ipc.remove');
    });
    jest.spyOn(backend.inflight, 'drain').mockImplementation(async () => {
      calls.push('drain');
    });

    await backend.shutdown();

    expect(calls).toEqual(['ipc.remove', 'scheduler.dispose', 'drain', 'db.dispose']);
  });

  it('has a handler for exactly the allow-listed request channels', () => {
    const { backend } = buildBackend();
    expect(Object.keys(backend.handlers).sort()).toEqual([...BACKEND_REQUEST_CHANNELS].sort());
  });

  it('answers the ping channel', async () => {
    const { backend } = buildBackend();
    await expect(backend.handlers['backend:ping'](undefined)).resolves.toEqual({ ok: true });
  });

  it('shuts down only once', async () => {
    const { backend, database } = buildBackend();

    await Promise.all([backend.shutdown(), backend.shutdown()]);
    await backend.shutdown();

    expect(database.dispose).toHaveBeenCalledTimes(1);
  });

  it('closes the database when construction fails after it opened', async () => {
    const dispose = jest.fn();
    const database = { db: {}, init: jest.fn(), dispose } as unknown as DatabaseService;
    jest.spyOn(FeedService.prototype, 'seedDefaultSources').mockImplementation(() => {
      throw new Error('seed failed');
    });

    expect(() => createBackend({ dbPath: 'x', events, createDatabase: () => database })).toThrow(
      'seed failed'
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
