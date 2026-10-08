import { GameLoop } from './core/GameLoop.js';
import { createGameState, setGameStatus, GAME_STATUS, advanceGameState } from './core/GameState.js';
import { createWorldState } from './world/WorldState.js';
import { OceanRenderer } from './rendering/OceanRenderer.js';

const root = document.getElementById('app');
if (!root) throw new Error('Elemento #app ausente');

const canvas = document.createElement('canvas');
canvas.id = 'ocean';
canvas.setAttribute('aria-label', 'Oceano da Região 1');
root.replaceChildren(canvas);

const world = createWorldState();
const renderer = new OceanRenderer(canvas);
let state = setGameStatus(createGameState(), GAME_STATUS.RUNNING);

const loop = new GameLoop({
  update: (stepMs) => { state = advanceGameState(state, stepMs); },
  render: () => renderer.render(world),
});

loop.start();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) loop.stop();
  else loop.start();
});
window.addEventListener('pagehide', () => loop.stop());
