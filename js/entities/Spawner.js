import Asteroid from './Asteroid.js';

const SPAWN_SLOW = 1.0;
const SPAWN_FAST = 0.55;
const SPAWN_DURATION = 60;

export default class Spawner {
  constructor(game) {
    this.game = game;
    this.timer = 0;
    this.interval = SPAWN_SLOW;
  }

  update(deltaTime) {
    this.timer += deltaTime;
    const normalized = Math.min(this.game.elapsedTime / SPAWN_DURATION, 1);
    this.interval = SPAWN_SLOW - (SPAWN_SLOW - SPAWN_FAST) * normalized;

    if (this.timer >= this.interval) {
      this.timer -= this.interval;
      this.spawnAsteroid();
    }
  }

  spawnAsteroid() {
    const side = Math.floor(Math.random() * 4);
    const margin = 60;
    const { width, height } = this.game;
    let x = 0;
    let y = 0;

    if (side === 0) {
      x = -margin;
      y = Math.random() * height;
    } else if (side === 1) {
      x = width + margin;
      y = Math.random() * height;
    } else if (side === 2) {
      x = Math.random() * width;
      y = -margin;
    } else {
      x = Math.random() * width;
      y = height + margin;
    }

    const target = Math.random() < 0.8 ? this.choosePlanetTarget() : this.game.sun;
    const radius = 8 + Math.random() * 6;
    const asteroid = new Asteroid({ x, y }, target, radius);
    this.game.addAsteroid(asteroid);
    this.game.addSpawnWarning(asteroid);
  }

  choosePlanetTarget() {
    const alivePlanets = this.game.planets.filter((planet) => !planet.destroyed);
    if (alivePlanets.length === 0) {
      return this.game.sun;
    }
    return alivePlanets[Math.floor(Math.random() * alivePlanets.length)];
  }
}
