import { distance, normalize } from '../math.js';

export default class Asteroid {
  constructor(position, target, radius = 8) {
    this.position = { x: position.x, y: position.y };
    this.target = { x: target.x, y: target.y };
    this.radius = radius;
    this.speed = 120;
    this.mass = radius * 0.7;
    const direction = normalize(target.x - position.x, target.y - position.y);
    this.velocity = {
      x: direction.x * this.speed,
      y: direction.y * this.speed,
    };
    this.trail = [];
    this.inGravity = false;
  }

  update(deltaTime, blackHole) {
    if (blackHole) {
      const dist = distance(this.position.x, this.position.y, blackHole.position.x, blackHole.position.y);
      this.inGravity = dist < blackHole.gravityRadius;
      if (this.inGravity) {
        const pull = normalize(blackHole.position.x - this.position.x, blackHole.position.y - this.position.y);
        const strength = ((blackHole.gravityRadius - dist) / blackHole.gravityRadius) * 120;
        this.velocity.x += pull.x * strength * deltaTime;
        this.velocity.y += pull.y * strength * deltaTime;
      }
    }

    this.trail.unshift({ x: this.position.x, y: this.position.y });
    if (this.trail.length > 20) {
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
          ? `rgba(180, 220, 255, ${0.7 * (1 - progress)})`
          : `rgba(190, 190, 190, ${0.35 * (1 - progress)})`;
        ctx.lineWidth = 2 - progress * 1.2;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (this.inGravity) {
      ctx.save();
      ctx.strokeStyle = 'rgba(190, 240, 255, 0.35)';
      ctx.lineWidth = 1;
      const angle = Math.atan2(this.velocity.y, this.velocity.x);
      const aheadX = this.position.x + Math.cos(angle) * this.radius * 3;
      const aheadY = this.position.y + Math.sin(angle) * this.radius * 3;
      ctx.beginPath();
      ctx.moveTo(this.position.x, this.position.y);
      ctx.lineTo(aheadX, aheadY);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = '#b4b4b4';
    ctx.shadowColor = this.inGravity ? 'rgba(180, 220, 255, 0.45)' : 'rgba(0,0,0,0)';
    ctx.shadowBlur = this.inGravity ? 10 : 0;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
