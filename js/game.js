import { clamp, distance, normalize } from './math.js';
import BlackHole from './entities/BlackHole.js';
import Planet from './entities/Planet.js';
import Asteroid from './entities/Asteroid.js';
import Rocket from './entities/Rocket.js';
import Spawner from './entities/Spawner.js';
import AudioManager from './AudioManager.js';

const SUN_RADIUS = 32;
const BLACK_HOLE_SPEED = 40;
const BASE_GRAVITY_RADIUS = 120;
const BLACK_HOLE_ORBIT_RADIUS = 360;

const PLANET_DEFINITIONS = [
  { orbitRadius: 75, radius: 6, orbitSpeed: 1.8, hp: 0, color: '#a07d5a', isEarth: false, startAngle: 0 },
  { orbitRadius: 101.25, radius: 9, orbitSpeed: 1.45, hp: 0, color: '#e0b86b', isEarth: false, startAngle: 0.72 },
  { orbitRadius: 127.5, radius: 12, orbitSpeed: 1.15, hp: 3, color: '#3f9ce2', isEarth: true, startAngle: 1.44, satellites: [{ orbitRadius: 18, radius: 2.5, orbitSpeed: 2.2, color: '#dfe9f8', startAngle: 0.9 }] },
  { orbitRadius: 153.75, radius: 10, orbitSpeed: 0.92, hp: 0, color: '#d96a4b', isEarth: false, startAngle: 2.16, satellites: [{ orbitRadius: 16, radius: 2.2, orbitSpeed: 2.6, color: '#c9c9c9', startAngle: 1.8 }] },
  { orbitRadius: 187.5, radius: 16, orbitSpeed: 0.72, hp: 0, color: '#d4a76a', isEarth: false, startAngle: 2.88, satellites: [{ orbitRadius: 24, radius: 3.2, orbitSpeed: 1.7, color: '#e8e0c9', startAngle: 2.4 }, { orbitRadius: 34, radius: 2.3, orbitSpeed: 1.9, color: '#c7c7c7', startAngle: 3.1 }] },
  { orbitRadius: 219, radius: 14, orbitSpeed: 0.62, hp: 0, color: '#e0c07e', isEarth: false, startAngle: 3.6, satellites: [{ orbitRadius: 22, radius: 2.6, orbitSpeed: 1.5, color: '#f5f2e0', startAngle: 2.8 }] },
  { orbitRadius: 251.25, radius: 11, orbitSpeed: 0.52, hp: 0, color: '#7ecf8a', isEarth: false, startAngle: 4.32, satellites: [{ orbitRadius: 18, radius: 2.2, orbitSpeed: 1.8, color: '#d8f3e6', startAngle: 3.2 }] },
  { orbitRadius: 282.75, radius: 10, orbitSpeed: 0.42, hp: 0, color: '#b56ee8', isEarth: false, startAngle: 5.04, satellites: [{ orbitRadius: 20, radius: 2.2, orbitSpeed: 1.6, color: '#d4b8ff', startAngle: 4.0 }] },
];

export default class Game {
  constructor(canvas, context, input) {
    this.canvas = canvas;
    this.context = context;
    this.input = input;
    this.width = canvas.width;
    this.height = canvas.height;
    this.center = { x: this.width / 2, y: this.height / 2 };
    this.audio = new AudioManager();
    window.addEventListener('pointerdown', () => this.audio.resume(), { once: true });
    this.showDebug = false;
    window.addEventListener('keydown', (e) => {
      if (e.key === 'i' || e.key === 'I') this.showDebug = !this.showDebug;
    });
    this.reset();
  }

  reset() {
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.center = { x: this.width / 2, y: this.height / 2 };
    this.time = 0;
    this.isGameOver = false;
    this.sun = { x: this.center.x, y: this.center.y, radius: SUN_RADIUS };
    this.blackHole = new BlackHole(this.sun, BLACK_HOLE_ORBIT_RADIUS, BLACK_HOLE_SPEED, BASE_GRAVITY_RADIUS, 22);
    this.planets = PLANET_DEFINITIONS.map((definition) =>
      new Planet(
        this.center,
        definition.orbitRadius,
        definition.radius,
        definition.orbitSpeed,
        definition.hp,
        definition.color,
        definition.isEarth,
        definition.satellites,
        definition.startAngle
      )
    );
    this.spawner = new Spawner(this);
    this.asteroids = [];
    this.rockets = [];
    this.rocketLaunches = 0;
    this.rocketSuccesses = 0;
    this.isVictory = false;
    this.spawnWarnings = [];
    this.rocketTimer = 0;
        this.rocketInterval = 12 + Math.random() * 1.4;

    this.absorptionEffects = [];
    this.starfield = this.createStarfield(this.width, this.height);
    this.isStarted = false;
    this.startPromptVisible = true;
    this.gravityParticles = Array.from({ length: 42 }, () => ({
      angle: Math.random() * Math.PI * 2,
      orbit: Math.random() * 0.4 + 0.55,
speed: 0.003 + Math.random() * 0.003,      
size: Math.random() * 1.2 + 0.6,
      phase: Math.random() * Math.PI * 2,
    }));
    this.gravityFlowPhase = 0;
    this.elapsedTime = 0;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.center = { x: width / 2, y: height / 2 };
    if (this.sun) {
      this.sun.x = this.center.x;
      this.sun.y = this.center.y;
    }
    this.planets.forEach((planet) => {
      planet.center = this.center;
    });
    if (this.blackHole) {
      this.blackHole.center = this.center;
    }
    this.starfield = this.createStarfield(width, height);
  }

  update(deltaTime) {
    if (!this.isStarted) {
      if (this.input.isDown('enter')) {
        this.startGame();
      }
      return;
    }

    if (this.isGameOver) return;

    this.elapsedTime += deltaTime;
    this.time = Math.floor(this.elapsedTime);
    this.blackHole.update(deltaTime, this.input, this.sun);
    // update audio mass parameter (normalize to [0,1])
    if (this.audio && typeof this.audio.setMass === 'function') {
      const norm = Math.min(1, this.blackHole.mass / 200);
      this.audio.setMass(norm);
    }
    this.spawner.update(deltaTime);
    this.rocketTimer += deltaTime;
    if (this.rocketTimer >= this.rocketInterval) {
      this.spawnRocket();
      this.rocketTimer = 0;
      this.rocketInterval = 8 + Math.random() * 5;
    }

    this.planets.forEach((planet) => planet.update(deltaTime, this.blackHole, this.center));
    this.asteroids.forEach((asteroid) => asteroid.update(deltaTime, this.blackHole));
    this.rockets.forEach((rocket) => rocket.update(deltaTime, this.blackHole));

    this.gravityParticles.forEach((particle) => {
      particle.angle += particle.speed * deltaTime;
      particle.phase += deltaTime * 0.8;
    });
    this.gravityFlowPhase = (this.gravityFlowPhase + deltaTime * 0.6) % (Math.PI * 2);

    this.absorptionEffects.forEach((effect) => {
      effect.time += deltaTime;
    });
    this.absorptionEffects = this.absorptionEffects.filter((effect) => effect.time < 0.35);

    this.spawnWarnings = this.spawnWarnings.filter((warning) => {
      const asteroid = warning.asteroid;
      if (!asteroid || !this.asteroids.includes(asteroid)) {
        return false;
      }
      return asteroid.position.x < 0 || asteroid.position.x > this.width || asteroid.position.y < 0 || asteroid.position.y > this.height;
    });

    this.asteroids = this.asteroids.filter((asteroid) => {
      if (asteroid.collidesWithCircle(this.blackHole.position, this.blackHole.radius)) {
        this.absorptionEffects.push({ x: asteroid.position.x, y: asteroid.position.y, time: 0 });
        if (this.audio) this.audio.playAbsorb(asteroid.position.x, asteroid.position.y);
        this.blackHole.absorbAsteroid(asteroid);
        return false;
      }

      const earth = this.planets.find((planet) => planet.isEarth && !planet.destroyed);
      if (earth && asteroid.collidesWithCircle(earth.position, earth.radius + asteroid.radius)) {
        earth.takeDamage(1);
        if (this.audio) this.audio.playEarthHit();
        return false;
      }

      const otherPlanetHit = this.planets.some(
        (planet) => !planet.isEarth && !planet.destroyed && asteroid.collidesWithCircle(planet.position, planet.radius + asteroid.radius)
      );
      if (otherPlanetHit) {
        return false;
      }

      if (asteroid.collidesWithCircle(this.sun, this.sun.radius + asteroid.radius)) {
        return false;
      }

      return true;
    });

    this.rockets = this.rockets.filter((rocket) => {
      if (rocket.collidesWithCircle(this.blackHole.position, this.blackHole.radius)) {
        this.absorptionEffects.push({ x: rocket.position.x, y: rocket.position.y, time: 0 });
        if (this.audio) this.audio.playAbsorb(rocket.position.x, rocket.position.y);
        this.blackHole.absorbAsteroid(rocket);
        return false;
      }
      const inBounds =
        rocket.position.x >= -48 &&
        rocket.position.x <= this.width + 48 &&
        rocket.position.y >= -48 &&
        rocket.position.y <= this.height + 48;
      if (!inBounds) {
        this.rocketSuccesses += 1;
        return false;
      }
      return true;
    });

    if (this.rocketSuccesses > 10) {
      this.winGame();
    }

    this.planets.forEach((planet) => {
      if (planet.destroyed) return;
      if (planet.collidesWithCircle(this.sun, this.sun.radius)) {
        planet.destroy();
      }
      if (planet.collidesWithCircle(this.blackHole.position, this.blackHole.eventHorizonRadius)) {
        if (this.audio) this.audio.playAbsorb(planet.position.x, planet.position.y);
        this.blackHole.absorbPlanet(planet);
        planet.destroy();
      }
    });

    for (let i = 0; i < this.planets.length; i += 1) {
      const planetA = this.planets[i];
      if (planetA.destroyed) continue;
      for (let j = i + 1; j < this.planets.length; j += 1) {
        const planetB = this.planets[j];
        if (planetB.destroyed) continue;
        if (planetA.collidesWith(planetB)) {
          planetA.destroy();
          planetB.destroy();
        }
      }
    }

    const earth = this.planets.find((planet) => planet.isEarth);
    if (!earth || earth.destroyed || earth.hp <= 0) {
      this.endGame();
    }

    if (distance(this.sun.x, this.sun.y, this.blackHole.position.x, this.blackHole.position.y) <= this.blackHole.eventHorizonRadius + this.sun.radius) {
      this.endGame();
    }
  }

  addAsteroid(asteroid) {
    this.asteroids.push(asteroid);
  }

  spawnRocket() {
    const earth = this.planets.find((planet) => planet.isEarth && !planet.destroyed);
    if (!earth) return;
    const dx = earth.position.x - this.sun.x;
    const dy = earth.position.y - this.sun.y;
    const baseAngle = Math.atan2(dy, dx);
    const angle = baseAngle + (Math.random() - 0.5) * 0.3;
    const direction = normalize(Math.cos(angle), Math.sin(angle));
    const rocket = new Rocket(earth.position, direction);
    this.rockets.push(rocket);
    this.rocketLaunches += 1;
  }

  addSpawnWarning(asteroid) {
    this.spawnWarnings.push({
      asteroid,
    });
  }

  winGame() {
    this.isGameOver = true;
    this.isVictory = true;
    if (this.audio) this.audio.stopMusic();
  }

  endGame() {
    this.isGameOver = true;
    this.isVictory = false;
    if (this.audio) this.audio.stopMusic();
  }

  draw() {
    const ctx = this.context;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground();
    if (!this.isStarted) {
      this.drawStartScreen();
      return;
    }
    this.drawOrbits();
    this.drawSun();
    this.drawGravityField();
    this.drawGravityParticles();
    this.drawGravityLines();
    this.drawSpawnWarnings();
    this.drawAbsorptionEffects();
    this.drawAsteroids();
    this.drawRockets();
    this.planets.forEach((planet) => planet.draw(ctx));
    this.blackHole.draw(ctx);
    this.drawHud();

    if (this.isGameOver) {
      if (this.isVictory) {
        this.drawVictoryScreen();
      } else {
        this.drawGameOver();
      }
    }
  }

  drawBackground() {
    const ctx = this.context;
    const gradient = ctx.createRadialGradient(
      this.center.x,
      this.center.y,
      0,
      this.center.x,
      this.center.y,
      Math.max(this.width, this.height) * 0.7
    );
    gradient.addColorStop(0, 'rgba(10,12,25,0.16)');
    gradient.addColorStop(1, 'rgba(4,6,10,0.98)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    this.starfield.forEach((star) => {
      const alpha = star.alpha + Math.sin(star.phase) * 0.15;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.08, Math.min(1, alpha))})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  createStarfield(width, height) {
    return Array.from({ length: 140 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.2 + 0.2,
      alpha: Math.random() * 0.65 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.06 + 0.02,
    }));
  }

  drawOrbits() {
    const ctx = this.context;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1.2;
    this.planets.forEach((planet) => {
      if (planet.destroyed) return;
      ctx.beginPath();
      ctx.arc(this.center.x, this.center.y, planet.orbitRadius, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.strokeStyle = 'rgba(154, 92, 255, 0.18)';
    ctx.beginPath();
    ctx.arc(this.center.x, this.center.y, this.blackHole.orbitRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawSun() {
    const ctx = this.context;
    ctx.save();
    const haloGradient = ctx.createRadialGradient(
      this.sun.x,
      this.sun.y,
      this.sun.radius * 0.4,
      this.sun.x,
      this.sun.y,
      this.sun.radius * 3.5
    );
    haloGradient.addColorStop(0, 'rgba(255, 220, 84, 0.28)');
    haloGradient.addColorStop(0.45, 'rgba(255, 190, 50, 0.14)');
    haloGradient.addColorStop(1, 'rgba(255, 170, 35, 0)');
    ctx.fillStyle = haloGradient;
    ctx.beginPath();
    ctx.arc(this.sun.x, this.sun.y, this.sun.radius * 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#ffce45';
    ctx.shadowColor = 'rgba(255,204,77,0.45)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(this.sun.x, this.sun.y, this.sun.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawGravityField() {
    const ctx = this.context;
    const bh = this.blackHole.position;
    const base = this.blackHole.gravityRadius;
    ctx.save();
    for (let i = 0; i < 4; i += 1) {
      const radius = base + i * 10 + Math.sin(this.gravityFlowPhase + i * 1.1) * 4;
      ctx.strokeStyle = `rgba(145, 95, 255, ${0.14 - i * 0.025})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bh.x, bh.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawGravityParticles() {
    const ctx = this.context;
    const bh = this.blackHole.position;
    ctx.save();
    this.gravityParticles.forEach((particle) => {
      const radius = this.blackHole.gravityRadius * particle.orbit + Math.sin(particle.phase) * 4;
      const px = bh.x + Math.cos(particle.angle) * radius;
      const py = bh.y + Math.sin(particle.angle) * radius;
      ctx.fillStyle = 'rgba(190, 220, 255, 0.22)';
      ctx.beginPath();
      ctx.arc(px, py, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  drawGravityLines() {
    const ctx = this.context;
    const bh = this.blackHole.position;
    ctx.save();
    this.planets.forEach((planet) => {
      if (planet.destroyed) return;
      const dist = distance(bh.x, bh.y, planet.position.x, planet.position.y);
      const strength = Math.max(0.08, 0.3 - dist / (this.blackHole.gravityRadius * 4));
      const controlX = (bh.x + planet.position.x) / 2 + (planet.position.y - bh.y) * 0.08;
      const controlY = (bh.y + planet.position.y) / 2 - (planet.position.x - bh.x) * 0.08;
      ctx.strokeStyle = `rgba(170, 190, 255, ${strength.toFixed(2)})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(bh.x, bh.y);
      ctx.quadraticCurveTo(controlX, controlY, planet.position.x, planet.position.y);
      ctx.stroke();
    });
    ctx.restore();
  }

  drawAbsorptionEffects() {
    const ctx = this.context;
    ctx.save();
    this.absorptionEffects.forEach((effect) => {
      const progress = effect.time / 0.35;
      const alpha = 0.35 * (1 - progress);
      const radius = 8 + progress * 22;
      ctx.strokeStyle = `rgba(220, 240, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.restore();
  }

  drawSpawnWarnings() {
    const ctx = this.context;
    ctx.save();
    this.spawnWarnings.forEach((warning) => {
      const asteroid = warning.asteroid;
      if (!asteroid) return;
      const edge = 18;
      const margin = 0;
      let x = asteroid.position.x;
      let y = asteroid.position.y;
      let px = x;
      let py = y;
      let dx = 0;
      let dy = 0;
      if (x < 0) {
        px = edge;
        py = Math.min(Math.max(y, edge), this.height - edge);
        dx = 1;
      } else if (x > this.width) {
        px = this.width - edge;
        py = Math.min(Math.max(y, edge), this.height - edge);
        dx = -1;
      } else if (y < 0) {
        py = edge;
        px = Math.min(Math.max(x, edge), this.width - edge);
        dy = 1;
      } else if (y > this.height) {
        py = this.height - edge;
        px = Math.min(Math.max(x, edge), this.width - edge);
        dy = -1;
      } else {
        return;
      }

      const distanceToEdge = Math.min(
        Math.abs(x),
        Math.abs(x - this.width),
        Math.abs(y),
        Math.abs(y - this.height)
      );
      const alpha = Math.max(0.2, Math.min(1, 1 - distanceToEdge / 240));
      ctx.globalAlpha = alpha;

      ctx.strokeStyle = `rgba(255, 120, 120, ${0.95 * alpha})`;
      ctx.fillStyle = `rgba(255, 120, 120, ${0.28 * alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - dy * 10, py + dx * 10);
      ctx.lineTo(px, py);
      ctx.lineTo(px + dy * 10, py - dx * 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 120, 120, ${0.55 * alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + dx * 32, py + dy * 32);
      ctx.stroke();

      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.fillStyle = `rgba(255, 255, 255, ${0.72 * alpha})`;
      ctx.textAlign = 'center';
      ctx.fillText('Alerts', px + dx * 24, py + dy * 24);
    });
    ctx.restore();
  }

  drawAsteroids() {
    this.asteroids.forEach((asteroid) => asteroid.draw(this.context));
  }

  drawRockets() {
    this.rockets.forEach((rocket) => rocket.draw(this.context));
  }

  drawHud() {
    const ctx = this.context;
    const earth = this.planets.find((planet) => planet.isEarth);
    ctx.save();
    ctx.font = '16px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#f8f9ff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const debugLines = [
      `Time: ${Math.floor(this.time)}`,
      `Gravity: ${Math.round(this.blackHole.gravityRadius)}`,
      `Earth HP: ${earth ? earth.hp : 0}`,
      `Ships: ${this.rocketSuccesses} / 20`,
    ];
    const lines = this.showDebug
      ? [...debugLines, this.isGameOver ? 'Press R to restart' : '']
      : [`Mass: ${Math.round(this.blackHole.mass)}`, `Ships: ${this.rocketSuccesses} / 20`, this.isGameOver ? 'Press R to restart' : ''];
    let y = 16;
    lines.forEach((line) => {
      if (!line) return;
      ctx.fillText(line, 16, y);
      y += 22;
    });
    ctx.restore();
  }

  startGame() {
    this.isStarted = true;
    this.startPromptVisible = false;
    if (this.audio) {
      this.audio.playMusic();
      const norm = Math.min(1, this.blackHole.mass / 200);
      if (typeof this.audio.setMass === 'function') this.audio.setMass(norm);
    }
  }

  drawStartScreen() {
    const ctx = this.context;
    ctx.save();
    ctx.fillStyle = 'rgba(2, 4, 10, 0.92)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = '#f8f9ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.font = 'bold 42px Inter, system-ui, sans-serif';
    ctx.fillText('Gravity Guardian', this.center.x, this.center.y - 260);

    ctx.font = '18px Inter, system-ui, sans-serif';
    const lines = [
      'Игрок управляет чёрной дырой, которая защищает Землю от астероидов.',
      'Чем больше становится чёрная дыра, тем эффективнее она уничтожает угрозы,',
      'но тем сильнее начинает влиять на планеты и их орбиты.',
       '',
      'После трех попаданий астероидов жизнь на Земле будет уничтожена.',
            'Гибель планеты может случиться из-за того, что Земля окажется поглощена черной дырой или упадет на Солнце.',



      
     
          'Галактическая эскадра должна в полном составе покинуть систему, прежде чем солнечная система будет полностью разрушена.',

      'Игрок должен балансировать между получением силы и ответственностью за последствия своих действий.',
 '',
      'Управление: WASD или стрелки для перемещения чёрной дыры, I для отображения отладочной информации.',
    ];
    const startY = this.center.y - 200;
    const lineHeight = 28;
    lines.forEach((line, index) => {
      ctx.fillText(line, this.center.x, startY + index * lineHeight);
    });

    ctx.font = '16px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('Нажмите ENTER, чтобы начать', this.center.x, this.center.y + 100);
    ctx.restore();
  }

  drawGameOver() {
    const ctx = this.context;
    ctx.save();
    ctx.fillStyle = 'rgba(2, 2, 8, 0.72)';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#f8f9ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 44px Inter, system-ui, sans-serif';
    ctx.fillText('Game Over', this.center.x, this.center.y - 40);
    ctx.font = '20px Inter, system-ui, sans-serif';
    ctx.fillText(`Final Time: ${Math.floor(this.time)}`, this.center.x, this.center.y + 10);
    ctx.fillText('Restart (R)', this.center.x, this.center.y + 42);
    ctx.restore();
  }

  drawVictoryScreen() {
    const ctx = this.context;
    ctx.save();
    ctx.fillStyle = 'rgba(5, 18, 32, 0.88)';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#d7f4ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 44px Inter, system-ui, sans-serif';
    ctx.fillText('Победа!', this.center.x, this.center.y - 60);
    ctx.font = '24px Inter, system-ui, sans-serif';
    ctx.fillText(`Галактическая эскадра успешно покинула систему!`, this.center.x, this.center.y - 10);
    ctx.font = '18px Inter, system-ui, sans-serif';
    ctx.fillText('Поздравляем! Нажмите R для перезапуска.', this.center.x, this.center.y + 72);
    ctx.restore();
  }
}
