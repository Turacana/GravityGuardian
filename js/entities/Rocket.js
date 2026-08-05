import { distance, normalize } from '../math.js';

export default class Rocket {
  constructor(position, direction) {
    this.position = { x: position.x, y: position.y };
    this.velocity = {
      x: direction.x * 210,
      y: direction.y * 210,
    };
    this.radius = 6;
    this.mass = 8;
    this.trail = [];
    this.inGravity = false;
  }

  update(deltaTime, blackHole) {
    if (blackHole) {
      const dist = distance(this.position.x, this.position.y, blackHole.position.x, blackHole.position.y);
      this.inGravity = dist < blackHole.gravityRadius;
      if (this.inGravity) {
        const pull = normalize(blackHole.position.x - this.position.x, blackHole.position.y - this.position.y);
        const strength = ((blackHole.gravityRadius - dist) / blackHole.gravityRadius) * 140;
        this.velocity.x += pull.x * strength * deltaTime;
        this.velocity.y += pull.y * strength * deltaTime;
      }
    }

    this.trail.unshift({ x: this.position.x, y: this.position.y });
    if (this.trail.length > 18) {
      this.trail.pop();
    }

    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
  }

  collidesWithCircle(center, radius) {
    return distance(this.position.x, this.position.y, center.x, center.y) < this.radius + radius;
  }

  draw(ctx) {
    if (this.trail.length > 1) {
      ctx.save();
      for (let i = 0; i < this.trail.length - 1; i += 1) {
        const p0 = this.trail[i];
        const p1 = this.trail[i + 1];
        const progress = i / (this.trail.length - 1);
        ctx.strokeStyle = this.inGravity
          ? `rgba(180, 220, 255, ${0.8 * (1 - progress)})`
          : `rgba(255, 180, 80, ${0.5 * (1 - progress)})`;
        ctx.lineWidth = 2 - progress * 1.2;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    const angle = Math.atan2(this.velocity.y, this.velocity.x);
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(angle);
    ctx.fillStyle = '#ef7f3e';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-8, -5);
    ctx.lineTo(-8, 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffd369';
    ctx.beginPath();
    ctx.moveTo(-8, -4);
    ctx.lineTo(-16, 0);
    ctx.lineTo(-8, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
