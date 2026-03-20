import { GAME_HEIGHT, GAME_WIDTH, GRAVITY, MONSTER_ATTACK_SPEED_MULTIPLIER, ORB_PULL_RADIUS, PLAYER_I_FRAMES, UPGRADE_REROLL_COST } from '@/game/constants';
import { createPlayer, getMageDefinition, MAGES } from '@/game/characters/mages';
import { buildWaveSpawnKinds, createEnemy } from '@/game/monsters/monsters';
import { createShopItems } from '@/game/shop/items';
import { createProjectile, fireEnemyShot, firePlayerShot, resolvePlayerProjectileProfile, rollCritical } from '@/game/spells/projectiles';
import { clamp, createTerrain, getGroundY, lerp } from '@/game/terrain';
import { createDefaultUnlockedMages, normalizeAccountProgress, type PersistedAccountProgress } from '@/lib/progress';
import type {
  Enemy,
  AuthState,
  FloatingText,
  GameState,
  InputState,
  MageId,
  MenuOverlay,
  Projectile,
  RunEffects,
  ShopItemId,
  SoulOrb,
  QueuedFrictionShot,
  QueuedWispShot,
  WispFollower,
  UpgradeCard,
  UpgradeId,
  Vec,
} from '@/game/types';
import { COMMON_UPGRADES, findUnlockedAscensions, getUpgradeCard, getUpgradeProgressCount, pickUpgradeCards } from '@/game/upgrades';
import { distance, normalize, pointInRect, rectsOverlap } from '@/game/utils';

const addText = (state: GameState, value: string, pos: Vec, color: string) => {
  const normalized = value.trim().toLowerCase();
  if (/[A-Za-z]/.test(value) && normalized !== 'miss') return;
  const text: FloatingText = {
    id: state.nextId++,
    pos: { ...pos },
    value,
    color,
    life: 1,
  };
  state.texts.push(text);
};

const addImpact = (state: GameState, pos: Vec, radius: number, color: string, life = 0.28) => {
  state.impacts.push({
    id: state.nextId++,
    pos: { ...pos },
    radius,
    color,
    life,
    maxLife: life,
  });
};

const THUNDERBOLT_BASE_COOLDOWN = 2;
const THUNDERBOLT_MIN_COOLDOWN = 0.3;

const reduceThunderboltCooldown = (state: GameState, amount: number) => {
  state.effects.thunderboltInterval = Math.max(THUNDERBOLT_MIN_COOLDOWN, state.effects.thunderboltInterval - amount);
};

const getThunderboltBaseDamage = (state: GameState) => {
  const baseMageDamage = getMageDefinition(state.player.mageId).damage;
  return 26 + Math.max(0, state.player.damage - baseMageDamage) + state.effects.thunderboltDamageBonus;
};

const getThunderboltDamage = (state: GameState) => Math.max(1, Math.round(getThunderboltBaseDamage(state) * state.effects.thunderboltDamageMultiplier));
const getThunderboltStyle = (state: GameState): 'thunder' | 'god' => (state.effects.godOfThunder ? 'god' : 'thunder');
const getThunderboltColor = (state: GameState) => (state.effects.godOfThunder ? '#ef4444' : '#60a5fa');
const getThunderboltStrikeRadius = (state: GameState) => (state.effects.godOfThunder ? 78 : 54);
const getThunderboltBoltWidth = (state: GameState) => (state.effects.godOfThunder ? 26 : 22);

const getRageMissingRatio = (state: GameState) => {
  const hpRatio = state.player.hp / Math.max(1, state.player.maxHp);
  if (hpRatio >= 0.5) return 0;
  return Math.max(0, (0.5 - hpRatio) / 0.5);
};

const getWispMageDefinition = (state: GameState) => {
  if (state.player.mageId === 'void') return getMageDefinition('wind');
  if (state.player.mageId === 'avatar') {
    const pool: MageId[] = ['fire', 'wind', 'water', 'earth'];
    return getMageDefinition(pool[Math.floor(Math.random() * pool.length)]);
  }
  return getMageDefinition(state.player.mageId);
};
const EXORCIST_RADIUS = 100;
const MAGE_UNLOCK_COST = 25;
const BRAIN_BOSS_BLAST_RADIUS = 140;

const createGuestAuth = (): AuthState => ({
  isLoggedIn: false,
  userId: null,
  login: null,
  nickname: null,
  highScore: 0,
  highestWave: 0,
});

const fireBrainBossOrb = (state: GameState, enemy: Enemy) => {
  const dir = normalize({ x: state.player.pos.x - enemy.pos.x, y: state.player.pos.y - enemy.pos.y });
  createProjectile(state, {
    pos: { x: enemy.pos.x, y: enemy.pos.y + enemy.height * 0.06 },
    vel: { x: dir.x * 120, y: dir.y * 120 },
    radius: 18,
    damage: 1,
    color: '#f43f5e',
    life: 15,
    owner: 'enemy',
    behavior: 'enemy',
    pierce: 0,
    hitIds: [],
    aoeRadius: 0,
    homingStrength: 0,
    fromUpgrade: 'brainbossOrb',
    sourceEnemyId: enemy.id,
    projectileHp: 8,
    projectileMaxHp: 8,
  });
};

const fireBrainBossLaser = (state: GameState, enemy: Enemy) => {
  const dir = normalize({ x: state.player.pos.x - enemy.pos.x, y: state.player.pos.y - enemy.pos.y });
  createProjectile(state, {
    pos: { x: enemy.pos.x, y: enemy.pos.y },
    vel: { x: dir.x * 820, y: dir.y * 820 },
    radius: 8,
    damage: 2,
    color: '#22c55e',
    life: 2.8,
    owner: 'enemy',
    behavior: 'enemyLaser',
    pierce: 0,
    hitIds: [],
    aoeRadius: 0,
    homingStrength: 0,
    fromUpgrade: 'brainbossLaser',
    sourceEnemyId: enemy.id,
    projectileHp: 99,
    projectileMaxHp: 99,
  });
};

const castBrainBossBlast = (state: GameState, enemy: Enemy) => {
  addImpact(state, { x: enemy.pos.x, y: enemy.pos.y }, BRAIN_BOSS_BLAST_RADIUS, 'rgba(251,113,133,0.72)', 0.34);
  if (distance(state.player.pos, enemy.pos) <= BRAIN_BOSS_BLAST_RADIUS + Math.max(state.player.width, state.player.height) * 0.35) {
    damagePlayer(state, 5, enemy);
  }
};

const isBosslado = (enemy: Enemy) => enemy.kind === 'bossladoLaser' || enemy.kind === 'bossladoOrb';

const fireBossladoOrb = (state: GameState, enemy: Enemy) => {
  const dir = normalize({ x: state.player.pos.x - enemy.pos.x, y: state.player.pos.y - enemy.pos.y });
  createProjectile(state, {
    pos: { x: enemy.pos.x, y: enemy.pos.y + enemy.height * 0.08 },
    vel: { x: dir.x * 160, y: dir.y * 160 },
    radius: 16,
    damage: 300,
    color: '#a855f7',
    life: 12,
    owner: 'enemy',
    behavior: 'enemy',
    pierce: 0,
    hitIds: [],
    aoeRadius: 0,
    homingStrength: 0,
    fromUpgrade: 'bossladoOrb',
    sourceEnemyId: enemy.id,
    projectileHp: 7,
    projectileMaxHp: 7,
  });
};

const fireBossladoLaser = (state: GameState, enemy: Enemy) => {
  const dir = normalize({ x: state.player.pos.x - enemy.pos.x, y: state.player.pos.y - enemy.pos.y });
  createProjectile(state, {
    pos: { x: enemy.pos.x, y: enemy.pos.y },
    vel: { x: dir.x * 360, y: dir.y * 360 },
    radius: 9,
    damage: 250,
    color: '#22c55e',
    life: 4.5,
    owner: 'enemy',
    behavior: 'enemy',
    pierce: 0,
    hitIds: [],
    aoeRadius: 0,
    homingStrength: 0,
    fromUpgrade: 'bossladoLaser',
    sourceEnemyId: enemy.id,
    projectileHp: 1,
    projectileMaxHp: 1,
  });
};

const startBossladoDash = (state: GameState, enemy: Enemy) => {
  const onLeftSide = enemy.pos.x < state.width * 0.5;
  const edgeInset = enemy.width * 0.56 + 14;
  const targetX = onLeftSide ? state.width - edgeInset : edgeInset;
  const dashY = clamp(100 + Math.random() * (state.height - 280), 104, state.height - 176);
  enemy.bossDashTargetX = targetX;
  enemy.bossDashTargetY = dashY;
  const dx = targetX - enemy.pos.x;
  const dy = dashY - enemy.pos.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const speed = 1280 + Math.random() * 140;
  enemy.bossDashTime = dist / speed;
  enemy.vel.x = (dx / dist) * speed;
  enemy.vel.y = (dy / dist) * speed;
};

const spawnLightningStrike = (state: GameState, to: Vec, style: 'thunder' | 'soul' | 'god' = 'thunder', from?: Vec, flashRadius?: number, boltWidth?: number) => {
  state.thunderStrikes.push({
    id: state.nextId++,
    from: from ?? { x: to.x + (Math.random() * 60 - 30), y: 20 },
    to: { ...to },
    life: 0.28,
    maxLife: 0.28,
    style,
    flashRadius,
    boltWidth,
  });
};

const createEffects = (): RunEffects => ({
  critChance: 0,
  critBonus: 0,
  projectileDurability: 0,
  soulDropBonus: 0,
  projectileSizeMultiplier: 1,
  invulnMultiplier: 1,
  cloakInvulnDuration: 0,
  fragmentationCount: 0,
  fragmentationDamageBonus: 0,
  fragmentationLifeMultiplier: 1,
  fragmentationSizeMultiplier: 1,
  frictionShots: 0,
  frictionRadiusMultiplier: 1,
  lifesteal: 0,
  uncommonChanceBonus: 0,
  healOrbChance: 0,
  ragePower: 0,
  regrowthRate: 0,
  thunderboltCount: 0,
  thunderboltTimer: THUNDERBOLT_BASE_COOLDOWN,
  thunderboltInterval: THUNDERBOLT_BASE_COOLDOWN,
  thunderboltDamageBonus: 0,
  thunderboltDamageMultiplier: 1,
  godOfThunder: false,
  appraisalChoices: 0,
  barrierReady: false,
  barrierCooldown: 0,
  barrierTimer: 0,
  coldPerHit: 0,
  maxSlow: 0.8,
  reviveCharges: 0,
  commonEffectivenessBonus: 0,
  wisps: 0,
  wispTimer: 0.85,
  wound: false,
  bleedDamageMultiplier: 1,
  bodyDamage: 0,
  runDistance: 0,
  frictionDistance: 0,
  stationaryTime: 0,
  focusBonus: 0,
  focusGainPerSecond: 0,
  bunkerArmor: 0,
  bunkerArmorCap: 0,
  resistArmor: 0,
  freeReroll: false,
  freeRerollAvailable: false,
  epicChanceBonus: 0,
  absorbent: false,
  avenger: false,
  avengerCooldown: 0,
  desperate: false,
  enchanter: false,
  soulBeam: false,
  freezeExecute: false,
  infiniteJump: false,
  enemyMissChance: 0,
  firstHitCritReady: false,
  randomCommonEachWave: false,
  pacMan: false,
  plague: false,
  plagueTimer: 1,
  protector: false,
  reflectDamage: 0,
  superCrits: false,
  streamer: false,
  streamerTimer: 0.18,
  streamerInterval: 0.18,
  vampire: false,
  blackHoleOnImpact: false,
  whiteDwarf: false,
  bulldozer: false,
  burningMan: false,
  burningManTimer: 2,
  comet: false,
  airPeakY: 0,
  hoarder: false,
  attackCharges: 0,
  jumpHoldTimer: 0,
  jumpHoldMax: 0.2,
  streamerBeam: null,
});

const hasAscension = (state: GameState, id: string) => state.ascensions.some((entry) => entry.id === id);

const hasActiveShopItem = (state: GameState, itemId: ShopItemId) => state.shopItems.some((item) => item.id === itemId && item.owned && item.active);

const openAscensionNotice = (state: GameState, cards: UpgradeCard[]) => {
  if (cards.length === 0) return;

  const returnStatus = state.status === 'ascension' ? state.ascensionNotice.returnStatus : state.status;
  const nextQueue = [...state.ascensionNotice.queue, ...cards];
  const active = state.ascensionNotice.active ?? nextQueue.shift() ?? null;

  state.ascensionNotice = {
    active,
    queue: nextQueue,
    returnStatus,
  };

  if (state.ascensionNotice.active) state.status = 'ascension';
};

const closeAscensionNotice = (state: GameState) => {
  if (state.ascensionNotice.queue.length > 0) {
    state.ascensionNotice.active = state.ascensionNotice.queue.shift() ?? null;
    state.status = 'ascension';
    return;
  }

  state.ascensionNotice.active = null;
  state.status = state.ascensionNotice.returnStatus;
};

const createOrb = (state: GameState, pos: Vec, amount: number, kind: 'soul' | 'heal') => {
  const orb: SoulOrb = {
    id: state.nextId++,
    pos: { x: pos.x, y: pos.y },
    vel: { x: Math.random() * 80 - 40, y: -40 - Math.random() * 40 },
    value: amount,
    radius: kind === 'heal' ? 7 : 6,
    life: 14,
    kind,
  };
  state.soulOrbs.push(orb);
};

const healPlayer = (state: GameState, amount: number) => {
  if (amount <= 0) return;
  const before = state.player.hp;
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + amount);
  const healed = state.player.hp - before;
  if (healed >= 1) addText(state, `+${Math.round(healed)}`, { x: state.player.pos.x, y: state.player.pos.y - 26 }, '#86efac');
};

const syncPlayerSize = (state: GameState, scale: number) => {
  const player = state.player;
  const foot = player.pos.y + player.height / 2;
  player.width = player.baseWidth * scale;
  player.height = player.baseHeight * scale;
  player.pos.y = foot - player.height / 2;
  if (player.onGround) {
    player.pos.y = getGroundY(state.terrain, player.pos.x) - player.height / 2;
  }
};
const growPlayerFromHealthUpgrade = (state: GameState, amount = 0.05) => {
  const currentScale = state.player.width / state.player.baseWidth;
  syncPlayerSize(state, Math.min(2.8, currentScale + amount));
};

const getJumpHoldMax = (state: GameState) => {
  const impulseLevels = state.upgradeCounts.impulse ?? 0;
  return clamp(0.1 + impulseLevels * 0.025, 0.1, 0.3);
};

const applyMaxHealthUpgrade = (state: GameState, maxHpGain: number, healGain = maxHpGain) => {
  state.player.maxHp += maxHpGain;
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + healGain);
};


const getArmorMultiplier = (armorPercent: number, cap = 95) => {
  if (armorPercent <= 0) return 1;
  return 1 - Math.min(cap, armorPercent) / 100;
};

const getEffectiveArmorPercent = (state: GameState) => {
  const bunker = Math.min(95, Math.max(0, state.effects.bunkerArmor));
  const resist = Math.min(90, Math.max(0, state.effects.resistArmor));
  const combined = 1 - getArmorMultiplier(bunker, 95) * getArmorMultiplier(resist, 90);
  return Math.max(0, Math.min(95, combined * 100));
};

const getCurrentDefenseMultiplier = (state: GameState) => {
  const bunker = getArmorMultiplier(state.effects.bunkerArmor, 95);
  const resist = getArmorMultiplier(state.effects.resistArmor, 90);
  return state.player.damageTakenMultiplier * bunker * resist;
};

const spawnProtectorBurst = (state: GameState) => {
  const count = 30;
  const profile = resolvePlayerProjectileProfile(state, { allowThunder: false });
  const sizeMultiplier = state.effects.whiteDwarf ? 1 : state.effects.projectileSizeMultiplier;
  const damage = Math.max(1, Math.round(state.player.damage * getCurrentRageMultiplier(state)));
  const speed = Math.max(280, profile.projectileSpeed * 0.8);

  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    createProjectile(state, {
      pos: { x: state.player.pos.x, y: state.player.pos.y - 6 },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      radius: profile.projectileRadius * sizeMultiplier,
      damage,
      baseDamage: damage,
      color: profile.color,
      life: 1.35,
      owner: 'player',
      behavior: profile.behavior,
      pierce: (profile.behavior === 'pierce' ? 999 : 0) + state.effects.projectileDurability,
      hitIds: [],
      aoeRadius: profile.aoeRadius * state.effects.frictionRadiusMultiplier,
      homingStrength: profile.homingStrength,
      projectileHp: 1 + state.effects.projectileDurability,
      projectileMaxHp: 1 + state.effects.projectileDurability,
      fromUpgrade: 'protector',
    });
  }
};

const distanceToSegment = (point: Vec, a: Vec, b: Vec) => {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = point.x - a.x;
  const apy = point.y - a.y;
  const abLenSq = abx * abx + aby * aby || 1;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
  const cx = a.x + abx * t;
  const cy = a.y + aby * t;
  return Math.hypot(point.x - cx, point.y - cy);
};

const getCurrentFireInterval = (state: GameState) => Math.max(0.06, state.player.fireInterval / (1 + state.effects.focusBonus));
const getAttackSpeedFactor = (state: GameState) => {
  const baseInterval = getMageDefinition(state.player.mageId).fireInterval || state.player.fireInterval || 1;
  return Math.max(0.85, Math.min(3.2, baseInterval / Math.max(0.06, getCurrentFireInterval(state))));
};
const getFrictionTravelThreshold = (state: GameState) => Math.max(56, 132 - Math.max(0, state.effects.frictionShots - 1) * 16);
const getWaveSpawnCount = (waveNumber: number) => (waveNumber === 50 ? 1 : waveNumber === 100 ? 2 : waveNumber + 1);

const beginDeathScreen = (state: GameState) => {
  state.status = 'death';
  state.enemies = [];
  state.projectiles = [];
  state.soulOrbs = [];
  state.upgrades = [];
  state.queuedFrictionShots = [];
  state.queuedWispShots = [];
  state.wispFollowers = [];
  addText(state, 'Run ended', { x: state.width / 2, y: 118 }, '#f8fafc');
};

const damagePlayer = (state: GameState, rawAmount: number, attacker?: Enemy | Projectile) => {
  const player = state.player;
  if (state.status !== 'playing') return;

  if (player.invuln > 0) {
    if (state.effects.absorbent && attacker && 'behavior' in attacker) {
      healPlayer(state, 1);
    }
    return;
  }

  if (state.effects.barrierReady) {
    state.effects.barrierReady = false;
    state.effects.barrierTimer = state.effects.barrierCooldown;
    player.invuln = state.effects.cloakInvulnDuration > 0
      ? state.effects.cloakInvulnDuration
      : PLAYER_I_FRAMES * state.effects.invulnMultiplier;
    addText(state, 'Blocked', { x: player.pos.x, y: player.pos.y - 28 }, '#93c5fd');
    if (state.effects.protector) {
      spawnProtectorBurst(state);
    }
    return;
  }

  const amount = Math.max(1, Math.round(rawAmount * getCurrentDefenseMultiplier(state)));
  player.hp = Math.max(0, player.hp - amount);
  player.invuln = state.effects.cloakInvulnDuration > 0
    ? state.effects.cloakInvulnDuration
    : PLAYER_I_FRAMES * state.effects.invulnMultiplier;
  addText(state, `-${amount}`, { x: player.pos.x, y: player.pos.y - 28 }, '#f87171');

  if (state.effects.reflectDamage > 0) {
    const reflectedDamage = Math.max(1, Math.round(getEffectiveArmorPercent(state) * 2));
    if (attacker && 'hp' in attacker) {
      damageEnemy(state, attacker, reflectedDamage, '#fca5a5');
    } else if (attacker && 'sourceEnemyId' in attacker && typeof attacker.sourceEnemyId === 'number') {
      const sourceEnemy = state.enemies.find((enemy) => enemy.id === attacker.sourceEnemyId);
      if (sourceEnemy) damageEnemy(state, sourceEnemy, reflectedDamage, '#fca5a5');
    }
  }

  if (player.hp <= 0) {
    if (state.effects.reviveCharges > 0) {
      state.effects.reviveCharges -= 1;
      player.hp = Math.max(1, Math.round(player.maxHp * 0.5));
      addText(state, 'Revive!', { x: player.pos.x, y: player.pos.y - 44 }, '#facc15');
      state.enemies = [];
      return;
    }

    if (state.effects.avenger && state.effects.avengerCooldown <= 0) {
      const survivors = Math.floor(state.enemies.length / 2);
      state.enemies = state.enemies.slice(0, survivors);
      player.hp = Math.max(1, Math.round(player.maxHp * 0.5));
      state.effects.avengerCooldown = 5;
      addText(state, 'Avenger', { x: player.pos.x, y: player.pos.y - 44 }, '#fb923c');
      return;
    }

    beginDeathScreen(state);
  }
};

const trySoulDrop = (state: GameState, enemy: Enemy) => {
  const soulChance = enemy.soulDropChance + state.effects.soulDropBonus;
  if (Math.random() <= soulChance) {
    createOrb(state, enemy.pos, 1, 'soul');
    addText(state, '+1 soul', { x: enemy.pos.x, y: enemy.pos.y - 20 }, '#c084fc');
  }

  if (Math.random() <= state.effects.healOrbChance) {
    createOrb(state, enemy.pos, 5 + Math.max(0, state.upgradeCounts.orb ?? 0), 'heal');
  }
};

const getCurrentRageMultiplier = (state: GameState) => {
  if (state.effects.ragePower <= 0) return 1;
  return 1 + state.effects.ragePower * 0.5 * getRageMissingRatio(state);
};

const hasFragmentationPlus = (state: GameState) => (state.upgradeCounts.fragmentationPlus ?? 0) > 0;

const getFragmentationSpawnCount = (state: GameState) =>
  hasFragmentationPlus(state) ? 6 : state.effects.fragmentationCount;

const getFragmentGenerationLoss = (state: GameState) => (hasAscension(state, 'ramDestroyer') ? 0.1 : 0.5);

const getFragmentationSpawnDamage = (state: GameState, sourceProjectile?: Projectile) => {
  if (!hasFragmentationPlus(state)) {
    return 2 + state.effects.fragmentationDamageBonus;
  }

  if (sourceProjectile?.behavior === 'fragment') {
    const sourceDamage = Math.max(1, Math.round(sourceProjectile.baseDamage ?? sourceProjectile.damage));
    return Math.max(1, Math.round(sourceDamage * (1 - getFragmentGenerationLoss(state))));
  }

  return Math.max(1, Math.round(state.player.damage * getCurrentRageMultiplier(state) * 0.7));
};

const spawnFragments = (state: GameState, pos: Vec, count: number, damage: number, color: string) => {
  const origin = { x: pos.x, y: pos.y };
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 250 + Math.random() * 130;
    createProjectile(state, {
      pos: { x: origin.x, y: origin.y },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      radius: 6 * state.effects.fragmentationSizeMultiplier,
      damage,
      baseDamage: damage,
      color,
      life: 1.15 * state.effects.fragmentationLifeMultiplier,
      owner: 'player',
      behavior: 'fragment',
      pierce: 0,
      hitIds: [],
      aoeRadius: 18,
      homingStrength: 0,
      fromUpgrade: 'fragmentation',
    });
  }
};

const killEnemy = (state: GameState, enemy: Enemy, sourceProjectile?: Projectile) => {
  if (enemy.deathHandled) return;
  enemy.deathHandled = true;
  enemy.hp = 0;
  const deathPos = { x: enemy.pos.x, y: enemy.pos.y };
  state.score += enemy.scoreValue + state.wave.number * 4;
  state.wave.cleared += 1;
  trySoulDrop(state, { ...enemy, pos: deathPos });
  if (state.effects.fragmentationCount > 0) {
    const fragmentCount = getFragmentationSpawnCount(state);
    const fragmentDamage = getFragmentationSpawnDamage(state, sourceProjectile);
    spawnFragments(state, deathPos, fragmentCount, fragmentDamage, '#a855f7');
    addImpact(state, deathPos, 24 + fragmentCount * 2, 'rgba(168,85,247,0.82)', 0.22);
  }
};

const getBleedTickInterval = (state: GameState) => 1 / Math.max(1, state.effects.bleedDamageMultiplier);

const CRIT_DAMAGE_COLOR = '#facc15';
const SUPER_CRIT_DAMAGE_COLOR = '#f472b6';
const getForcedCritMultiplier = (state: GameState) => 1.5 + state.effects.critBonus;

const resolveProjectileHit = (state: GameState, enemy: Enemy, projectile: Projectile) => {
  let damage = Math.max(1, Math.round(projectile.damage));
  let critKind = projectile.critKind ?? 'none';

  if (hasAscension(state, 'marksman') && !enemy.marksmanCritConsumed) {
    enemy.marksmanCritConsumed = true;
    if (critKind === 'none') {
      const baseDamage = Math.max(1, Math.round(projectile.baseDamage ?? projectile.damage));
      damage = Math.max(1, Math.round(baseDamage * getForcedCritMultiplier(state)));
      critKind = 'crit';
    }
  }

  const color = critKind === 'super'
    ? SUPER_CRIT_DAMAGE_COLOR
    : critKind === 'crit'
      ? CRIT_DAMAGE_COLOR
      : projectile.color;

  return { damage, color };
};

const damageEnemy = (state: GameState, enemy: Enemy, amount: number, color = '#ffffff', applyOnHitEffects = true, sourceProjectile?: Projectile) => {
  if (enemy.deathHandled) return;
  if (enemy.hp <= 0) {
    killEnemy(state, enemy, sourceProjectile);
    return;
  }
  enemy.hp -= amount;
  enemy.hitFlash = 0.12;
  addText(state, `${amount}`, { x: enemy.pos.x, y: enemy.pos.y - 12 }, color);
  addImpact(state, { x: enemy.pos.x, y: enemy.pos.y }, Math.max(16, enemy.width * 0.42), color, 0.18);

  if (applyOnHitEffects && state.effects.coldPerHit > 0) {
    enemy.slow = Math.min(state.effects.maxSlow, enemy.slow + state.effects.coldPerHit);
  }

  if (applyOnHitEffects && state.effects.wound) {
    enemy.bleed = Number.POSITIVE_INFINITY;
    enemy.bleedStacks = Math.max(0, enemy.bleedStacks) + 1;
    enemy.bleedTickTimer = Math.min(enemy.bleedTickTimer, getBleedTickInterval(state));
  }

  if (applyOnHitEffects && state.effects.lifesteal > 0) {
    healPlayer(state, Math.max(0, amount * state.effects.lifesteal));
  }

  if (applyOnHitEffects && state.effects.vampire) {
    healPlayer(state, Math.max(0, amount * 0.5));
  }

  if (applyOnHitEffects && state.effects.freezeExecute && enemy.slow >= 1 && Math.random() < 0.01) {
    enemy.hp = 0;
  }

  if (enemy.hp <= 0) {
    killEnemy(state, enemy, sourceProjectile);
  }
};

const explodeAt = (
  state: GameState,
  center: Vec,
  radius: number,
  damage: number,
  color: string,
  excludedEnemyIds: number[] = [],
  sourceProjectile?: Projectile,
) => {
  addImpact(state, center, radius, color, 0.26);
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 || enemy.deathHandled) continue;
    if (excludedEnemyIds.includes(enemy.id)) continue;
    const dist = distance(enemy.pos, center);
    if (dist <= radius) {
      let finalDamage = damage;
      if (sourceProjectile?.behavior === 'friction' && hasAscension(state, 'antiAircraft')) {
        const proximity = Math.max(0, 1 - dist / Math.max(1, radius));
        finalDamage = Math.max(1, Math.round(damage * (1 + proximity)));
      }
      damageEnemy(state, enemy, finalDamage, color, true, sourceProjectile);
    }
  }
};

const nearestEnemy = (state: GameState, from: Vec, maxDistance = Number.POSITIVE_INFINITY) => {
  let best: Enemy | null = null;
  let bestDistance = maxDistance;

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 || enemy.deathHandled) continue;
    const current = distance(from, enemy.pos);
    if (current < bestDistance) {
      best = enemy;
      bestDistance = current;
    }
  }

  return best;
};

const clampEnemyToArena = (state: GameState, enemy: Enemy) => {
  enemy.pos.x = clamp(enemy.pos.x, enemy.width / 2 + 10, state.width - enemy.width / 2 - 10);

  const ceiling = enemy.height / 2 + 12;
  const floorOffset = enemy.isRanged ? 0.42 : 0.45;
  const floor = getGroundY(state.terrain, enemy.pos.x) - enemy.height * floorOffset;
  enemy.pos.y = clamp(enemy.pos.y, ceiling, floor);
};


const resolvePlayerEnemyCollision = (state: GameState, enemy: Enemy) => {
  if (enemy.hp <= 0 || enemy.deathHandled) return;

  const player = state.player;
  const playerCenterY = player.pos.y - 6;
  const dx = player.pos.x - enemy.pos.x;
  const dy = playerCenterY - enemy.pos.y;
  const overlapX = player.width / 2 + enemy.width / 2 - Math.abs(dx);
  const overlapY = player.height / 2 + enemy.height / 2 - Math.abs(dy);

  if (overlapX <= 0 || overlapY <= 0) return;

  const enemyShare = state.effects.bulldozer ? 0.56 : 0.24;
  const playerShare = 1 - enemyShare;

  if (overlapX <= overlapY * 1.15) {
    const sx = dx >= 0 ? 1 : -1;
    const separation = overlapX + 0.8;
    player.pos.x += sx * separation * playerShare;
    enemy.pos.x -= sx * separation * enemyShare;
    if (player.vel.x * sx < 0) player.vel.x = 0;
  } else {
    const sy = dy >= 0 ? 1 : -1;
    const separation = overlapY + 0.6;
    const verticalEnemyShare = state.effects.bulldozer ? 0.38 : 0.12;
    const verticalPlayerShare = 1 - verticalEnemyShare;
    player.pos.y += sy * separation * verticalPlayerShare;
    enemy.pos.y -= sy * separation * verticalEnemyShare;
    if (player.vel.y * sy < 0) player.vel.y = 0;
  }

  player.pos.x = clamp(player.pos.x, player.width / 2 + 8, state.width - player.width / 2 - 8);
  const playerCeiling = player.height / 2 + 8;
  const playerGround = getGroundY(state.terrain, player.pos.x) - player.height / 2;
  player.pos.y = clamp(player.pos.y, playerCeiling, playerGround);
  clampEnemyToArena(state, enemy);
};

const resolvePlayerEnemyCollisions = (state: GameState) => {
  for (let pass = 0; pass < 2; pass += 1) {
    for (const enemy of state.enemies) {
      if (enemy.kind === 'brainboss' || isBosslado(enemy)) continue;
      resolvePlayerEnemyCollision(state, enemy);
    }
  }
};

const separateEnemies = (state: GameState) => {
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 0; i < state.enemies.length; i += 1) {
      const a = state.enemies[i];
      if (a.hp <= 0 || a.deathHandled || a.kind === 'brainboss' || isBosslado(a)) continue;

      for (let j = i + 1; j < state.enemies.length; j += 1) {
        const b = state.enemies[j];
        if (b.hp <= 0 || b.deathHandled || b.kind === 'brainboss' || isBosslado(b)) continue;

        const dx = b.pos.x - a.pos.x;
        const dy = b.pos.y - a.pos.y;
        const minDistance = Math.max(20, (Math.max(a.width, a.height) + Math.max(b.width, b.height)) * 0.42);
        const distanceSq = dx * dx + dy * dy;

        if (distanceSq >= minDistance * minDistance) continue;

        const distanceValue = Math.sqrt(distanceSq);
        const nx = distanceValue > 0.0001 ? dx / distanceValue : ((a.id + b.id) % 2 === 0 ? 1 : -1);
        const ny = distanceValue > 0.0001 ? dy / distanceValue : 0;
        const overlap = minDistance - Math.max(distanceValue, 0.001);
        const push = overlap * 0.52;

        a.pos.x -= nx * push;
        a.pos.y -= ny * push;
        b.pos.x += nx * push;
        b.pos.y += ny * push;

        clampEnemyToArena(state, a);
        clampEnemyToArena(state, b);
      }
    }
  }
};


const separateBossladoEyes = (state: GameState) => {
  const eyes = state.enemies.filter((enemy) => enemy.hp > 0 && !enemy.deathHandled && isBosslado(enemy));
  if (eyes.length < 2) return;

  for (let pass = 0; pass < 3; pass += 1) {
    for (let i = 0; i < eyes.length; i += 1) {
      const a = eyes[i];
      for (let j = i + 1; j < eyes.length; j += 1) {
        const b = eyes[j];
        const dx = b.pos.x - a.pos.x;
        const dy = b.pos.y - a.pos.y;
        const minDistance = (Math.max(a.width, a.height) + Math.max(b.width, b.height)) * 0.62;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq >= minDistance * minDistance) continue;

        const distanceValue = Math.sqrt(distanceSq);
        const nx = distanceValue > 0.0001 ? dx / distanceValue : (i % 2 === 0 ? 1 : -1);
        const ny = distanceValue > 0.0001 ? dy / distanceValue : 0;
        const overlap = minDistance - Math.max(distanceValue, 0.001);
        const push = overlap * 0.5 + 0.6;

        a.pos.x -= nx * push;
        a.pos.y -= ny * push;
        b.pos.x += nx * push;
        b.pos.y += ny * push;

        clampEnemyToArena(state, a);
        clampEnemyToArena(state, b);
      }
    }
  }
};

const getThunderHitTarget = (state: GameState, from: Vec, to: Vec, boltWidth: number) => {
  const abx = to.x - from.x;
  const aby = to.y - from.y;
  const abLenSq = abx * abx + aby * aby || 1;
  let bestEnemy: Enemy | null = null;
  let bestT = Number.POSITIVE_INFINITY;

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 || enemy.deathHandled) continue;
    const apx = enemy.pos.x - from.x;
    const apy = enemy.pos.y - from.y;
    const t = (apx * abx + apy * aby) / abLenSq;
    if (t < 0 || t > 1) continue;
    const reach = Math.max(enemy.width, enemy.height) * 0.44 + boltWidth;
    if (distanceToSegment(enemy.pos, from, to) > reach) continue;
    if (t < bestT) {
      bestT = t;
      bestEnemy = enemy;
    }
  }

  return bestEnemy;
};

const getThunderStrikeGroundTarget = (state: GameState, x: number) => {
  const targetX = clamp(x, 24, state.width - 24);
  const groundY = getGroundY(state.terrain, targetX);
  return {
    x: targetX,
    y: clamp(groundY, 56, state.height - 20),
  };
};

const createState = (): GameState => {
  const terrain = createTerrain();
  const selectedMage: MageId = 'wind';

  return {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    status: 'menu',
    tick: 0,
    nextId: 1,
    selectedMage,
    unlockedMages: createDefaultUnlockedMages(),
    terrain,
    player: createPlayer(terrain, selectedMage),
    projectiles: [],
    enemies: [],
    soulOrbs: [],
    texts: [],
    thunderStrikes: [],
    impacts: [],
    queuedFrictionShots: [],
    queuedWispShots: [],
    wispFollowers: [],
    wave: {
      number: 1,
      toSpawn: getWaveSpawnCount(1),
      spawned: 0,
      cleared: 0,
      spawnTimer: 0.24,
      spawnKinds: buildWaveSpawnKinds(1, getWaveSpawnCount(1)),
    },
    fireTimer: 0.1,
    souls: 0,
    score: 0,
    upgrades: [],
    upgradeCounts: {},
    ascensions: [],
    shopItems: createShopItems(),
    ui: {
      mageCards: [],
      startRect: null,
      shopRect: null,
      loginRect: null,
      registerRect: null,
      rankingRect: null,
      logoutRect: null,
      upgradeCards: [],
      hudUpgradeIcons: [],
      shopCards: [],
      nextWaveRect: null,
      restartRect: null,
      menuRect: null,
      rerollRect: null,
    },
    pointer: { x: GAME_WIDTH * 0.7, y: GAME_HEIGHT * 0.45 },
    effects: createEffects(),
    ascensionNotice: {
      active: null,
      queue: [],
      returnStatus: 'playing',
    },
    auth: createGuestAuth(),
    menuOverlay: null,
  };
};

export const createGameState = createState;

export const setAuthState = (state: GameState, auth: Partial<AuthState>) => {
  state.auth = { ...state.auth, ...auth };
};

export const consumeMenuOverlayRequest = (state: GameState): MenuOverlay | null => {
  const nextOverlay = state.menuOverlay;
  state.menuOverlay = null;
  return nextOverlay;
};

export const exportAccountProgress = (state: GameState): PersistedAccountProgress => normalizeAccountProgress({
  souls: state.souls,
  selectedMage: state.selectedMage,
  unlockedMages: state.unlockedMages,
  shopItems: state.shopItems.map((item) => ({
    id: item.id,
    owned: item.owned,
    active: item.active,
  })),
  currentScore: state.score,
  currentWave: state.wave.number,
});

export const applyAccountProgress = (state: GameState, progress: PersistedAccountProgress) => {
  const normalized = normalizeAccountProgress(progress);
  const auth = { ...state.auth };
  const fresh = createState();
  Object.assign(state, fresh);
  state.auth = auth;
  state.menuOverlay = null;
  state.souls = normalized.souls;
  state.unlockedMages = { ...normalized.unlockedMages, wind: true };
  state.selectedMage = state.unlockedMages[normalized.selectedMage] ? normalized.selectedMage : 'wind';

  const savedItems = new Map(normalized.shopItems.map((item) => [item.id, item]));
  state.shopItems = createShopItems().map((item) => {
    const saved = savedItems.get(item.id);
    return {
      ...item,
      owned: saved?.owned ?? false,
      active: saved?.owned ? Boolean(saved.active) : false,
    };
  });

  state.player = createPlayer(state.terrain, state.selectedMage);
  applyOwnedShopItemsToPlayer(state);
};

const applyOwnedShopItemsToPlayer = (state: GameState) => {
  state.player.damageTakenMultiplier = 1;
  state.player.moveSpeed = 270;
  state.player.jumpPower = 650;
  state.player.maxJumps = 1;

  for (const item of state.shopItems) {
    if (!item.owned || !item.active) continue;

    if (item.id === 'bulwarkStaff') {
      state.player.damageTakenMultiplier *= 0.8;
      state.player.moveSpeed *= 0.62;
    }

    if (item.id === 'vaultStaff') {
      state.player.maxJumps = Math.max(state.player.maxJumps, 2);
    }
  }

  state.player.jumpsRemaining = Math.max(0, state.player.maxJumps - 1);
};


const resetPerWaveEffects = (state: GameState) => {
  state.effects.stationaryTime = 0;
  state.effects.focusBonus = 0;
  state.effects.bunkerArmor = 0;
  state.impacts = [];
  state.queuedFrictionShots = [];
  state.queuedWispShots = [];
  state.wispFollowers = [];
  state.effects.firstHitCritReady = false;
  state.effects.freeRerollAvailable = state.effects.freeReroll;
  state.effects.airPeakY = state.player.pos.y;
  state.player.jumpsRemaining = Math.max(0, state.player.maxJumps - 1);
  state.player.onGround = true;
};

const applyRandomCommon = (state: GameState) => {
  const card = COMMON_UPGRADES[Math.floor(Math.random() * COMMON_UPGRADES.length)];
  if (card) {
    applyUpgrade(state, card.id, true);
  }
};

const startWave = (state: GameState, number: number) => {
  if (number > 1) applyMaxHealthUpgrade(state, 2, 2);

  state.wave = {
    number,
    toSpawn: getWaveSpawnCount(number),
    spawned: 0,
    cleared: 0,
    spawnTimer: 0.24,
    spawnKinds: buildWaveSpawnKinds(number, getWaveSpawnCount(number)),
  };
  state.status = 'playing';
  state.fireTimer = 0.1;
  if (state.effects.desperate) state.player.hp = state.player.maxHp;
  if (state.effects.avengerCooldown > 0 && number > 1) state.effects.avengerCooldown -= 1;
  resetPerWaveEffects(state);
  if (state.effects.randomCommonEachWave) applyRandomCommon(state);
  addText(state, `Wave ${number}`, { x: state.width / 2, y: 88 }, '#f5d0fe');
};

const beginBetweenWave = (state: GameState) => {
  if (state.player.hp <= 0 || state.status !== 'playing') return;
  state.status = 'between';
  state.queuedFrictionShots = [];
  state.queuedWispShots = [];
  state.wispFollowers = [];
  state.upgrades = pickUpgradeCards(state);
};

const returnToMenu = (state: GameState) => {
  const selectedMage = state.selectedMage;
  const souls = state.souls;
  const shopItems = state.shopItems.map((item) => ({ ...item }));
  const unlockedMages = { ...state.unlockedMages };
  const auth = { ...state.auth };
  const fresh = createState();
  Object.assign(state, fresh);
  state.auth = auth;
  state.selectedMage = selectedMage;
  state.souls = souls;
  state.shopItems = shopItems;
  state.unlockedMages = unlockedMages;
  state.player = createPlayer(state.terrain, selectedMage);
  applyOwnedShopItemsToPlayer(state);
};

const openShop = (state: GameState) => {
  state.status = 'shop';
  state.upgrades = [];
  state.projectiles = [];
  state.enemies = [];
  state.soulOrbs = [];
  state.queuedFrictionShots = [];
  state.queuedWispShots = [];
  state.wispFollowers = [];
};

const resetRun = (state: GameState) => {
  const selectedMage = state.selectedMage;
  const souls = state.souls;
  const shopItems = state.shopItems.map((item) => ({ ...item }));
  const unlockedMages = { ...state.unlockedMages };
  const auth = { ...state.auth };
  const fresh = createState();
  Object.assign(state, fresh);
  state.auth = auth;
  state.selectedMage = selectedMage;
  state.souls = souls;
  state.shopItems = shopItems;
  state.unlockedMages = unlockedMages;
  state.player = createPlayer(state.terrain, selectedMage);
  applyOwnedShopItemsToPlayer(state);
  startWave(state, 1);
};


const unlockMage = (state: GameState, mageId: MageId) => {
  if (state.unlockedMages[mageId]) return true;
  if (state.souls < MAGE_UNLOCK_COST) return false;
  state.souls -= MAGE_UNLOCK_COST;
  state.unlockedMages[mageId] = true;
  const mage = getMageDefinition(mageId);
  addText(state, `${mage.name} unlocked`, { x: state.width / 2, y: 150 }, mage.color);
  return true;
};

export const selectMage = (state: GameState, mageId: MageId) => {
  if (!state.unlockedMages[mageId]) return;
  state.selectedMage = mageId;
  state.player = createPlayer(state.terrain, mageId);
  applyOwnedShopItemsToPlayer(state);
};

export const startSelectedRun = (state: GameState) => {
  resetRun(state);
};

const applyAscension = (state: GameState, card: UpgradeCard) => {
  if (state.ascensions.some((entry) => entry.id === card.id)) return false;
  state.ascensions.push(card);
  addText(state, `${card.name} ascended`, { x: state.width / 2, y: 148 }, '#f59e0b');

  switch (card.id) {
    case 'absorbent':
      state.effects.absorbent = true;
      break;
    case 'antiAircraft':
      state.effects.frictionRadiusMultiplier *= 2;
      break;
    case 'avenger':
      state.effects.avenger = true;
      break;
    case 'blessed':
      state.effects.epicChanceBonus += 0.05;
      break;
    case 'bloodyMage':
      state.effects.bleedDamageMultiplier *= 2;
      break;
    case 'bulldozer':
      state.effects.bulldozer = true;
      break;
    case 'bunker':
      state.effects.bunkerArmorCap = 95;
      break;
    case 'burningMan':
      state.effects.burningMan = true;
      break;
    case 'colossus':
      state.player.maxHp *= 2;
      state.player.hp *= 2;
      syncPlayerSize(state, 2);
      break;
    case 'comet':
      state.effects.comet = true;
      break;
    case 'dealer':
      state.effects.freeReroll = true;
      state.effects.freeRerollAvailable = true;
      break;
    case 'desperate':
      state.effects.desperate = true;
      break;
    case 'enchanter':
      state.effects.enchanter = true;
      break;
    case 'exorcist':
      state.effects.soulBeam = true;
      break;
    case 'freezer':
      state.effects.maxSlow = 1;
      state.effects.freezeExecute = true;
      break;
    case 'flyingSorcerer':
      state.effects.infiniteJump = true;
      break;
    case 'gnome':
      state.effects.enemyMissChance = Math.max(state.effects.enemyMissChance, 33);
      break;
    case 'godOfThunder':
      state.effects.godOfThunder = true;
      state.effects.thunderboltDamageMultiplier *= 3;
      break;
    case 'hoarder':
      state.effects.hoarder = true;
      break;
    case 'marksman':
      state.effects.firstHitCritReady = false;
      break;
    case 'nerd':
      state.effects.randomCommonEachWave = true;
      break;
    case 'pacMan':
      state.effects.pacMan = true;
      break;
    case 'plagueSpreader':
      state.effects.plague = true;
      break;
    case 'protector':
      state.effects.protector = true;
      break;
    case 'ramDestroyer':
      state.effects.fragmentationSizeMultiplier *= 1.75;
      state.effects.fragmentationDamageBonus = Math.max(state.effects.fragmentationDamageBonus, 2);
      break;
    case 'sadistic':
      state.effects.reflectDamage = 1;
      break;
    case 'speculator':
      state.effects.superCrits = true;
      break;
    case 'streamer':
      state.effects.streamer = true;
      break;
    case 'vampire':
      state.effects.vampire = true;
      break;
    case 'whiteDwarf':
      state.effects.whiteDwarf = true;
      state.effects.blackHoleOnImpact = true;
      break;
    case 'tryhard':
    default:
      break;
  }

  return true;
};

function applyUpgrade(state: GameState, upgradeId: UpgradeId, silent = false) {
  const card = getUpgradeCard(upgradeId);
  state.upgradeCounts[upgradeId] = (state.upgradeCounts[upgradeId] ?? 0) + 1;
  const commonBonus = card.rarity === 'common' && upgradeId !== 'renew' && upgradeId !== 'stability'
    ? state.effects.commonEffectivenessBonus
    : 0;
  const scale = 1 + commonBonus;

  switch (upgradeId) {
    case 'catalyst':
      state.player.damage += Math.round(2 * scale);
      break;
    case 'eyesight':
      state.effects.critChance += 0.05 * scale;
      break;
    case 'growth':
      applyMaxHealthUpgrade(state, Math.round(10 * scale), Math.round(10 * scale));
      break;
    case 'impulse':
      state.player.jumpPower *= 1 + 0.1 * scale;
      break;
    case 'renew':
      state.player.hp = state.player.maxHp;
      break;
    case 'resist':
      state.effects.resistArmor += 4 * scale;
      break;
    case 'resonance':
      state.player.fireInterval = Math.max(0.08, state.player.fireInterval / (1 + 0.12 * scale));
      break;
    case 'souls':
      state.effects.soulDropBonus += 0.01 * scale;
      break;
    case 'stability':
      state.effects.projectileDurability += Math.max(1, Math.round(scale));
      break;
    case 'swift':
      state.player.moveSpeed *= 1 + 0.1 * scale;
      break;
    case 'catalystPlus':
      state.player.damage += 4;
      break;
    case 'charge':
      state.effects.projectileSizeMultiplier *= 1.2;
      break;
    case 'cloak':
      state.effects.cloakInvulnDuration = state.effects.cloakInvulnDuration > 0
        ? state.effects.cloakInvulnDuration * 1.1
        : 0.5;
      break;
    case 'fragmentation':
      state.effects.fragmentationCount = state.effects.fragmentationCount === 0 ? 3 : state.effects.fragmentationCount + 1;
      break;
    case 'friction':
      state.effects.frictionShots += 1;
      break;
    case 'growthPlus':
      applyMaxHealthUpgrade(state, 20, 20);
      break;
    case 'gush':
      state.player.maxJumps += 1;
      state.player.jumpsRemaining = Math.max(0, state.player.maxJumps - 1);
      break;
    case 'leech':
      state.effects.lifesteal += 0.03;
      break;
    case 'luck':
      state.effects.uncommonChanceBonus += 0.05;
      break;
    case 'orb':
      state.effects.healOrbChance = Math.max(state.effects.healOrbChance, 0.05);
      break;
    case 'precision':
      state.effects.critBonus += 0.5;
      break;
    case 'rage':
      state.effects.ragePower += 1;
      break;
    case 'regrowth':
      state.effects.regrowthRate += 0.0007;
      break;
    case 'resonancePlus':
      state.player.fireInterval = Math.max(0.07, state.player.fireInterval / 1.24);
      break;
    case 'shrink':
      syncPlayerSize(state, Math.max(0.45, state.player.width / state.player.baseWidth * 0.9));
      break;
    case 'swiftPlus':
      state.player.moveSpeed *= 1.2;
      break;
    case 'thunderbolt':
      state.effects.thunderboltCount += 1;
      state.effects.thunderboltDamageBonus += 4;
      reduceThunderboltCooldown(state, 0.1);
      state.effects.thunderboltTimer = Math.min(state.effects.thunderboltTimer, state.effects.thunderboltInterval);
      break;
    case 'appraisal':
      state.effects.appraisalChoices += 1;
      break;
    case 'barrier': {
      const barrierStacks = Math.max(1, state.upgradeCounts.barrier ?? 1);
      state.effects.barrierCooldown = Math.max(0.25, 16 / barrierStacks);
      state.effects.barrierReady = true;
      state.effects.barrierTimer = state.effects.barrierCooldown;
      break;
    }
    case 'cold':
      state.effects.coldPerHit += 0.01;
      break;
    case 'fragmentationPlus':
      state.effects.fragmentationCount = Math.max(3, state.effects.fragmentationCount) + 3;
      break;
    case 'frictionPlus':
      state.effects.frictionShots += 1;
      break;
    case 'focus':
      state.effects.focusGainPerSecond += 0.18;
      break;
    case 'growthPlusPlus':
      applyMaxHealthUpgrade(state, 40, 40);
      break;
    case 'leechPlus':
      state.effects.lifesteal += 0.09;
      break;
    case 'overheat':
      state.effects.bodyDamage += 40;
      break;
    case 'thunderboltPlus':
      state.effects.thunderboltCount += 1;
      state.effects.thunderboltDamageBonus += 8;
      reduceThunderboltCooldown(state, 0.2);
      state.effects.thunderboltTimer = Math.min(state.effects.thunderboltTimer, state.effects.thunderboltInterval);
      break;
    case 'tome':
      state.effects.commonEffectivenessBonus += 0.35;
      break;
    case 'willOWisp':
      state.effects.wisps += 1;
      break;
    case 'wound':
      state.effects.wound = true;
      break;
    default:
      break;
  }

  const unlocked = findUnlockedAscensions(state);
  const newlyUnlockedAscensions = unlocked.filter((ascension) => applyAscension(state, ascension));

  state.upgrades = [];
  if (!silent) {
    addText(state, 'Upgrade taken', { x: state.width / 2, y: 118 }, '#fde68a');
    startWave(state, state.wave.number + 1);
  }

  if (newlyUnlockedAscensions.length > 0) {
    openAscensionNotice(state, newlyUnlockedAscensions);
  }
}

const rerollUpgrades = (state: GameState) => {
  if (state.status !== 'between') return;
  const hasUnlimitedFreeRerolls = hasActiveShopItem(state, 'dealerStaff') || state.effects.freeReroll;
  const isFree = hasUnlimitedFreeRerolls || state.effects.freeRerollAvailable;
  if (!isFree && state.souls < UPGRADE_REROLL_COST) return;
  if (!hasUnlimitedFreeRerolls && state.effects.freeRerollAvailable) state.effects.freeRerollAvailable = false;
  else if (!isFree) state.souls -= UPGRADE_REROLL_COST;
  state.upgrades = pickUpgradeCards(state);
  addText(state, isFree ? 'Free' : `-${UPGRADE_REROLL_COST}`, { x: state.width / 2, y: 118 }, '#93c5fd');
};

const setActiveShopItem = (state: GameState, itemId: ShopItemId) => {
  let changed = false;
  for (const entry of state.shopItems) {
    const nextActive = entry.id === itemId && entry.owned;
    if (entry.active !== nextActive) changed = true;
    entry.active = nextActive;
  }

  if (changed) {
    applyOwnedShopItemsToPlayer(state);
  }
};

const buyShopItem = (state: GameState, itemId: ShopItemId) => {
  const item = state.shopItems.find((entry) => entry.id === itemId);
  if (!item) return;

  if (!item.owned) {
    if (state.souls < item.cost) return;
    state.souls -= item.cost;
    item.owned = true;
    setActiveShopItem(state, itemId);
    addText(state, `${item.name} purchased`, { x: state.width / 2, y: 150 }, item.color);
    return;
  }

  if (!item.active) {
    setActiveShopItem(state, itemId);
    addText(state, `${item.name} equipped`, { x: state.width / 2, y: 150 }, item.color);
  }
};

export const handleActionKey = (state: GameState, key: string) => {
  if (state.status === 'playing' && key === 'Escape') {
    state.status = 'paused';
    return;
  }

  if (state.status === 'paused') {
    if (key === 'Escape' || key === 'Enter') state.status = 'playing';
    if (key === 'Backspace' || key === 'm' || key === 'M') returnToMenu(state);
    return;
  }

  if (state.status === 'ascension') {
    if (key === 'Escape' || key === 'Enter' || key === ' ') closeAscensionNotice(state);
    return;
  }

  if (state.status === 'menu') {
    if (['1', '2', '3', '4', '5'].includes(key)) {
      const mage = MAGES[Number(key) - 1];
      if (mage && (state.unlockedMages[mage.id] || unlockMage(state, mage.id))) selectMage(state, mage.id);
      return;
    }

    if (key === 'Enter') {
      startSelectedRun(state);
    }
    return;
  }

  if (state.status === 'between' && (key === 'r' || key === 'R')) {
    rerollUpgrades(state);
    return;
  }

  if (state.status === 'shop') {
    if (key === 'Escape' || key === 'Backspace') returnToMenu(state);
    return;
  }

  if (state.status === 'death') {
    if (key === 'Enter') {
      startSelectedRun(state);
      return;
    }

    if (key === 'Escape' || key === 'Backspace' || key === 'm' || key === 'M') {
      returnToMenu(state);
    }
  }
};

export const handlePointerClick = (state: GameState, point: Vec) => {
  if (state.status === 'menu') {
    for (const card of state.ui.mageCards) {
      if (pointInRect(point, card.rect)) {
        if (state.unlockedMages[card.id] || unlockMage(state, card.id)) selectMage(state, card.id);
        return;
      }
    }

    if (state.ui.startRect && pointInRect(point, state.ui.startRect)) {
      startSelectedRun(state);
      return;
    }

    if (state.ui.shopRect && pointInRect(point, state.ui.shopRect)) {
      openShop(state);
      return;
    }

    if (state.ui.loginRect && pointInRect(point, state.ui.loginRect)) {
      state.menuOverlay = 'login';
      return;
    }

    if (state.ui.registerRect && pointInRect(point, state.ui.registerRect)) {
      state.menuOverlay = 'register';
      return;
    }

    if (state.ui.rankingRect && pointInRect(point, state.ui.rankingRect)) {
      state.menuOverlay = 'ranking';
      return;
    }

    if (state.ui.logoutRect && pointInRect(point, state.ui.logoutRect)) {
      state.menuOverlay = 'logout';
    }
    return;
  }

  if (state.status === 'between') {
    for (const card of state.ui.upgradeCards) {
      if (pointInRect(point, card.rect)) {
        applyUpgrade(state, card.id);
        return;
      }
    }

    if (state.ui.rerollRect && pointInRect(point, state.ui.rerollRect)) {
      rerollUpgrades(state);
    }
    return;
  }

  if (state.status === 'shop') {
    for (const card of state.ui.shopCards) {
      if (pointInRect(point, card.rect)) {
        buyShopItem(state, card.id);
        return;
      }
    }

    if (state.ui.menuRect && pointInRect(point, state.ui.menuRect)) {
      returnToMenu(state);
    }
    return;
  }

  if (state.status === 'paused') {
    if (state.ui.restartRect && pointInRect(point, state.ui.restartRect)) {
      state.status = 'playing';
      return;
    }

    if (state.ui.menuRect && pointInRect(point, state.ui.menuRect)) {
      returnToMenu(state);
    }
    return;
  }

  if (state.status === 'ascension') {
    if (state.ui.restartRect && pointInRect(point, state.ui.restartRect)) {
      closeAscensionNotice(state);
    }
    return;
  }

  if (state.status === 'death') {
    if (state.ui.restartRect && pointInRect(point, state.ui.restartRect)) {
      startSelectedRun(state);
      return;
    }

    if (state.ui.menuRect && pointInRect(point, state.ui.menuRect)) {
      returnToMenu(state);
    }
  }
};

const queueFrictionShot = (state: GameState, behindDirection: 1 | -1, horizontalCarry: number) => {
  const queuedShot: QueuedFrictionShot = {
    delay: 0.04,
    behindDirection,
    horizontalCarry,
  };
  state.queuedFrictionShots.push(queuedShot);
};

const releaseQueuedFrictionShots = (state: GameState, dt: number) => {
  if (state.queuedFrictionShots.length === 0) return;

  const readyShots: QueuedFrictionShot[] = [];
  state.queuedFrictionShots = state.queuedFrictionShots.filter((shot) => {
    shot.delay -= dt;
    if (shot.delay <= 0) {
      readyShots.push(shot);
      return false;
    }
    return true;
  });

  for (const shot of readyShots) {
    const baseOffset = Math.max(12, state.player.width * 0.32);
    createProjectile(state, {
      pos: {
        x: state.player.pos.x + shot.behindDirection * baseOffset,
        y: state.player.pos.y + 12,
      },
      vel: {
        x: shot.horizontalCarry,
        y: -430 - Math.random() * 28,
      },
      radius: 6,
      damage: Math.max(4, Math.round(state.player.damage * 0.7)),
      color: '#fb923c',
      life: 1.4,
      owner: 'player',
      behavior: 'friction',
      pierce: 0,
      hitIds: [],
      aoeRadius: 36 * state.effects.frictionRadiusMultiplier,
      homingStrength: 0,
      fromUpgrade: 'friction',
    });
  }
};

const spawnFrictionProjectiles = (state: GameState) => {
  if (state.effects.frictionShots <= 0) return;
  const threshold = getFrictionTravelThreshold(state);
  while (state.effects.frictionDistance >= threshold) {
    state.effects.frictionDistance -= threshold;
    const behindDirection: 1 | -1 = Math.abs(state.player.vel.x) > 18
      ? (state.player.vel.x > 0 ? -1 : 1)
      : (state.player.facing === 1 ? -1 : 1);
    const horizontalCarry = state.player.vel.x * 0.08;

    queueFrictionShot(state, behindDirection, horizontalCarry);
  }
};

const applyLandingEffects = (state: GameState, dropDistance: number) => {
  if (!state.effects.comet || dropDistance < 70) return;
  const radius = Math.min(160, 40 + dropDistance * 0.2);
  const damage = Math.max(6, Math.round(dropDistance * 0.14 + state.player.damage));
  explodeAt(state, { x: state.player.pos.x, y: state.player.pos.y + state.player.height / 2 }, radius, damage, '#f97316');
};

const updatePlayer = (state: GameState, input: InputState, dt: number) => {
  const player = state.player;
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const previousX = player.pos.x;
  player.vel.x = lerp(player.vel.x, direction * player.moveSpeed, 0.18);
  if (direction !== 0) player.facing = direction > 0 ? 1 : -1;

  const nextX = clamp(player.pos.x + player.vel.x * dt, player.width / 2 + 8, state.width - player.width / 2 - 8);

  if (input.jumpPressed && (player.onGround || player.jumpsRemaining > 0 || state.effects.infiniteJump)) {
    const fromGround = player.onGround;
    player.vel.y = -player.jumpPower;
    player.onGround = false;
    if (!fromGround && !state.effects.infiniteJump) {
      player.jumpsRemaining = Math.max(0, player.jumpsRemaining - 1);
    }
    state.effects.airPeakY = player.pos.y;
    state.effects.jumpHoldMax = getJumpHoldMax(state);
    state.effects.jumpHoldTimer = state.effects.jumpHoldMax;
  }

  if (!input.jumpHeld && player.vel.y < 0 && state.effects.jumpHoldTimer > 0) {
    player.vel.y = Math.max(player.vel.y * 0.18, 0);
    state.effects.jumpHoldTimer = 0;
  }

  if (input.jumpHeld && state.effects.jumpHoldTimer > 0 && player.vel.y < 0) {
    const holdStrength = 0.72 + Math.min(0.18, state.effects.jumpHoldMax * 0.6);
    player.vel.y -= GRAVITY * holdStrength * dt;
    state.effects.jumpHoldTimer = Math.max(0, state.effects.jumpHoldTimer - dt);
  }

  const previousFoot = player.pos.y + player.height / 2;
  const previousGround = getGroundY(state.terrain, player.pos.x);
  player.vel.y += GRAVITY * dt;
  let nextY = player.pos.y + player.vel.y * dt;
  const nextGround = getGroundY(state.terrain, nextX);
  const nextFoot = nextY + player.height / 2;
  const wasAirborne = !player.onGround;

  if (player.onGround && !input.jumpPressed) {
    nextY = nextGround - player.height / 2;
    player.vel.y = 0;
    state.effects.jumpHoldTimer = 0;
  } else if (player.vel.y >= 0 && nextFoot >= nextGround && previousFoot <= Math.max(previousGround, nextGround) + 16) {
    nextY = nextGround - player.height / 2;
    player.vel.y = 0;
    player.onGround = true;
    player.jumpsRemaining = Math.max(0, player.maxJumps - 1);
    state.effects.jumpHoldTimer = 0;
    if (wasAirborne) applyLandingEffects(state, Math.max(0, nextY - state.effects.airPeakY));
  } else {
    player.onGround = false;
    state.effects.airPeakY = Math.min(state.effects.airPeakY, nextY);
  }

  player.pos.x = nextX;
  player.pos.y = nextY;

  if (player.invuln > 0) {
    player.invuln = Math.max(0, player.invuln - dt);
  }

  const moved = Math.abs(player.pos.x - previousX);
  state.effects.runDistance += moved;
  state.effects.frictionDistance += moved;
  spawnFrictionProjectiles(state);

  if (moved < 1) {
    state.effects.stationaryTime += dt;
    if (state.effects.focusGainPerSecond > 0) {
      state.effects.focusBonus = Math.min(1.2, state.effects.focusGainPerSecond * state.effects.stationaryTime);
    }
    if (state.effects.bunkerArmorCap > 0) {
      state.effects.bunkerArmor = Math.min(state.effects.bunkerArmorCap, state.effects.stationaryTime * 4);
    }
  } else {
    state.effects.stationaryTime = 0;
    state.effects.focusBonus = 0;
    state.effects.bunkerArmor = 0;
  }

  state.fireTimer -= dt;
  const shouldAutoFire = state.effects.streamer;
  if ((input.mouseDown || shouldAutoFire) && state.fireTimer <= 0) {
    firePlayerShot(state, input.mouse);
    state.fireTimer = getCurrentFireInterval(state);
  }
};

const enemyTouchesPlayer = (state: GameState, enemy: Enemy) => {
  const player = state.player;
  const dx = Math.abs(player.pos.x - enemy.pos.x);
  const dy = Math.abs((player.pos.y - 6) - enemy.pos.y);

  if (enemy.isRanged) {
    return rectsOverlap(
      player.pos.x - player.width / 2,
      player.pos.y - player.height / 2,
      player.width,
      player.height,
      enemy.pos.x - enemy.width / 2,
      enemy.pos.y - enemy.height / 2,
      enemy.width,
      enemy.height,
    );
  }

  return dx <= (player.width + enemy.width) * 0.7 && dy <= (player.height + enemy.height) * 0.86;
};

const updateThunderbolts = (state: GameState) => {
  if (state.effects.thunderboltCount <= 0 || state.enemies.length === 0) return;

  const flashRadius = state.effects.godOfThunder ? 70 : 56;
  const impactRadius = getThunderboltStrikeRadius(state);
  const boltWidth = getThunderboltBoltWidth(state);
  const target = getThunderStrikeGroundTarget(state, 32 + Math.random() * (state.width - 64));
  const lineFrom = {
    x: target.x + (Math.random() * 44 - 22),
    y: 18,
  };

  spawnLightningStrike(state, target, getThunderboltStyle(state), lineFrom, flashRadius, boltWidth);
  createProjectile(state, {
    pos: target,
    lineFrom,
    vel: { x: 0, y: 0 },
    radius: boltWidth,
    damage: getThunderboltDamage(state),
    color: getThunderboltColor(state),
    life: 0.02,
    owner: 'player',
    behavior: 'thunder',
    pierce: 1,
    hitIds: [],
    aoeRadius: impactRadius,
    homingStrength: 0,
  });
};


const getWispAnchor = (state: GameState, index: number): Vec => {
  if (state.effects.enchanter) {
    const handX = state.player.pos.x + state.player.width * 0.28 * state.player.facing;
    const handY = state.player.pos.y - state.player.height * 0.06;
    const count = Math.max(1, state.effects.wisps);
    const stackOffset = (index - (count - 1) * 0.5);
    const sideOffset = -state.player.facing * (10 + Math.abs(stackOffset) * 2);
    const verticalOffset = -6 + stackOffset * 10;
    return {
      x: handX + sideOffset,
      y: handY + verticalOffset + Math.sin(state.tick * 0.003 + index * 0.8) * 1.2,
    };
  }

  const count = Math.max(1, state.effects.wisps);
  const angle = state.tick * 0.0022 + index * (Math.PI * 2 / count);
  return {
    x: state.player.pos.x + Math.cos(angle) * (22 + count * 2),
    y: state.player.pos.y - 10 + Math.sin(angle) * 12,
  };
};

const ensureWispFollowers = (state: GameState) => {
  const targetCount = Math.max(0, state.effects.wisps);
  while (state.wispFollowers.length < targetCount) {
    const anchor = getWispAnchor(state, state.wispFollowers.length);
    state.wispFollowers.push({
      pos: { ...anchor },
      vel: { x: 0, y: 0 },
    });
  }
  if (state.wispFollowers.length > targetCount) {
    state.wispFollowers.length = targetCount;
  }
};

const updateWispFollowers = (state: GameState, dt: number) => {
  if (state.effects.wisps <= 0) {
    state.wispFollowers = [];
    return;
  }

  ensureWispFollowers(state);
  for (let i = 0; i < state.wispFollowers.length; i += 1) {
    const follower = state.wispFollowers[i];
    const anchor = getWispAnchor(state, i);

    if (state.effects.enchanter) {
      follower.pos.x = anchor.x;
      follower.pos.y = anchor.y;
      follower.vel.x = 0;
      follower.vel.y = 0;
      continue;
    }

    const toAnchor = { x: anchor.x - follower.pos.x, y: anchor.y - follower.pos.y };
    const dist = Math.hypot(toAnchor.x, toAnchor.y);
    const dir = dist > 0.001 ? { x: toAnchor.x / dist, y: toAnchor.y / dist } : { x: 0, y: 0 };
    const accel = Math.min(960, (82 + dist * 3.6) * 3);
    follower.vel.x += dir.x * accel * dt;
    follower.vel.y += dir.y * accel * dt;
    follower.vel.x *= 0.935;
    follower.vel.y *= 0.935;
    const maxSpeed = (108 + Math.min(122, dist * 0.5)) * 3;
    const currentSpeed = Math.hypot(follower.vel.x, follower.vel.y);
    if (currentSpeed > maxSpeed && currentSpeed > 0.001) {
      const scale = maxSpeed / currentSpeed;
      follower.vel.x *= scale;
      follower.vel.y *= scale;
    }
    follower.pos.x += follower.vel.x * dt;
    follower.pos.y += follower.vel.y * dt;
  }
};

const releaseQueuedWispShots = (state: GameState, dt: number) => {
  if (state.queuedWispShots.length === 0) return;

  const readyShots: QueuedWispShot[] = [];
  state.queuedWispShots = state.queuedWispShots.filter((shot) => {
    shot.delay -= dt;
    if (shot.delay <= 0) {
      readyShots.push(shot);
      return false;
    }
    return true;
  });

  for (const shot of readyShots) {
    const dir = normalize({ x: shot.target.x - shot.origin.x, y: shot.target.y - shot.origin.y });
    const critRoll = rollCritical(state);
    createProjectile(state, {
      pos: { ...shot.origin },
      vel: { x: dir.x * shot.speed, y: dir.y * shot.speed },
      radius: shot.radius,
      damage: Math.max(1, Math.round(shot.damage * critRoll.multiplier)),
      baseDamage: Math.max(1, Math.round(shot.damage)),
      critKind: critRoll.kind,
      color: shot.color,
      life: 6.5,
      owner: 'player',
      behavior: shot.behavior,
      pierce: shot.pierce,
      hitIds: [],
      aoeRadius: shot.aoeRadius,
      homingStrength: shot.homingStrength,
      fromUpgrade: 'willOWisp',
      projectileHp: 1 + state.effects.projectileDurability,
      projectileMaxHp: 1 + state.effects.projectileDurability,
    });
  }
};

const updateWisps = (state: GameState, dt: number, input: InputState) => {
  if (state.effects.wisps <= 0) return;

  state.effects.wispTimer -= dt;
  if (state.effects.wispTimer > 0) return;

  const attackSpeedFactor = getAttackSpeedFactor(state);
  const baseInterval = state.effects.enchanter
    ? Math.max(0.15, getCurrentFireInterval(state) * 0.55)
    : Math.max(0.3, 0.9 - state.effects.wisps * 0.08 - (attackSpeedFactor - 1) * 0.08);
  state.effects.wispTimer = baseInterval;

  const primaryTarget = state.effects.enchanter ? input.mouse : nearestEnemy(state, state.player.pos)?.pos;
  if (!primaryTarget) return;

  const shotSpacing = state.effects.enchanter ? 0.04 : 0.12;
  const wispMage = getWispMageDefinition(state);
  const projectileSpeed = wispMage.projectileSpeed * 0.5;
  const damage = Math.max(1, Math.round(state.player.damage * getCurrentRageMultiplier(state) * 0.5));
  const radius = Math.max(4, wispMage.projectileRadius * 0.9);
  const behavior = wispMage.behavior;
  const aoeRadius = behavior === 'explosive' ? wispMage.explosionRadius : 0;
  const homingStrength = behavior === 'homing' ? wispMage.homingStrength : 0;
  const pierce = behavior === 'pierce' ? 999 : 0;

  ensureWispFollowers(state);

  for (let i = 0; i < state.effects.wisps; i += 1) {
    const follower = state.wispFollowers[i];
    const origin = follower ? { x: follower.pos.x, y: follower.pos.y } : getWispAnchor(state, i);

    const queuedShot: QueuedWispShot = {
      delay: i * shotSpacing,
      origin,
      target: { ...primaryTarget },
      speed: projectileSpeed,
      damage,
      color: wispMage.color,
      radius,
      behavior,
      aoeRadius,
      homingStrength,
      pierce,
    };
    state.queuedWispShots.push(queuedShot);
  }
};

const getAimBeamPoints = (state: GameState, input: InputState) => ({
  from: {
    x: state.player.pos.x + state.player.width * 0.28 * state.player.facing,
    y: state.player.pos.y - state.player.height * 0.06,
  },
  to: { x: input.mouse.x, y: input.mouse.y },
});

const updateAimLaser = (state: GameState, input: InputState) => {
  if (!state.effects.streamer) return;
  const { from, to } = getAimBeamPoints(state, input);
  state.effects.streamerBeam = {
    from,
    to,
    timer: 0.2,
  };
};

const updateStreamer = (state: GameState, dt: number, input: InputState) => {
  if (!state.effects.streamer) return;

  const { from, to } = getAimBeamPoints(state, input);
  state.effects.streamerBeam = { from, to, timer: 0.2 };

  state.effects.streamerTimer -= dt;
  if (state.effects.streamerTimer > 0) return;
  state.effects.streamerTimer = getCurrentFireInterval(state);

  const attackSpeedLevel = getUpgradeProgressCount(state, 'resonance');
  const streamerDamage = Math.max(1, attackSpeedLevel / 2);

  for (const enemy of state.enemies) {
    const hitRadius = Math.max(8, Math.hypot(enemy.width * 0.5, enemy.height * 0.5) + 4);
    const d = distanceToSegment(enemy.pos, from, to);
    if (d <= hitRadius) {
      damageEnemy(state, enemy, streamerDamage, '#ef4444');
    }
  }
};

const updateBurningMan = (state: GameState, dt: number) => {
  if (!state.effects.burningMan) return;
  state.effects.burningManTimer -= dt;
  if (state.effects.burningManTimer > 0) return;
  state.effects.burningManTimer = 2;
  explodeAt(state, state.player.pos, 110, Math.max(8, state.effects.bodyDamage), '#fb923c');
};

const updateEnemies = (state: GameState, dt: number) => {
  const player = state.player;

  for (const enemy of state.enemies) {
    enemy.bodyHitCooldown = Math.max(0, enemy.bodyHitCooldown - dt);
    enemy.meleeAttackCooldown = Math.max(0, enemy.meleeAttackCooldown - dt);
    enemy.bleed = Number.isFinite(enemy.bleed) ? Math.max(0, enemy.bleed - dt) : enemy.bleed;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.spawnElapsed = Math.min(enemy.spawnDuration, enemy.spawnElapsed + dt);

    const bleedTickInterval = getBleedTickInterval(state);
    if (enemy.bleed > 0 && enemy.bleedStacks > 0) {
      enemy.bleedTickTimer -= dt;
      while (enemy.bleed > 0 && enemy.bleedStacks > 0 && enemy.bleedTickTimer <= 0) {
        const bleedDamage = Math.max(1, enemy.bleedStacks);
        damageEnemy(state, enemy, bleedDamage, '#ef4444', false);
        enemy.bleedTickTimer += bleedTickInterval;
      }
    } else {
      enemy.bleedStacks = 0;
      enemy.bleedTickTimer = bleedTickInterval;
    }

    const rangedDesiredY = getGroundY(state.terrain, enemy.pos.x) - enemy.hoverHeight + Math.sin(state.tick * 0.004 + enemy.hoverPhase) * 12;
    const rangedDescendGap = rangedDesiredY - enemy.pos.y;
    const rangedSettleFactor = rangedDescendGap > 80 ? 0.012 : 0.028;

    const toPlayer = { x: player.pos.x - enemy.pos.x, y: player.pos.y - enemy.pos.y };
    const planarDistance = Math.hypot(toPlayer.x, toPlayer.y);
    const direction = normalize(toPlayer);
    const speedFactor = Math.max(0, 1 - enemy.slow);
    let targetY = rangedDesiredY;

    if (isBosslado(enemy)) {
      const hoverBaseX = enemy.kind === 'bossladoLaser' ? state.width * 0.38 : state.width * 0.62;
      const lateralWave = Math.sin(state.tick * 0.0032 + enemy.hoverPhase) * 44;
      const verticalWave = Math.sin(state.tick * 0.0025 + enemy.hoverPhase * 1.35) * 30;
      const driftWave = Math.cos(state.tick * 0.0018 + enemy.hoverPhase * 0.7) * 12;
      const hoverX = hoverBaseX + lateralWave + driftWave;
      targetY = 148 + verticalWave;
      if (enemy.spawnElapsed < enemy.spawnDuration) {
        const t = enemy.spawnElapsed / enemy.spawnDuration;
        const eased = t * t * (3 - 2 * t);
        enemy.pos.x = lerp(enemy.pos.x, hoverX, 0.05);
        enemy.pos.y = enemy.spawnStartY + (targetY - enemy.spawnStartY) * eased;
      } else {
        if (!enemy.bossEnraged && enemy.hp <= enemy.maxHp * 0.5) {
          enemy.bossEnraged = true;
          enemy.bossDashCooldown = 0.2;
        }

        if (enemy.bossEnraged) {
          enemy.bossDashCooldown -= dt;
          enemy.bossDashTime -= dt;
          if (enemy.bossDashTime > 0) {
            enemy.pos.x += enemy.vel.x * dt;
            enemy.pos.y += enemy.vel.y * dt;
            if (enemyTouchesPlayer(state, enemy)) {
              damagePlayer(state, enemy.bossEnraged && isBosslado(enemy) ? 300 : Math.max(1, enemy.damage), enemy);
            }
            const reached = Math.hypot(enemy.pos.x - enemy.bossDashTargetX, enemy.pos.y - enemy.bossDashTargetY) <= Math.max(28, enemy.width * 0.28);
            if (reached) {
              enemy.pos.x = enemy.bossDashTargetX;
              enemy.pos.y = enemy.bossDashTargetY;
              enemy.bossDashTime = 0;
              enemy.vel.x = 0;
              enemy.vel.y = 0;
              enemy.bossDashCooldown = 0.18 + Math.random() * 0.38;
              enemy.bossDashTargetY = clamp(100 + Math.random() * (state.height - 280), 104, state.height - 176);
            }
          } else if (enemy.bossDashCooldown <= 0) {
            startBossladoDash(state, enemy);
          } else {
            enemy.pos.y = lerp(enemy.pos.y, enemy.bossDashTargetY, 0.08);
            enemy.vel.x = 0;
            enemy.vel.y = 0;
          }
        } else {
          enemy.pos.x = lerp(enemy.pos.x, hoverX, 0.09);
          enemy.pos.y = lerp(enemy.pos.y, targetY, 0.09);
          enemy.bossOrbCooldown -= dt;
          enemy.bossLaserCooldown -= dt;
          if (enemy.kind === 'bossladoOrb' && enemy.bossOrbCooldown <= 0) {
            fireBossladoOrb(state, enemy);
            enemy.bossOrbCooldown = 2.4 + Math.random() * 0.75;
          }
          if (enemy.kind === 'bossladoLaser' && enemy.bossLaserCooldown <= 0) {
            fireBossladoLaser(state, enemy);
            enemy.bossLaserCooldown = 0.11 + Math.random() * 0.07;
          }
        }
      }

      if (enemyTouchesPlayer(state, enemy)) {
        damagePlayer(state, enemy.bossEnraged && isBosslado(enemy) ? 300 : Math.max(1, enemy.damage), enemy);
      }
      continue;
    }

    if (enemy.kind === 'brainboss') {
      const targetX = clamp(player.pos.x, enemy.width / 2 + 48, state.width - enemy.width / 2 - 48);
      targetY = 132 + Math.sin(state.tick * 0.0026 + enemy.hoverPhase) * 24;
      if (enemy.spawnElapsed < enemy.spawnDuration) {
        const t = enemy.spawnElapsed / enemy.spawnDuration;
        const eased = t * t * (3 - 2 * t);
        enemy.pos.x = lerp(enemy.pos.x, targetX, 0.018);
        enemy.pos.y = enemy.spawnStartY + (targetY - enemy.spawnStartY) * eased;
      } else {
        enemy.pos.x = lerp(enemy.pos.x, targetX, 0.028);
        enemy.pos.y = lerp(enemy.pos.y, targetY, 0.03);

        enemy.bossOrbCooldown -= dt;
        enemy.bossLaserCooldown -= dt;
        enemy.bossBlastCooldown -= dt;

        if (enemy.bossOrbCooldown <= 0) {
          fireBrainBossOrb(state, enemy);
          enemy.bossOrbCooldown = (4.6 + Math.random() * 1.1) / MONSTER_ATTACK_SPEED_MULTIPLIER;
        }
        if (enemy.bossLaserCooldown <= 0) {
          fireBrainBossLaser(state, enemy);
          enemy.bossLaserCooldown = (1.65 + Math.random() * 0.45) / MONSTER_ATTACK_SPEED_MULTIPLIER;
        }
        if (enemy.bossBlastCooldown <= 0) {
          castBrainBossBlast(state, enemy);
          enemy.bossBlastCooldown = (5.4 + Math.random() * 1.2) / MONSTER_ATTACK_SPEED_MULTIPLIER;
        }
      }

      if (enemyTouchesPlayer(state, enemy)) {
        damagePlayer(state, enemy.bossEnraged && isBosslado(enemy) ? 300 : Math.max(1, enemy.damage), enemy);
        if (state.effects.bodyDamage > 0 && enemy.bodyHitCooldown <= 0) {
          damageEnemy(state, enemy, state.effects.bodyDamage, '#f97316');
          enemy.bodyHitCooldown = 0.45;
        }
      }
      continue;
    }

    if (enemy.isRanged) {
      if (enemy.cornerShooter) {
        const cornerMargin = enemy.width * 0.65 + 40;
        const anchorX = player.pos.x < state.width * 0.5
          ? state.width - cornerMargin
          : cornerMargin;
        const toCorner = anchorX - enemy.pos.x;
        const cornerStep = enemy.speed * 0.82 * speedFactor * dt;
        if (Math.abs(toCorner) > 4) {
          enemy.pos.x += Math.sign(toCorner) * Math.min(Math.abs(toCorner), cornerStep);
        }
      } else {
        const orbitDirection = enemy.id % 2 === 0 ? 1 : -1;
        const rangeOffset = Math.sin(state.tick * 0.0022 + enemy.hoverPhase) * 120;
        const strafeOffset = Math.cos(state.tick * 0.0016 + enemy.hoverPhase * 1.7) * 95 * orbitDirection;
        const desiredRange = enemy.preferredRange + rangeOffset;
        const desiredX = clamp(
          player.pos.x - direction.x * desiredRange + strafeOffset,
          enemy.width / 2 + 10,
          state.width - enemy.width / 2 - 10,
        );
        const horizontalGap = desiredX - enemy.pos.x;
        const horizontalStep = Math.min(Math.abs(horizontalGap), enemy.speed * 1.18 * speedFactor * dt);
        if (Math.abs(horizontalGap) > 1.5) {
          enemy.pos.x += Math.sign(horizontalGap) * horizontalStep;
        }
      }

      enemy.pos.x = clamp(enemy.pos.x, enemy.width / 2 + 10, state.width - enemy.width / 2 - 10);
      const terrainHoverY = getGroundY(state.terrain, enemy.pos.x) - enemy.hoverHeight;
      const verticalRoam = Math.sin(state.tick * 0.002 + enemy.hoverPhase * 1.6) * 46
        + Math.cos(state.tick * 0.0013 + enemy.id * 0.37) * 24;
      targetY = terrainHoverY + Math.sin(state.tick * 0.004 + enemy.hoverPhase) * 12 + verticalRoam;
      const rangedCeiling = enemy.height / 2 + 12;
      const rangedFloor = getGroundY(state.terrain, enemy.pos.x) - enemy.height * 0.42;
      targetY = clamp(targetY, rangedCeiling, rangedFloor);
      if (enemy.spawnElapsed < enemy.spawnDuration) {
        const t = enemy.spawnElapsed / enemy.spawnDuration;
        const eased = t * t * (3 - 2 * t);
        enemy.pos.y = enemy.spawnStartY + (targetY - enemy.spawnStartY) * eased;
      } else {
        enemy.pos.y = lerp(enemy.pos.y, targetY, Math.max(0.04, rangedSettleFactor + 0.02));
      }
      enemy.shootCooldown -= dt;
      const maxFireDistance = enemy.cornerShooter ? 1400 : Math.max(980, enemy.preferredRange + 320);
      if (enemy.shootCooldown <= 0 && planarDistance < maxFireDistance) {
        fireEnemyShot(state, enemy);
        enemy.shootCooldown = (enemy.shootRate + Math.random() * 0.35) / MONSTER_ATTACK_SPEED_MULTIPLIER;
      }
    } else {
      const contactRange = (player.width + enemy.width) * 0.5;
      const meleeHoverBob = Math.sin(state.tick * 0.005 + enemy.hoverPhase) * Math.max(5, enemy.height * 0.14);
      const desiredTarget = {
        x: player.pos.x,
        y: player.pos.y - 6 + meleeHoverBob,
      };
      const toTarget = {
        x: desiredTarget.x - enemy.pos.x,
        y: desiredTarget.y - enemy.pos.y,
      };
      const targetDistance = Math.hypot(toTarget.x, toTarget.y);
      const desiredDistance = Math.max(10, contactRange * 0.48);
      const tripledSpeed = enemy.speed * 3 * speedFactor;
      const stickSpeed = enemy.speed * 1.35 * speedFactor;
      const horizontalGap = desiredTarget.x - enemy.pos.x;
      const verticalGap = desiredTarget.y - enemy.pos.y;
      const verticalDeadzone = Math.max(18, enemy.height * 0.28);
      const verticalChaseSpeed = enemy.speed * 1.45 * speedFactor;
      const ceiling = enemy.height / 2 + 12;
      const floor = getGroundY(state.terrain, enemy.pos.x) - enemy.height * 0.45;

      if (enemy.spawnElapsed < enemy.spawnDuration) {
        const spawnHoverY = clamp(
          getGroundY(state.terrain, enemy.pos.x) - Math.min(enemy.hoverHeight * 0.58, 132) + meleeHoverBob,
          ceiling,
          floor,
        );
        const t = enemy.spawnElapsed / enemy.spawnDuration;
        const eased = t * t * (3 - 2 * t);
        const introHorizontalStep = Math.min(Math.abs(horizontalGap), enemy.speed * 1.2 * speedFactor * dt);
        if (Math.abs(horizontalGap) > 2) {
          enemy.pos.x += Math.sign(horizontalGap) * introHorizontalStep;
        }
        enemy.pos.y = enemy.spawnStartY + (spawnHoverY - enemy.spawnStartY) * eased;
      } else {
        if (targetDistance > desiredDistance) {
          const horizontalStep = Math.min(Math.abs(horizontalGap), tripledSpeed * dt);
          if (Math.abs(horizontalGap) > 1.5) {
            enemy.pos.x += Math.sign(horizontalGap) * horizontalStep;
          }
        } else if (Math.abs(horizontalGap) > 1.5) {
          const horizontalStep = Math.min(Math.abs(horizontalGap), stickSpeed * dt);
          enemy.pos.x += Math.sign(horizontalGap) * horizontalStep;
        }

        if (Math.abs(verticalGap) > verticalDeadzone) {
          const verticalStep = Math.min(Math.abs(verticalGap) - verticalDeadzone, verticalChaseSpeed * dt);
          enemy.pos.y += Math.sign(verticalGap) * verticalStep;
        } else {
          enemy.pos.y = lerp(enemy.pos.y, desiredTarget.y, 0.045);
        }
      }

      enemy.pos.x = clamp(enemy.pos.x, enemy.width / 2 + 10, state.width - enemy.width / 2 - 10);
      const postClampFloor = getGroundY(state.terrain, enemy.pos.x) - enemy.height * 0.45;
      enemy.pos.y = clamp(enemy.pos.y, ceiling, postClampFloor);
    }

    if (enemyTouchesPlayer(state, enemy)) {
      if (enemy.isRanged) {
        damagePlayer(state, enemy.damage, enemy);
      } else if (enemy.meleeAttackCooldown <= 0) {
        damagePlayer(state, enemy.damage, enemy);
        enemy.meleeAttackCooldown = 1;
      }
      if (state.effects.bodyDamage > 0 && enemy.bodyHitCooldown <= 0) {
        damageEnemy(state, enemy, state.effects.bodyDamage, '#f97316');
        enemy.bodyHitCooldown = 0.45;
      }
      if (!enemy.isRanged) {
        const movementFactor = clamp(Math.abs(player.vel.x) / 180, 0.75, 1.35);
        const pushStrength = state.effects.bulldozer ? 12.5 : 3.4 * movementFactor;
        const push = normalize({
          x: player.pos.x - enemy.pos.x,
          y: ((player.pos.y - 6) - enemy.pos.y) * (state.effects.bulldozer ? 0.55 : 0.2),
        });
        enemy.pos.x -= push.x * pushStrength;
        enemy.pos.y -= push.y * pushStrength;
      }
      resolvePlayerEnemyCollision(state, enemy);
    }
  }

  separateEnemies(state);
  separateBossladoEyes(state);
  resolvePlayerEnemyCollisions(state);

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 && !enemy.deathHandled) killEnemy(state, enemy);
  }
  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
};

const maybeSpawnBlackHole = (state: GameState, projectile: Projectile) => {
  if (!state.effects.blackHoleOnImpact || projectile.owner !== 'player' || projectile.behavior === 'blackhole') return;
  createProjectile(state, {
    pos: { ...projectile.pos },
    vel: { x: 0, y: 0 },
    radius: 18,
    damage: Math.max(3, Math.round(projectile.damage * 0.35)),
    color: '#111827',
    life: 2.4,
    owner: 'player',
    behavior: 'blackhole',
    pierce: 999,
    hitIds: [],
    aoeRadius: 185,
    homingStrength: 0,
    tickTimer: 1,
  });
};

const resolveProjectileClash = (state: GameState, projectile: Projectile, enemyProjectile: Projectile) => {
  const playerProjectileHp = Math.max(1, projectile.projectileHp ?? 1) - 1;
  const enemyProjectileHp = Math.max(1, enemyProjectile.projectileHp ?? 1) - 1;

  projectile.projectileHp = playerProjectileHp;
  enemyProjectile.projectileHp = enemyProjectileHp;

  const impactPos = {
    x: (projectile.pos.x + enemyProjectile.pos.x) * 0.5,
    y: (projectile.pos.y + enemyProjectile.pos.y) * 0.5,
  };
  addImpact(state, impactPos, Math.max(8, projectile.radius + enemyProjectile.radius + 4), '#f8fafc', 0.16);

  if (enemyProjectileHp <= 0) {
    enemyProjectile.life = 0;
  } else {
    enemyProjectile.pos.x += enemyProjectile.vel.x * 0.03;
    enemyProjectile.pos.y += enemyProjectile.vel.y * 0.03;
  }

  if (playerProjectileHp <= 0) {
    projectile.life = 0;
  } else {
    projectile.pos.x += projectile.vel.x * 0.03;
    projectile.pos.y += projectile.vel.y * 0.03;
    if (state.effects.pacMan && projectile.behavior !== 'thunder') {
      projectile.damage = Math.max(1, Math.round(projectile.damage * 1.25));
      if (typeof projectile.baseDamage === 'number') {
        projectile.baseDamage = Math.max(1, Math.round(projectile.baseDamage * 1.25));
      }
    }
  }
};

const updateProjectiles = (state: GameState, dt: number) => {
  for (const projectile of state.projectiles) {
    projectile.life -= dt;

    if (projectile.behavior === 'thunder') {
      const impactRadius = Math.max(16, projectile.aoeRadius || getThunderboltStrikeRadius(state));
      const strikeFrom = projectile.lineFrom ?? { x: projectile.pos.x, y: 18 };
      const boltWidth = Math.max(12, projectile.radius || getThunderboltBoltWidth(state));
      const firstEnemyHit = getThunderHitTarget(state, strikeFrom, projectile.pos, boltWidth);
      let hitSomething = false;

      if (firstEnemyHit) {
        const hitResult = resolveProjectileHit(state, firstEnemyHit, projectile);
        damageEnemy(state, firstEnemyHit, hitResult.damage, hitResult.color, true, projectile);
        hitSomething = true;
      }

      addImpact(state, projectile.pos, impactRadius, projectile.color, hitSomething ? 0.22 : 0.18);
      projectile.life = 0;
      continue;
    }

    if (projectile.behavior === 'blackhole') {
      const chargeLevel = Math.max(0, state.upgradeCounts.charge ?? 0);
      const whiteDwarfDamagePerTick = chargeLevel;
      projectile.tickTimer = (projectile.tickTimer ?? 1) - dt;
      let shouldTickDamage = false;
      if ((projectile.tickTimer ?? 0) <= 0) {
        shouldTickDamage = true;
        while ((projectile.tickTimer ?? 0) <= 0) {
          projectile.tickTimer = (projectile.tickTimer ?? 0) + 1;
        }
      }
      for (const enemy of state.enemies) {
        const dist = distance(enemy.pos, projectile.pos);
        if (dist <= projectile.aoeRadius) {
          const pull = normalize({ x: projectile.pos.x - enemy.pos.x, y: projectile.pos.y - enemy.pos.y });
          const pullStrength = 120 * Math.max(0.4, 1 - dist / Math.max(1, projectile.aoeRadius));
          enemy.pos.x += pull.x * pullStrength * dt;
          enemy.pos.y += pull.y * pullStrength * 0.92 * dt;
          if (shouldTickDamage && whiteDwarfDamagePerTick > 0) {
            damageEnemy(state, enemy, whiteDwarfDamagePerTick, '#a855f7');
          }
        }
      }
      continue;
    }

    if (projectile.owner === 'player' && projectile.behavior === 'homing') {
      const target = nearestEnemy(state, projectile.pos, 260);
      if (target) {
        const desired = normalize({ x: target.pos.x - projectile.pos.x, y: target.pos.y - projectile.pos.y });
        const homingSpeed = Math.max(1, Math.hypot(projectile.vel.x, projectile.vel.y));
        projectile.vel.x = lerp(projectile.vel.x, desired.x * homingSpeed, dt * projectile.homingStrength);
        projectile.vel.y = lerp(projectile.vel.y, desired.y * homingSpeed, dt * projectile.homingStrength);
      }
    }

    if (projectile.owner === 'enemy' && projectile.fromUpgrade === 'brainbossOrb') {
      const desired = normalize({ x: state.player.pos.x - projectile.pos.x, y: state.player.pos.y - projectile.pos.y });
      projectile.vel.x = lerp(projectile.vel.x, desired.x * 120, dt * 1.8);
      projectile.vel.y = lerp(projectile.vel.y, desired.y * 120, dt * 1.8);
    }

    if (projectile.owner === 'enemy' && projectile.fromUpgrade === 'bossladoOrb') {
      const desired = normalize({ x: state.player.pos.x - projectile.pos.x, y: state.player.pos.y - projectile.pos.y });
      projectile.vel.x = lerp(projectile.vel.x, desired.x * 180, dt * 2.2);
      projectile.vel.y = lerp(projectile.vel.y, desired.y * 180, dt * 2.2);
    }

    projectile.pos.x += projectile.vel.x * dt;
    projectile.pos.y += projectile.vel.y * dt;

    if (projectile.owner === 'enemy') {
      const player = state.player;
      const playerCenter = { x: player.pos.x, y: player.pos.y - player.height * 0.08 };
      if (projectile.behavior === 'enemyLaser' && projectile.lineFrom) {
        const hitRadius = Math.max(player.width, player.height) * 0.28 + projectile.radius;
        if (distanceToSegment(playerCenter, projectile.lineFrom, projectile.pos) <= hitRadius) {
          if (state.effects.enemyMissChance > 0 && Math.random() * 100 < state.effects.enemyMissChance) {
            addText(state, 'miss', { x: player.pos.x, y: player.pos.y - 34 }, '#e5e7eb');
            projectile.life = 0;
            continue;
          }
          if (player.invuln > 0 && state.effects.absorbent) healPlayer(state, 1);
          damagePlayer(state, projectile.damage, projectile);
          projectile.life = 0;
          continue;
        }
      } else if (rectsOverlap(
        projectile.pos.x - projectile.radius,
        projectile.pos.y - projectile.radius,
        projectile.radius * 2,
        projectile.radius * 2,
        player.pos.x - player.width / 2,
        player.pos.y - player.height / 2,
        player.width,
        player.height,
      )) {
        if (state.effects.enemyMissChance > 0 && Math.random() * 100 < state.effects.enemyMissChance) {
          addText(state, 'miss', { x: player.pos.x, y: player.pos.y - 34 }, '#e5e7eb');
          addImpact(state, { x: projectile.pos.x, y: projectile.pos.y }, Math.max(8, projectile.radius * 1.4), '#e5e7eb', 0.12);
          projectile.life = 0;
          continue;
        }

        if (player.invuln > 0 && state.effects.absorbent) healPlayer(state, 1);
        damagePlayer(state, projectile.damage, projectile);
        projectile.life = 0;
        continue;
      }

      const groundY = getGroundY(state.terrain, projectile.pos.x);
      if (projectile.pos.y >= groundY) projectile.life = 0;
      continue;
    }

    for (const enemyProjectile of state.projectiles) {
      if (enemyProjectile.owner !== 'enemy' || enemyProjectile.life <= 0 || enemyProjectile.id === projectile.id || enemyProjectile.behavior === 'enemyLaser') continue;
      if (!rectsOverlap(
        projectile.pos.x - projectile.radius,
        projectile.pos.y - projectile.radius,
        projectile.radius * 2,
        projectile.radius * 2,
        enemyProjectile.pos.x - enemyProjectile.radius,
        enemyProjectile.pos.y - enemyProjectile.radius,
        enemyProjectile.radius * 2,
        enemyProjectile.radius * 2,
      )) continue;

      resolveProjectileClash(state, projectile, enemyProjectile);
      if (projectile.life <= 0) break;
    }
    if (projectile.life <= 0) continue;

    for (const enemy of state.enemies) {
      if (enemy.hp <= 0 || enemy.deathHandled) continue;
      const hit = rectsOverlap(
        projectile.pos.x - projectile.radius,
        projectile.pos.y - projectile.radius,
        projectile.radius * 2,
        projectile.radius * 2,
        enemy.pos.x - enemy.width / 2,
        enemy.pos.y - enemy.height / 2,
        enemy.width,
        enemy.height,
      );

      if (!hit || projectile.hitIds.includes(enemy.id)) continue;

      projectile.hitIds.push(enemy.id);
      const hitResult = resolveProjectileHit(state, enemy, projectile);
      damageEnemy(state, enemy, hitResult.damage, hitResult.color, true, projectile);

      if (projectile.behavior === 'explosive') {
        explodeAt(
          state,
          { x: enemy.pos.x, y: enemy.pos.y },
          projectile.aoeRadius,
          Math.max(1, Math.round(hitResult.damage * 0.3)),
          hitResult.color,
          [enemy.id],
          projectile,
        );
      } else if (projectile.behavior === 'meteor' || projectile.behavior === 'friction' || projectile.behavior === 'fragment') {
        explodeAt(state, { x: projectile.pos.x, y: projectile.pos.y }, projectile.aoeRadius, Math.max(1, Math.round(hitResult.damage * 0.8)), hitResult.color, [], projectile);
      }

      if (projectile.owner === 'player' && projectile.behavior !== 'pierce') {
        projectile.life = 0;
      } else if (projectile.pierce > 0) {
        projectile.pierce -= 1;
      } else {
        projectile.life = 0;
      }
      break;
    }

    const groundY = getGroundY(state.terrain, projectile.pos.x);
    const hitGround = projectile.owner === 'player' && projectile.pos.y >= groundY;
    const hitWall = projectile.owner === 'player' && (projectile.pos.x < 0 || projectile.pos.x > state.width);
    if (hitGround || hitWall) {
      maybeSpawnBlackHole(state, projectile);
      if (projectile.behavior === 'friction' || projectile.behavior === 'fragment') {
        explodeAt(state, { x: projectile.pos.x, y: Math.min(projectile.pos.y, groundY) }, projectile.aoeRadius, projectile.damage, projectile.color, [], projectile);
      }
      projectile.life = 0;
    }

    const offscreen = projectile.pos.x < -140 || projectile.pos.x > state.width + 140 || projectile.pos.y < -180 || projectile.pos.y > state.height + 180;
    if (offscreen) projectile.life = 0;
  }

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 && !enemy.deathHandled) killEnemy(state, enemy);
  }
  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
  state.projectiles = state.projectiles.filter((projectile) => projectile.life > 0);
};

const triggerExorcist = (state: GameState, pos: Vec) => {
  const strikePos = { x: pos.x, y: pos.y };
  spawnLightningStrike(state, strikePos, 'soul', { x: strikePos.x + (Math.random() * 48 - 24), y: 18 }, EXORCIST_RADIUS);
  const damage = Math.max(3, Math.round(state.player.damage * 1.2));
  explodeAt(state, strikePos, EXORCIST_RADIUS, damage, '#c084fc');
  addImpact(state, strikePos, EXORCIST_RADIUS * 1.1, 'rgba(216,180,254,0.75)', 0.22);
};

const soulOrbTouchesPlayer = (state: GameState, orb: SoulOrb) => {
  const dx = Math.abs(orb.pos.x - state.player.pos.x);
  const dy = Math.abs(orb.pos.y - state.player.pos.y);
  return dx <= state.player.width * 0.56 + orb.radius + 8 && dy <= state.player.height * 0.56 + orb.radius + 10;
};

const collectSoulOrb = (state: GameState, orb: SoulOrb) => {
  const pickupPos = { x: orb.pos.x, y: orb.pos.y };
  if (orb.kind === 'soul') {
    state.souls += orb.value;
    if (state.effects.soulBeam) triggerExorcist(state, pickupPos);
    addText(state, `+${orb.value}`, { x: pickupPos.x, y: pickupPos.y - 16 }, '#c084fc');
  } else {
    healPlayer(state, orb.value);
    if (state.effects.hoarder) state.effects.attackCharges += 1;
  }
  orb.life = 0;
};

const updateSoulOrbs = (state: GameState, dt: number) => {
  for (const orb of state.soulOrbs) {
    orb.life -= dt;
    orb.vel.y += GRAVITY * 0.55 * dt;
    const toPlayer = { x: state.player.pos.x - orb.pos.x, y: state.player.pos.y - orb.pos.y };
    const dist = Math.hypot(toPlayer.x, toPlayer.y);

    if (dist < ORB_PULL_RADIUS) {
      const pull = normalize(toPlayer);
      orb.vel.x += pull.x * 1100 * dt;
      orb.vel.y += pull.y * 1100 * dt;
    }

    orb.pos.x += orb.vel.x * dt;
    orb.pos.y += orb.vel.y * dt;
    orb.vel.x *= 0.99;
    orb.vel.y *= 0.99;

    const groundY = getGroundY(state.terrain, orb.pos.x) - orb.radius;
    if (orb.pos.y > groundY) {
      orb.pos.y = groundY;
      orb.vel.y *= -0.2;
      orb.vel.x *= 0.92;
    }

    if (soulOrbTouchesPlayer(state, orb) || distance(orb.pos, state.player.pos) < 40) {
      collectSoulOrb(state, orb);
      continue;
    }
  }

  state.soulOrbs = state.soulOrbs.filter((orb) => orb.life > 0);
};

const updateTexts = (state: GameState, dt: number) => {
  for (const text of state.texts) {
    text.life -= dt;
    text.pos.y -= 24 * dt;
  }
  state.texts = state.texts.filter((text) => text.life > 0);

  for (const strike of state.thunderStrikes) {
    strike.life -= dt;
  }
  state.thunderStrikes = state.thunderStrikes.filter((strike) => strike.life > 0);

  for (const impact of state.impacts) {
    impact.life -= dt;
  }
  state.impacts = state.impacts.filter((impact) => impact.life > 0);
};

const updatePassiveEffects = (state: GameState, dt: number, input: InputState) => {
  if (state.effects.regrowthRate > 0 && state.enemies.length > 0) {
    healPlayer(state, state.player.maxHp * state.effects.regrowthRate * state.enemies.length * dt);
  }

  if (state.effects.thunderboltCount > 0) {
    state.effects.thunderboltTimer -= dt;
    if (state.effects.thunderboltTimer <= 0) {
      state.effects.thunderboltTimer = state.effects.thunderboltInterval;
      updateThunderbolts(state);
    }
  }

  if (state.effects.plague) {
    state.effects.plagueTimer -= dt;
    if (state.effects.plagueTimer <= 0) {
      state.effects.plagueTimer = 1;
      for (const enemy of state.enemies) {
        damageEnemy(state, enemy, Math.max(1, enemy.maxHp * 0.01), '#84cc16');
      }
    }
  }

  updateWispFollowers(state, dt);
  updateWisps(state, dt, input);
  updateStreamer(state, dt, input);
  updateAimLaser(state, input);
  updateBurningMan(state, dt);

  if (state.effects.streamerBeam && !state.effects.streamer) {
    state.effects.streamerBeam.timer -= dt;
    if (state.effects.streamerBeam.timer <= 0) state.effects.streamerBeam = null;
  }
  if (!state.effects.streamer && state.effects.streamerBeam) {
    state.effects.streamerBeam = null;
  }

  if (!state.effects.barrierReady && state.effects.barrierCooldown > 0) {
    state.effects.barrierTimer -= dt;
    if (state.effects.barrierTimer <= 0) {
      state.effects.barrierReady = true;
    }
  }
};

const updateWave = (state: GameState, dt: number) => {
  if (state.status !== 'playing' || state.player.hp <= 0) return;
  state.wave.spawnTimer -= dt;
  if (state.wave.spawned < state.wave.toSpawn && state.wave.spawnTimer <= 0) {
    const forcedKind = state.wave.spawnKinds[state.wave.spawned];
    state.enemies.push(createEnemy(state.nextId++, state.wave.number, forcedKind));
    state.wave.spawned += 1;
    state.wave.spawnTimer = Math.max(0.12, 0.34 - state.wave.number * 0.006);
  }

  if (state.wave.spawned >= state.wave.toSpawn && state.enemies.length === 0) {
    beginBetweenWave(state);
  }
};

export const updateGameState = (state: GameState, input: InputState, dt: number) => {
  state.tick += dt * 1000;
  state.pointer = { ...input.mouse };

  if (state.status !== 'playing') {
    if (state.status !== 'paused' && state.status !== 'ascension') updateTexts(state, dt);
    return;
  }

  updatePlayer(state, input, dt);
  if (state.status !== 'playing') {
    updateTexts(state, dt);
    return;
  }

  updatePassiveEffects(state, dt, input);
  releaseQueuedWispShots(state, dt);
  releaseQueuedFrictionShots(state, dt);
  updateEnemies(state, dt);
  if (state.status !== 'playing') {
    updateTexts(state, dt);
    return;
  }

  updateProjectiles(state, dt);
  if (state.status !== 'playing') {
    updateTexts(state, dt);
    return;
  }

  updateSoulOrbs(state, dt);
  updateTexts(state, dt);
  updateWave(state, dt);
};

export const getSelectedMage = (state: GameState) => getMageDefinition(state.selectedMage);
