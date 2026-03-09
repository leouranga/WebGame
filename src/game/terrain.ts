import { FLOOR_BASE_Y, GAME_WIDTH } from '@/game/constants';
import type { TerrainPoint } from '@/game/types';

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const createTerrain = (): TerrainPoint[] => [
  { x: 0, y: FLOOR_BASE_Y + 6 },
  { x: 120, y: FLOOR_BASE_Y + 4 },
  { x: 220, y: FLOOR_BASE_Y - 6 },
  { x: 320, y: FLOOR_BASE_Y - 24 },
  { x: 430, y: FLOOR_BASE_Y - 40 },
  { x: 540, y: FLOOR_BASE_Y - 20 },
  { x: 650, y: FLOOR_BASE_Y - 8 },
  { x: 760, y: FLOOR_BASE_Y - 30 },
  { x: 880, y: FLOOR_BASE_Y - 46 },
  { x: 990, y: FLOOR_BASE_Y - 18 },
  { x: 1100, y: FLOOR_BASE_Y - 6 },
  { x: 1190, y: FLOOR_BASE_Y - 20 },
  { x: GAME_WIDTH, y: FLOOR_BASE_Y - 12 },
];

export const getGroundY = (terrain: TerrainPoint[], x: number) => {
  const safeX = clamp(x, 0, GAME_WIDTH);

  for (let i = 0; i < terrain.length - 1; i += 1) {
    const a = terrain[i];
    const b = terrain[i + 1];
    if (safeX >= a.x && safeX <= b.x) {
      const span = Math.max(b.x - a.x, 1);
      const t = (safeX - a.x) / span;
      return lerp(a.y, b.y, t);
    }
  }

  return terrain[terrain.length - 1].y;
};
