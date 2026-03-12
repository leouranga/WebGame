import { GAME_WIDTH } from '@/game/constants';
import type { Enemy, EnemyKind } from '@/game/types';

const pickKind = (wave: number): EnemyKind => {
  const roll = Math.random();
  if (wave >= 5 && roll > 0.83) return 'oracle';
  if (wave >= 3 && roll > 0.56) return 'spitter';
  if (wave >= 2 && roll > 0.3) return 'crusher';
  return 'wisp';
};

const getWaveHealthBonus = (wave: number) => Math.floor(wave / 10) * 10;
const getWaveDamageBonus = (wave: number) => Math.floor(wave / 5);

export const createEnemy = (nextId: number, wave: number): Enemy => {
  const kind = pickKind(wave);
  const startX = 56 + Math.random() * (GAME_WIDTH - 112);
  const startY = -90 - Math.random() * 180;
  const base = {
    wisp: {
      width: 26,
      height: 26,
      hp: 3,
      damage: 1,
      speed: 136,
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
      speed: 76,
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
      damage: 2,
      speed: 98,
      ranged: true,
      preferredRange: 300,
      shootRate: 2.6,
      projectileSpeed: 205,
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
      damage: 4,
      speed: 72,
      ranged: true,
      preferredRange: 410,
      shootRate: 3.5,
      projectileSpeed: 235,
      projectileColor: '#fb7185',
      bodyColor: '#f472b6',
      hoverHeight: 165,
      soulDropChance: 0.28,
      soulDropAmount: 2,
      scoreValue: 20,
    },
  }[kind];

  const sizeScale = 0.82 + Math.random() * 0.44;
  const width = Math.round(base.width * sizeScale);
  const height = Math.round(base.height * sizeScale);
  const healthBonus = getWaveHealthBonus(wave);
  const damageBonus = getWaveDamageBonus(wave);
  const speedScale = 1 + (1 - sizeScale) * 0.3;

  return {
    id: nextId,
    kind,
    pos: { x: startX, y: startY },
    vel: { x: 0, y: 22 + Math.random() * 16 },
    width,
    height,
    hp: Math.ceil(base.hp + healthBonus),
    maxHp: Math.ceil(base.hp + healthBonus),
    damage: base.damage + damageBonus,
    speed: Math.round(base.speed * speedScale),
    isRanged: base.ranged,
    preferredRange: base.preferredRange + Math.random() * 40,
    shootCooldown: 1.1 + Math.random() * base.shootRate,
    shootRate: base.shootRate,
    projectileSpeed: base.projectileSpeed,
    projectileColor: base.projectileColor,
    bodyColor: base.bodyColor,
    hoverHeight: base.hoverHeight * (0.94 + Math.random() * 0.12),
    hoverPhase: Math.random() * Math.PI * 2,
    soulDropChance: base.soulDropChance,
    soulDropAmount: base.soulDropAmount,
    scoreValue: base.scoreValue,
    hitFlash: 0,
    slow: 0,
    bleed: 0,
    bodyHitCooldown: 0,
  };
};
