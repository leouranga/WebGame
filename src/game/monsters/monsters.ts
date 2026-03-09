import { GAME_WIDTH } from '@/game/constants';
import type { Enemy, EnemyKind } from '@/game/types';

const pickKind = (wave: number): EnemyKind => {
  const roll = Math.random();
  if (wave >= 5 && roll > 0.83) return 'oracle';
  if (wave >= 3 && roll > 0.56) return 'spitter';
  if (wave >= 2 && roll > 0.3) return 'crusher';
  return 'wisp';
};

export const createEnemy = (nextId: number, wave: number): Enemy => {
  const kind = pickKind(wave);
  const startX = 56 + Math.random() * (GAME_WIDTH - 112);
  const startY = -50 - Math.random() * 150;
  const base = {
    wisp: {
      width: 26,
      height: 26,
      hp: 3,
      damage: 1,
      speed: 150,
      ranged: false,
      preferredRange: 0,
      shootRate: 0,
      projectileSpeed: 0,
      projectileColor: '#000000',
      bodyColor: '#fb923c',
      hoverHeight: 94,
      soulDropChance: 0.12,
      soulDropAmount: 1,
      scoreValue: 8,
    },
    crusher: {
      width: 38,
      height: 38,
      hp: 7,
      damage: 2,
      speed: 92,
      ranged: false,
      preferredRange: 0,
      shootRate: 0,
      projectileSpeed: 0,
      projectileColor: '#000000',
      bodyColor: '#f97316',
      hoverHeight: 120,
      soulDropChance: 0.2,
      soulDropAmount: 2,
      scoreValue: 14,
    },
    spitter: {
      width: 30,
      height: 30,
      hp: 4,
      damage: 1,
      speed: 118,
      ranged: true,
      preferredRange: 235,
      shootRate: 1.35,
      projectileSpeed: 320,
      projectileColor: '#f59e0b',
      bodyColor: '#fbbf24',
      hoverHeight: 132,
      soulDropChance: 0.16,
      soulDropAmount: 1,
      scoreValue: 12,
    },
    oracle: {
      width: 34,
      height: 34,
      hp: 8,
      damage: 2,
      speed: 84,
      ranged: true,
      preferredRange: 330,
      shootRate: 2.1,
      projectileSpeed: 430,
      projectileColor: '#fb7185',
      bodyColor: '#f472b6',
      hoverHeight: 165,
      soulDropChance: 0.28,
      soulDropAmount: 2,
      scoreValue: 20,
    },
  }[kind];

  const hpScale = 1 + wave * 0.2;

  return {
    id: nextId,
    kind,
    pos: { x: startX, y: startY },
    vel: { x: 0, y: 35 + Math.random() * 30 },
    width: base.width,
    height: base.height,
    hp: Math.ceil(base.hp * hpScale),
    maxHp: Math.ceil(base.hp * hpScale),
    damage: base.damage,
    speed: base.speed + wave * (base.ranged ? 4 : 6),
    isRanged: base.ranged,
    preferredRange: base.preferredRange + Math.random() * 22,
    shootCooldown: 0.5 + Math.random() * base.shootRate,
    shootRate: base.shootRate,
    projectileSpeed: base.projectileSpeed,
    projectileColor: base.projectileColor,
    bodyColor: base.bodyColor,
    hoverHeight: base.hoverHeight,
    hoverPhase: Math.random() * Math.PI * 2,
    soulDropChance: base.soulDropChance,
    soulDropAmount: base.soulDropAmount,
    scoreValue: base.scoreValue,
    hitFlash: 0,
  };
};
