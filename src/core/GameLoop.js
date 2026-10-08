// Pure scheduling orchestration: simulation owns state, rendering only observes it.
export class GameLoop {
  constructor({
    update,
    render = () => {},
    requestFrame = globalThis.requestAnimationFrame?.bind(globalThis),
    cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis),
    now = () => globalThis.performance.now(),
    stepMs = 1000 / 60,
    maxFrameMs = 250,
  } = {}) {
    if (typeof update !== 'function') throw new TypeError('update callback required');
    if (typeof render !== 'function') throw new TypeError('render must be a function');
    if (typeof requestFrame !== 'function' || typeof cancelFrame !== 'function') {
      throw new TypeError('frame scheduler required');
    }
    if (!Number.isFinite(stepMs) || stepMs <= 0) throw new RangeError('invalid stepMs');
    if (!Number.isFinite(maxFrameMs) || maxFrameMs < stepMs) throw new RangeError('invalid maxFrameMs');
    this.update = update;
    this.render = render;
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.now = now;
    this.stepMs = stepMs;
    this.maxFrameMs = maxFrameMs;
    this.running = false;
    this.frameId = null;
    this.lastTime = null;
    this.accumulator = 0;
    this.frame = this.frame.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = this.now();
    this.accumulator = 0;
    this.frameId = this.requestFrame(this.frame);
  }

  stop() {
    this.running = false;
    if (this.frameId !== null) this.cancelFrame(this.frameId);
    this.frameId = null;
    this.lastTime = null;
    this.accumulator = 0;
  }

  frame(timestamp) {
    if (!this.running) return;
    this.frameId = null;
    const elapsed = Math.max(0, Math.min(timestamp - this.lastTime, this.maxFrameMs));
    this.lastTime = timestamp;
    this.accumulator += elapsed;
    while (this.accumulator >= this.stepMs) {
      this.update(this.stepMs);
      if (!this.running) return;
      this.accumulator -= this.stepMs;
    }
    this.render(this.accumulator / this.stepMs);
    if (this.running) this.frameId = this.requestFrame(this.frame);
  }
}
