import { PLAYER_START_X } from '@/game/constants';
import { getGroundY } from '@/game/terrain';
import type { MageDefinition, MageId, Player, TerrainPoint } from '@/game/types';

export const MAGES: MageDefinition[] = [
  {
    id: 'water',
    name: 'Water Mage',
    color: '#38bdf8',
    damage: 1,
    passive: 'Piercing bolts',
    summary: 'Projectiles pierce every enemy they cross.',
    fireInterval: 0.28,
    projectileSpeed: 790,
    projectileRadius: 6,
    behavior: 'pierce',
    explosionRadius: 0,
    homingStrength: 0,
  },
  {
    id: 'fire',
    name: 'Fire Mage',
    color: '#ef4444',
    damage: 4,
    passive: 'Explosive impact',
    summary: 'Every hit bursts in a small area around the target.',
    fireInterval: 0.42,
    projectileSpeed: 730,
    projectileRadius: 7,
    behavior: 'explosive',
    explosionRadius: 56,
    homingStrength: 0,
  },
  {
    id: 'wind',
    name: 'Wind Mage',
    color: '#f8fafc',
    damage: 2,
    passive: 'Balanced casting',
    summary: 'Default mage with no extra gimmick.',
    fireInterval: 0.33,
    projectileSpeed: 770,
    projectileRadius: 6,
    behavior: 'normal',
    explosionRadius: 0,
    homingStrength: 0,
  },
  {
    id: 'earth',
    name: 'Earth Mage',
    color: '#22c55e',
    damage: 2,
    passive: 'Homing projectiles',
    summary: 'Projectiles curve toward enemies while flying.',
    fireInterval: 0.35,
    projectileSpeed: 710,
    projectileRadius: 7,
    behavior: 'homing',
    explosionRadius: 0,
    homingStrength: 5,
  },
  {
    id: 'void',
    name: 'Void Mage',
    color: '#a855f7',
    damage: 3,
    passive: 'Skyfall meteors',
    summary: 'Calls meteors from the sky instead of casting from the body.',
    fireInterval: 0.52,
    projectileSpeed: 760,
    projectileRadius: 10,
    behavior: 'meteor',
    explosionRadius: 68,
    homingStrength: 0,
  },
];

export const getMageDefinition = (id: MageId) => MAGES.find((mage) => mage.id === id) ?? MAGES[2];

export const createPlayer = (terrain: TerrainPoint[], mageId: MageId): Player => {
  const mage = getMageDefinition(mageId);
  const width = 28;
  const height = 44;
  const groundY = getGroundY(terrain, PLAYER_START_X);

  return {
    pos: { x: PLAYER_START_X, y: groundY - height / 2 },
    vel: { x: 0, y: 0 },
    width,
    height,
    onGround: true,
    facing: 1,
    hp: 12,
    maxHp: 12,
    damageTakenMultiplier: 1,
    moveSpeed: 270,
    jumpPower: 650,
    projectileSpeed: mage.projectileSpeed,
    projectileRadius: mage.projectileRadius,
    fireInterval: mage.fireInterval,
    damage: mage.damage,
    color: mage.color,
    name: mage.name,
    passive: mage.passive,
    mageId: mage.id,
    behavior: mage.behavior,
    explosionRadius: mage.explosionRadius,
    homingStrength: mage.homingStrength,
    invuln: 0,
  };
};
