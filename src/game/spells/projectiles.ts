import { getMageDefinition } from '@/game/characters/mages';
import { clamp, getGroundY } from '@/game/terrain';
import { normalize } from '@/game/utils';
import type { CriticalKind, Enemy, GameState, Projectile, Vec } from '@/game/types';

export const createProjectile = (state: GameState, projectile: Omit<Projectile, 'id'>) => {
  const projectileHp = Math.max(1, Math.round(projectile.projectileHp ?? 1));
  state.projectiles.push({
    id: state.nextId++,
    ...projectile,
    projectileHp,
    projectileMaxHp: Math.max(projectileHp, Math.round(projectile.projectileMaxHp ?? projectileHp)),
  });
};

const aimDirection = (from: Vec, to: Vec) => normalize({ x: to.x - from.x, y: to.y - from.y });

const getEnemyProjectileHp = (enemy: Enemy) => Math.max(1, Math.ceil(enemy.damage / 3));

const getDamageMultiplier = (state: GameState) => {
  let multiplier = 1;

  if (state.player.hp <= state.player.maxHp * 0.5 && state.effects.ragePower > 0) {
    const missingRatio = 1 - state.player.hp / Math.max(1, state.player.maxHp * 0.5);
    multiplier += Math.min(0.5, state.effects.ragePower) * Math.max(0, missingRatio);
  }

  return multiplier;
};

const BASE_CRIT_BONUS_MULTIPLIER = 0.5;
const BASE_SUPER_CRIT_BONUS_MULTIPLIER = 1.5;

export const rollCritical = (state: GameState): { multiplier: number; kind: CriticalKind } => {
  let crit = false;
  if (state.effects.firstHitCritReady) {
    crit = true;
    state.effects.firstHitCritReady = false;
  } else if (Math.random() < state.effects.critChance) {
    crit = true;
  }

  if (!crit) return { multiplier: 1, kind: 'none' };

  // A normal critical always deals the current hit damage plus 50% more.
  // Extra crit bonus stacks on top of that baseline.
  if (state.effects.superCrits && Math.random() < 0.25) {
    return {
      multiplier: 1 + BASE_SUPER_CRIT_BONUS_MULTIPLIER + state.effects.critBonus,
      kind: 'super',
    };
  }

  return {
    multiplier: 1 + BASE_CRIT_BONUS_MULTIPLIER + state.effects.critBonus,
    kind: 'crit',
  };
};

export const consumeCriticalMultiplier = (state: GameState) => rollCritical(state).multiplier;

export const firePlayerShot = (state: GameState, aim: Vec) => {
  const player = state.player;
  const sizeMultiplier = state.effects.whiteDwarf ? 1 : state.effects.projectileSizeMultiplier;
  const chargeMultiplier = 1 + state.effects.attackCharges;
  const nonCritDamageMultiplier = getDamageMultiplier(state) * chargeMultiplier;
  const critRoll = rollCritical(state);
  const baseDamage = Math.max(1, Math.round(player.damage * nonCritDamageMultiplier));
  const damage = Math.max(1, Math.round(baseDamage * critRoll.multiplier));
  state.effects.attackCharges = 0;

  if (player.behavior === 'thunder') {
    const baseMageDamage = getMageDefinition(player.mageId).damage;
    const thunderBaseDamage = Math.max(1, Math.round((50 + Math.max(0, player.damage - baseMageDamage)) * nonCritDamageMultiplier * state.effects.thunderboltDamageMultiplier));
    const thunderDamage = Math.max(1, Math.round(thunderBaseDamage * critRoll.multiplier));
    const targetX = clamp(aim.x, 24, state.width - 24);
    const target = {
      x: targetX,
      y: clamp(getGroundY(state.terrain, targetX) - 18, 56, state.height - 26),
    };
    const lineFrom = {
      x: target.x + (Math.random() * 36 - 18),
      y: 20,
    };

    state.thunderStrikes.push({
      id: state.nextId++,
      from: lineFrom,
      to: target,
      life: 0.28,
      maxLife: 0.28,
      style: state.effects.godOfThunder ? 'god' : 'thunder',
    });

    createProjectile(state, {
      pos: target,
      lineFrom,
      vel: { x: 0, y: 0 },
      radius: 2,
      damage: Math.max(1, thunderDamage),
      baseDamage: thunderBaseDamage,
      critKind: critRoll.kind,
      color: state.effects.godOfThunder ? '#ef4444' : '#93c5fd',
      life: 0.02,
      owner: 'player',
      behavior: 'thunder',
      pierce: 1,
      hitIds: [],
      aoeRadius: Math.max(42, player.explosionRadius || 0),
      homingStrength: 0,
      chargeBonus: chargeMultiplier - 1,
      projectileHp: 1 + state.effects.projectileDurability,
      projectileMaxHp: 1 + state.effects.projectileDurability,
    });
    return;
  }

  if (player.behavior === 'meteor') {
    const targetX = clamp(aim.x, 24, state.width - 24);
    const targetY = clamp(aim.y, 48, state.height - 40);
    const spawn = { x: targetX + (Math.random() * 60 - 30), y: -50 };
    const direction = aimDirection(spawn, { x: targetX, y: targetY });
    createProjectile(state, {
      pos: spawn,
      vel: { x: direction.x * player.projectileSpeed * 0.55, y: direction.y * player.projectileSpeed * 1.15 },
      radius: player.projectileRadius * sizeMultiplier,
      damage,
      baseDamage,
      critKind: critRoll.kind,
      color: '#a855f7',
      life: 2.75,
      owner: 'player',
      behavior: 'meteor',
      pierce: state.effects.projectileDurability,
      hitIds: [],
      aoeRadius: player.explosionRadius,
      homingStrength: 0,
      chargeBonus: chargeMultiplier - 1,
      projectileHp: 1 + state.effects.projectileDurability,
      projectileMaxHp: 1 + state.effects.projectileDurability,
    });
    return;
  }

  const origin = { x: player.pos.x + player.facing * 14, y: player.pos.y - 8 };
  const direction = aimDirection(origin, aim);

  createProjectile(state, {
    pos: origin,
    vel: { x: direction.x * player.projectileSpeed, y: direction.y * player.projectileSpeed },
    radius: player.projectileRadius * sizeMultiplier,
    damage,
    baseDamage,
    critKind: critRoll.kind,
    color: player.color,
    life: 2.75,
    owner: 'player',
    behavior: player.behavior,
    pierce: (player.behavior === 'pierce' ? 999 : 0) + state.effects.projectileDurability,
    hitIds: [],
    aoeRadius: player.explosionRadius * state.effects.frictionRadiusMultiplier,
    homingStrength: player.homingStrength,
    chargeBonus: chargeMultiplier - 1,
    projectileHp: 1 + state.effects.projectileDurability,
    projectileMaxHp: 1 + state.effects.projectileDurability,
  });
};

export const fireEnemyShot = (state: GameState, enemy: Enemy) => {
  const target = { x: state.player.pos.x, y: state.player.pos.y - 8 };
  let direction = aimDirection(enemy.pos, target);

  if (state.effects.enemyMissChance > 0 && Math.random() * 100 < state.effects.enemyMissChance) {
    const angle = (Math.random() - 0.5) * 1.2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    direction = {
      x: direction.x * cos - direction.y * sin,
      y: direction.x * sin + direction.y * cos,
    };
    state.texts.push({
      id: state.nextId++,
      pos: { x: state.player.pos.x, y: state.player.pos.y - 34 },
      value: 'miss',
      color: '#e5e7eb',
      life: 0.75,
    });
  }

  const projectileHp = getEnemyProjectileHp(enemy);
  createProjectile(state, {
    pos: { x: enemy.pos.x, y: enemy.pos.y },
    vel: { x: direction.x * enemy.projectileSpeed, y: direction.y * enemy.projectileSpeed },
    radius: enemy.projectileRadius,
    damage: enemy.damage,
    color: enemy.projectileColor,
    life: 3,
    owner: 'enemy',
    behavior: 'enemy',
    pierce: 0,
    hitIds: [],
    aoeRadius: 0,
    homingStrength: 0,
    projectileHp,
    projectileMaxHp: projectileHp,
  });
};
