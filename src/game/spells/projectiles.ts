import { clamp } from '@/game/terrain';
import { normalize } from '@/game/utils';
import type { Enemy, GameState, Projectile, Vec } from '@/game/types';

export const createProjectile = (state: GameState, projectile: Omit<Projectile, 'id'>) => {
  state.projectiles.push({ id: state.nextId++, ...projectile });
};

const aimDirection = (from: Vec, to: Vec) => normalize({ x: to.x - from.x, y: to.y - from.y });

export const firePlayerShot = (state: GameState, aim: Vec) => {
  const player = state.player;
  if (player.behavior === 'meteor') {
    const targetX = clamp(aim.x, 24, state.width - 24);
    const targetY = clamp(aim.y, 48, state.height - 40);
    const spawn = { x: targetX + (Math.random() * 60 - 30), y: -50 };
    const direction = aimDirection(spawn, { x: targetX, y: targetY });
    createProjectile(state, {
      pos: spawn,
      vel: { x: direction.x * player.projectileSpeed * 0.55, y: direction.y * player.projectileSpeed * 1.15 },
      radius: player.projectileRadius,
      damage: player.damage,
      color: '#a855f7',
      life: 1.8,
      owner: 'player',
      behavior: 'meteor',
      pierce: 0,
      hitIds: [],
      aoeRadius: player.explosionRadius,
      homingStrength: 0,
    });
    return;
  }

  const origin = { x: player.pos.x + player.facing * 14, y: player.pos.y - 8 };
  const direction = aimDirection(origin, aim);
  const behavior = player.behavior;

  createProjectile(state, {
    pos: origin,
    vel: { x: direction.x * player.projectileSpeed, y: direction.y * player.projectileSpeed },
    radius: player.projectileRadius,
    damage: player.damage,
    color: player.color,
    life: 1.6,
    owner: 'player',
    behavior,
    pierce: behavior === 'pierce' ? 999 : 0,
    hitIds: [],
    aoeRadius: player.explosionRadius,
    homingStrength: player.homingStrength,
  });
};

export const fireEnemyShot = (state: GameState, enemy: Enemy) => {
  const target = { x: state.player.pos.x, y: state.player.pos.y - 8 };
  const direction = aimDirection(enemy.pos, target);

  createProjectile(state, {
    pos: { x: enemy.pos.x, y: enemy.pos.y },
    vel: { x: direction.x * enemy.projectileSpeed, y: direction.y * enemy.projectileSpeed },
    radius: 6,
    damage: enemy.damage,
    color: enemy.projectileColor,
    life: 3,
    owner: 'enemy',
    behavior: 'enemy',
    pierce: 0,
    hitIds: [],
    aoeRadius: 0,
    homingStrength: 0,
  });
};
