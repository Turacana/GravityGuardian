export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function addVectors(x1, y1, x2, y2) {
  return { x: x1 + x2, y: y1 + y2 };
}

export function lerp(value, target, speed) {
  return value + (target - value) * speed;
}

export function normalize(x, y) {
  const length = Math.hypot(x, y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}