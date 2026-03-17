import { FLOOR_BASE_Y, GAME_WIDTH } from '@/game/constants';
import type { TerrainPoint } from '@/game/types';

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const createTerrain = (): TerrainPoint[] => [
  // Left mountain descending into the arena
  { x: 0, y: FLOOR_BASE_Y - 192 },
  { x: 42, y: FLOOR_BASE_Y - 170 },
  { x: 82, y: FLOOR_BASE_Y - 146 },
  { x: 120, y: FLOOR_BASE_Y - 118 },
  { x: 156, y: FLOOR_BASE_Y - 92 },
  { x: 192, y: FLOOR_BASE_Y - 64 },
  { x: 228, y: FLOOR_BASE_Y - 36 },
  { x: 266, y: FLOOR_BASE_Y - 12 },

  // Lower arena floor with light variation
  { x: 340, y: FLOOR_BASE_Y + 2 },
  { x: 430, y: FLOOR_BASE_Y + 5 },
  { x: 520, y: FLOOR_BASE_Y + 1 },
  { x: 620, y: FLOOR_BASE_Y - 4 },
  { x: 730, y: FLOOR_BASE_Y - 1 },
  { x: 840, y: FLOOR_BASE_Y + 4 },
  { x: 948, y: FLOOR_BASE_Y },
  { x: 1022, y: FLOOR_BASE_Y - 8 },

  // Right mountain rising back up
  { x: 1060, y: FLOOR_BASE_Y - 30 },
  { x: 1098, y: FLOOR_BASE_Y - 58 },
  { x: 1134, y: FLOOR_BASE_Y - 88 },
  { x: 1170, y: FLOOR_BASE_Y - 118 },
  { x: 1208, y: FLOOR_BASE_Y - 146 },
  { x: 1246, y: FLOOR_BASE_Y - 170 },
  { x: GAME_WIDTH, y: FLOOR_BASE_Y - 192 },
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
