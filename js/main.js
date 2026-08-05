import Game from './game.js';
import Input from './input.js';

const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');

const input = new Input();
const game = new Game(canvas, context, input);

function function_resize() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  game.resize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', function_resize);
function_resize();

let lastTime = performance.now();
function frame(now) {
  const deltaTime = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;

  game.update(deltaTime);
  game.draw();

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
window.addEventListener('keydown', (event) => {
  if (event.key === 'r' || event.key === 'R') {
    game.reset();
  }
});
