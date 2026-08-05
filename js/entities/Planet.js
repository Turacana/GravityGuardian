import { distance, normalize, lerp } from '../math.js';

export default class Planet {
  constructor(center, orbitRadius, radius, orbitSpeed, hp, color, isEarth = false, satellites = [], startAngle = 0) {
    this.center = center;
    this.orbitRadius = orbitRadius;
    this.radius = radius;
    this.orbitSpeed = orbitSpeed;
    this.hp = hp;
    this.color = color;
    this.isEarth = isEarth;
    this.destroyed = false;
    this.angle = startAngle;
    this.gravityOffset = { x: 0, y: 0 };
    this.position = { x: 0, y: 0 };
    this.satellites = satellites.map((satellite) => ({
      orbitRadius: satellite.orbitRadius,
      radius: satellite.radius,
      orbitSpeed: satellite.orbitSpeed,
      color: satellite.color,
      angle: satellite.startAngle ?? 0,
      position: { x: 0, y: 0 },
    }));
    this.updatePosition(0);
  }

  updatePosition(deltaTime) {
    this.angle += deltaTime * 0.4 * this.orbitSpeed;
    const orbitX = this.center.x + Math.cos(this.angle) * this.orbitRadius;
    const orbitY = this.center.y + Math.sin(this.angle) * this.orbitRadius;
    this.orbitPosition = { x: orbitX, y: orbitY };
    this.position = {
      x: orbitX + this.gravityOffset.x,
      y: orbitY + this.gravityOffset.y,
    };

    this.satellites.forEach((satellite) => {
      satellite.angle += deltaTime * 0.4 * satellite.orbitSpeed;
      satellite.position.x = this.position.x + Math.cos(satellite.angle) * satellite.orbitRadius;
      satellite.position.y = this.position.y + Math.sin(satellite.angle) * satellite.orbitRadius;
    });
  }

  update(deltaTime, blackHole, center) {
    if (this.destroyed) return;
    if (center) {
      this.center = center;
    }
    this.updatePosition(deltaTime);
    const dist = distance(this.position.x, this.position.y, blackHole.position.x, blackHole.position.y);
    const inside = dist < blackHole.gravityRadius + this.radius;
    if (inside) {
      const direction = normalize(blackHole.position.x - this.position.x, blackHole.position.y - this.position.y);
      const stretch = Math.max(0, blackHole.gravityRadius - dist) * 0.06;
      this.gravityOffset.x += direction.x * stretch * deltaTime * 6;
      this.gravityOffset.y += direction.y * stretch * deltaTime * 6;
    } else {
      this.gravityOffset.x = lerp(this.gravityOffset.x, 0, 0.08);
      this.gravityOffset.y = lerp(this.gravityOffset.y, 0, 0.08);
    }
    this.position.x = this.orbitPosition.x + this.gravityOffset.x;
    this.position.y = this.orbitPosition.y + this.gravityOffset.y;
  }

  takeDamage(amount) {
    if (!this.isEarth) return;
    this.hp = Math.max(0, this.hp - amount);
  }

  destroy() {
    this.destroyed = true;
  }

  collidesWith(other) {
    if (this.destroyed || other.destroyed) return false;
    const dx = this.position.x - other.position.x;
    const dy = this.position.y - other.position.y;
    return Math.hypot(dx, dy) < this.radius + other.radius;
  }

  collidesWithCircle(point, radius) {
    if (this.destroyed) return false;
    const dx = this.position.x - point.x;
    const dy = this.position.y - point.y;
    return Math.hypot(dx, dy) < this.radius + radius;
  }

  draw(ctx) {
    if (this.destroyed) return;
    if (this.isEarth) {
      ctx.save();
      ctx.font = `${Math.max(this.radius * 2, 24)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🌍', this.position.x, this.position.y);
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    this.satellites.forEach((satellite) => {
      ctx.save();
      ctx.fillStyle = satellite.color;
      ctx.beginPath();
      ctx.arc(satellite.position.x, satellite.position.y, satellite.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}
