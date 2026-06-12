import { screen } from 'electron';
import type { ClimbSurface, Facing, Ground, ShimejiState } from './types';
import { Environment } from './environment';

/**
 * Shimeji behavior engine. Ticks in the main process at ~30 fps, owns the
 * mascot's position/state, and reports changes through callbacks — it knows
 * nothing about BrowserWindows, so it stays unit-testable.
 *
 * Coordinate model: (x, y) is the TOP-LEFT of the mascot's square window in
 * screen coordinates; feet are at y + size.
 */

const TICK_MS = 33;
const WALK_SPEED = 65; // px/s
const CLIMB_SPEED = 45; // px/s
const GRAVITY = 1800; // px/s²
const TERMINAL_VELOCITY = 900; // px/s
const THROW_FRICTION = 0.985; // horizontal decay per tick while airborne
const LAND_DURATION_S = 0.3;
const WAVE_DURATION_S = 2.2;

/** Weighted behavior picker for what to do after idling on the ground. */
const BEHAVIOR_WEIGHTS: Array<{ state: ShimejiState; weight: number }> = [
  { state: 'walk', weight: 45 },
  { state: 'sit', weight: 20 },
  { state: 'think', weight: 12 },
  { state: 'sleep', weight: 13 },
  { state: 'wave', weight: 10 },
];

/** Dwell time ranges per state, seconds. */
const DWELL: Partial<Record<ShimejiState, [number, number]>> = {
  sit: [4, 12],
  sleep: [10, 30],
  think: [3, 7],
  walk: [3, 10],
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickBehavior(): ShimejiState {
  const total = BEHAVIOR_WEIGHTS.reduce((sum, b) => sum + b.weight, 0);
  let roll = Math.random() * total;
  for (const b of BEHAVIOR_WEIGHTS) {
    roll -= b.weight;
    if (roll <= 0) return b.state;
  }
  return 'sit';
}

export interface EngineCallbacks {
  /** Animation or facing changed — push to the renderer. */
  onAnimChange(anim: ShimejiState, facing: Facing): void;
  /** Position changed — move the overlay window. */
  onMove(x: number, y: number): void;
}

export class ShimejiEngine {
  private readonly env = new Environment();
  private readonly callbacks: EngineCallbacks;

  private size: number;
  private x = 0;
  private y = 0;
  private vx = 0;
  private vy = 0;
  private facing: Facing = 'left';

  private state: ShimejiState = 'sit';
  private stateElapsed = 0;
  private dwell = 3;

  private ground: Ground = { kind: 'floor' };
  private climbSurface: ClimbSurface | null = null;
  private climbStopY = 0;

  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private lastCursorX = 0;
  private lastCursorY = 0;

  private timer: ReturnType<typeof setInterval> | null = null;
  private paused = false;
  private staticMode = false;

  constructor(size: number, callbacks: EngineCallbacks) {
    this.size = size;
    this.callbacks = callbacks;
  }

  get environment(): Environment {
    return this.env;
  }

  getPosition(): { x: number; y: number } {
    return { x: Math.round(this.x), y: Math.round(this.y) };
  }

  setSize(size: number): void {
    // Keep the feet planted when the sprite grows/shrinks.
    this.y += this.size - size;
    this.size = size;
    this.emitMove();
  }

  start(startX?: number, startY?: number): void {
    if (this.timer) return;
    const wa = this.env.workArea;
    this.x = startX ?? wa.x + wa.width - this.size - 40;
    this.y = startY ?? this.env.floorY - this.size;
    this.enter('sit');
    this.emitMove();
    this.timer = setInterval(() => this.tick(TICK_MS / 1000), TICK_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Pause/resume the behavior loop (used while hidden or position-locked). */
  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused && this.state !== 'sit') this.enter('sit');
  }

  /**
   * Static mode: the classic pet behavior. She sits where you put her —
   * no wandering, no gravity — but stays draggable and waves on click.
   * This is what 'static' means on macOS, where the Win32 native overlay
   * doesn't exist and this engine is the only backend.
   */
  setStaticMode(staticMode: boolean): void {
    this.staticMode = staticMode;
    if (staticMode) {
      if (this.state !== 'sit') this.enter('sit');
    } else if (this.state === 'sit') {
      // Re-entering roam: settle onto whatever is below the current spot.
      this.enter('fall');
    }
  }

  /** Place the mascot somewhere explicitly (settings "reset position"). It
   * falls from there and settles on whatever is below — or simply stays
   * there in static mode. */
  teleport(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.emitMove();
    this.enter(this.staticMode ? 'sit' : 'fall');
  }

  // ── Interaction (from the renderer) ──────────────────────────────────────

  /** User pressed on the sprite: pick the mascot up. */
  startDrag(): void {
    const cursor = screen.getCursorScreenPoint();
    this.dragOffsetX = cursor.x - this.x;
    this.dragOffsetY = cursor.y - this.y;
    this.lastCursorX = cursor.x;
    this.lastCursorY = cursor.y;
    this.vx = 0;
    this.vy = 0;
    this.enter('dragged');
  }

  /** User released the sprite: fall with throw momentum — or, in static
   * mode, stay exactly where dropped (classic overlay behavior). */
  endDrag(): void {
    if (this.state !== 'dragged') return;
    this.enter(this.staticMode ? 'sit' : 'fall');
  }

  /** Plain click (no drag): wave back. */
  onClick(): void {
    if (this.state === 'dragged' || this.state === 'fall') return;
    if (this.isAirborneOrClimbing()) return;
    this.enter('wave');
  }

  private isAirborneOrClimbing(): boolean {
    return this.state === 'fall' || this.state === 'climb' || this.state === 'land';
  }

  // ── State machine ────────────────────────────────────────────────────────

  private enter(state: ShimejiState): void {
    this.state = state;
    this.stateElapsed = 0;
    const range = DWELL[state];
    this.dwell = range ? randomBetween(range[0], range[1]) : 0;

    if (state === 'walk') {
      const dir = Math.random() < 0.5 ? -1 : 1;
      this.vx = WALK_SPEED * dir;
      this.facing = dir < 0 ? 'left' : 'right';
    } else if (state !== 'fall' && state !== 'dragged') {
      this.vx = 0;
      this.vy = 0;
    }

    this.callbacks.onAnimChange(state, this.facing);
  }

  private tick(dt: number): void {
    if (this.paused) return;
    const now = Date.now();
    this.stateElapsed += dt;

    switch (this.state) {
      case 'sit':
      case 'sleep':
      case 'think':
        // Static mode: no behavior rotation, no floor-snap — she stays
        // exactly where the user put her.
        if (!this.staticMode) this.tickGroundedIdle(now);
        break;
      case 'wave':
        if (this.stateElapsed >= WAVE_DURATION_S) this.enter('sit');
        break;
      case 'land':
        if (this.stateElapsed >= LAND_DURATION_S) this.enter('sit');
        break;
      case 'walk':
        this.tickWalk(dt, now);
        break;
      case 'climb':
        this.tickClimb(dt, now);
        break;
      case 'fall':
        this.tickFall(dt, now);
        break;
      case 'dragged':
        this.tickDragged();
        break;
    }
  }

  /** Shared for sit/sleep/think: stay put, verify ground, rotate behavior. */
  private tickGroundedIdle(now: number): void {
    if (!this.verifyGround(now)) return;
    if (this.stateElapsed >= this.dwell) {
      const next = pickBehavior();
      this.enter(next === this.state ? 'walk' : next);
    }
  }

  private tickWalk(dt: number, now: number): void {
    if (!this.verifyGround(now)) return;

    this.x += this.vx * dt;
    const dir: 'left' | 'right' = this.vx < 0 ? 'left' : 'right';
    const edgeX = dir === 'left' ? this.x : this.x + this.size;
    const feetY = this.y + this.size;

    // Walked off the edge of the window we're standing on → fall.
    if (this.ground.kind === 'window') {
      const groundYNow = this.env.groundY(this.ground, this.x + this.size / 2, now);
      if (groundYNow === null) {
        this.enter('fall');
        return;
      }
    }

    // Hit a wall (screen edge or window edge)?
    const surface = this.env.findClimbSurface(edgeX, feetY, dir, now);
    if (surface) {
      // Don't climb the window we're standing on top of.
      const standingOnIt =
        this.ground.kind === 'window' &&
        surface.kind === 'window' &&
        surface.rectId === this.ground.rectId;

      if (!standingOnIt && Math.random() < 0.6) {
        this.beginClimb(surface, now);
        return;
      }
      // Turn around.
      this.vx = -this.vx;
      this.facing = this.vx < 0 ? 'left' : 'right';
      this.callbacks.onAnimChange('walk', this.facing);
    }

    // Clamp inside the work area regardless.
    const wa = this.env.workArea;
    this.x = Math.max(wa.x, Math.min(this.x, wa.x + wa.width - this.size));
    this.emitMove();

    if (this.stateElapsed >= this.dwell) this.enter('sit');
  }

  private beginClimb(surface: ClimbSurface, now: number): void {
    this.climbSurface = surface;
    const wallX = this.env.climbWallX(surface, now);
    if (wallX === null) return;

    // Stick the leading edge to the wall.
    this.x = surface.side === 'left' || surface.kind === 'screen' ? wallX : wallX - this.size;
    if (surface.kind === 'screen') {
      this.x = surface.side === 'left' ? wallX : wallX - this.size;
    }

    const topY = this.env.climbTopY(surface, now) ?? this.env.workArea.y;
    if (surface.kind === 'screen') {
      // Screen walls have no roof to mount — climb to a random height,
      // then let go and tumble down.
      const wa = this.env.workArea;
      this.climbStopY = randomBetween(wa.y + wa.height * 0.15, wa.y + wa.height * 0.55);
    } else {
      this.climbStopY = topY;
    }

    this.facing = surface.side === 'left' ? 'left' : 'right';
    this.enter('climb');
  }

  private tickClimb(dt: number, now: number): void {
    const surface = this.climbSurface;
    if (!surface) {
      this.enter('fall');
      return;
    }

    const wallX = this.env.climbWallX(surface, now);
    if (wallX === null) {
      // The window we were climbing is gone.
      this.climbSurface = null;
      this.enter('fall');
      return;
    }

    // Follow the wall horizontally (windows move), ascend vertically.
    this.x = surface.side === 'left' || surface.kind === 'screen' ? wallX : wallX - this.size;
    if (surface.kind === 'screen') {
      this.x = surface.side === 'left' ? wallX : wallX - this.size;
    }
    this.y -= CLIMB_SPEED * dt;

    const feetY = this.y + this.size;
    if (surface.kind === 'window' && feetY <= this.climbStopY + 4) {
      // Reached the top — mount the window's roof and walk on it.
      this.ground = { kind: 'window', rectId: surface.rectId };
      this.y = this.climbStopY - this.size;
      this.climbSurface = null;
      this.emitMove();
      this.enter('walk');
      return;
    }
    if (surface.kind === 'screen' && this.y <= this.climbStopY) {
      // Got high enough on the screen wall — let go.
      this.climbSurface = null;
      this.enter('fall');
      return;
    }

    this.emitMove();
  }

  private tickFall(dt: number, now: number): void {
    const prevFeetY = this.y + this.size;

    this.vy = Math.min(this.vy + GRAVITY * dt, TERMINAL_VELOCITY);
    this.vx *= THROW_FRICTION;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const wa = this.env.workArea;
    this.x = Math.max(wa.x, Math.min(this.x, wa.x + wa.width - this.size));

    const cx = this.x + this.size / 2;
    const landing = this.env.findLanding(cx, prevFeetY, this.y + this.size, now);
    if (landing) {
      this.ground = landing.ground;
      this.y = landing.y - this.size;
      this.vx = 0;
      this.vy = 0;
      this.emitMove();
      this.enter('land');
      return;
    }

    this.emitMove();
  }

  private tickDragged(): void {
    const cursor = screen.getCursorScreenPoint();

    // Exponential moving average gives a stable throw velocity on release.
    const instVx = (cursor.x - this.lastCursorX) / (TICK_MS / 1000);
    const instVy = (cursor.y - this.lastCursorY) / (TICK_MS / 1000);
    this.vx = this.vx * 0.7 + instVx * 0.3;
    this.vy = this.vy * 0.7 + instVy * 0.3;
    this.lastCursorX = cursor.x;
    this.lastCursorY = cursor.y;

    this.x = cursor.x - this.dragOffsetX;
    this.y = cursor.y - this.dragOffsetY;

    const facing: Facing = this.vx < -20 ? 'left' : this.vx > 20 ? 'right' : this.facing;
    if (facing !== this.facing) {
      this.facing = facing;
      this.callbacks.onAnimChange('dragged', facing);
    }

    this.emitMove();
  }

  /**
   * Confirm whatever we're standing on still exists and hasn't moved.
   * Small moves snap the mascot along; big moves (or a closed window)
   * start a fall. Returns false when the state changed.
   */
  private verifyGround(now: number): boolean {
    if (this.ground.kind === 'floor') {
      const target = this.env.floorY - this.size;
      if (Math.abs(this.y - target) > 1) {
        // Work area changed (dock/taskbar resize) — snap.
        this.y = target;
        this.emitMove();
      }
      return true;
    }

    const groundYNow = this.env.groundY(this.ground, this.x + this.size / 2, now);
    if (groundYNow === null) {
      this.enter('fall');
      return false;
    }
    const target = groundYNow - this.size;
    const delta = Math.abs(this.y - target);
    if (delta > 60) {
      // The window jumped (snap/maximize) — bail out.
      this.enter('fall');
      return false;
    }
    if (delta > 0.5) {
      this.y = target;
      this.emitMove();
    }
    return true;
  }

  private emitMove(): void {
    this.callbacks.onMove(Math.round(this.x), Math.round(this.y));
  }
}
