export default class BlackHole {
  constructor(center, orbitRadius, speed, baseGravityRadius, eventHorizonRadius) {
    this.center = { x: center.x, y: center.y };
    this.orbitRadius = orbitRadius;
    this.speed = speed;
    this.mass = 25;
    this.baseGravityRadius = baseGravityRadius;
    this.eventHorizonRadius = eventHorizonRadius;
    this.radius = 18;
    this.gravityRadius = this.baseGravityRadius;
    this.angle = Math.PI * 0.25;
    this.position = {
      x: this.center.x + this.orbitRadius,
      y: this.center.y,
    };
  }

  update(deltaTime, input, sun) {
    const left = input.isDown('a') || input.isDown('arrowleft') || input.isDown('w') || input.isDown('arrowup');
    const right = input.isDown('d') || input.isDown('arrowright') || input.isDown('s') || input.isDown('arrowdown');
    const direction = (right ? 1 : 0) - (left ? 1 : 0);

    if (direction !== 0) {
      this.angle += direction * this.speed * deltaTime * 0.08;
    }

    this.center.x = sun.x;
    this.center.y = sun.y;
    this.position.x = this.center.x + Math.cos(this.angle) * this.orbitRadius;
    this.position.y = this.center.y + Math.sin(this.angle) * this.orbitRadius;
    this.gravityRadius = this.baseGravityRadius + Math.sqrt(this.mass) * 12;
  }

  absorbAsteroid(asteroid) {
    this.mass += asteroid.mass;
  }

  absorbPlanet(planet) {
    const planetMass = planet.radius * 3;
    this.mass += planetMass;
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.shadowBlur = 28;
    ctx.shadowColor = 'rgba(150, 90, 255, 0.75)';
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(160, 120, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius + 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
