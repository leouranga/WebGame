import type { Vec } from '@/game/types';

export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

export const normalize = (vec: Vec): Vec => {
  const length = Math.hypot(vec.x, vec.y) || 1;
  return { x: vec.x / length, y: vec.y / length };
};

export const pointInRect = (point: Vec, rect: { x: number; y: number; w: number; h: number }) => (
  point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h
);

export const rectsOverlap = (
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
