import { PLAYER_I_FRAMES, GAME_HEIGHT, GAME_WIDTH, GRAVITY, ORB_PULL_RADIUS, UPGRADE_REROLL_COST } from '@/game/constants';
import { createPlayer, getMageDefinition, MAGES } from '@/game/characters/mages';
import { createEnemy } from '@/game/monsters/monsters';
import { createShopItems } from '@/game/shop/items';
import { createProjectile, fireEnemyShot, firePlayerShot } from '@/game/spells/projectiles';
import { clamp, createTerrain, getGroundY, lerp } from '@/game/terrain';
import type {
  Enemy,
  FloatingText,
  GameState,
  InputState,
  MageId,
  Projectile,
  RunEffects,
  ShopItemId,
  SoulOrb,
  QueuedFrictionShot,
  QueuedWispShot,
  UpgradeCard,
  UpgradeId,
  Vec,
} from '@/game/types';
import { COMMON_UPGRADES, findUnlockedAscensions, getUpgradeCard, getUpgradeProgressCount, pickUpgradeCards } from '@/game/upgrades';
import { distance, normalize, pointInRect, rectsOverlap } from '@/game/utils';

const addText = (state: GameState, value: string, pos: Vec, color: string) => {
  if (/[A-Za-z]/.test(value)) return;
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

const getThunderboltBaseDamage = (state: GameState) => {
  const baseMageDamage = getMageDefinition(state.player.mageId).damage;
  return 50 + Math.max(0, state.player.damage - baseMageDamage);
};

const getThunderboltDamage = (state: GameState) => Math.max(1, Math.round(getThunderboltBaseDamage(state) * state.effects.thunderboltDamageMultiplier));

const createEffects = (): RunEffects => ({
  critChance: 0,
  critBonus: 0,
  projectileDurability: 0,
  soulDropBonus: 0,
  projectileSizeMultiplier: 1,
  invulnMultiplier: 1,
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
  thunderboltTimer: 2.5,
  thunderboltInterval: 3.2,
  thunderboltDamageMultiplier: 1,
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
  streamerBeam: null,
});

const hasAscension = (state: GameState, id: string) => state.ascensions.some((entry) => entry.id === id);

const hasActiveShopItem = (state: GameState, itemId: ShopItemId) => state.shopItems.some((item) => item.id === itemId && item.owned && item.active);

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

const applyMaxHealthUpgrade = (state: GameState, maxHpGain: number, healGain = maxHpGain) => {
  state.player.maxHp += maxHpGain;
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + healGain);
};


const getCurrentDefenseMultiplier = (state: GameState) => {
  const bunker = state.effects.bunkerArmor > 0 ? 1 - Math.min(0.95, state.effects.bunkerArmor / 100) : 1;
  return state.player.damageTakenMultiplier * bunker;
};

const spawnRingProjectiles = (state: GameState, count: number, damage: number, color: string, radius = 5) => {
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    createProjectile(state, {
      pos: { x: state.player.pos.x, y: state.player.pos.y - 6 },
      vel: { x: Math.cos(angle) * 360, y: Math.sin(angle) * 360 },
      radius,
      damage,
      color,
      life: 1.2,
      owner: 'player',
      behavior: 'fragment',
      pierce: 0,
      hitIds: [],
      aoeRadius: 20,
      homingStrength: 0,
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
const getFrictionTravelThreshold = (state: GameState) => Math.max(22, 78 - Math.max(0, state.effects.frictionShots - 1) * 12);
const getWaveSpawnCount = (waveNumber: number) => Math.max(2, 2 + (waveNumber - 1) * 2);

const beginDeathScreen = (state: GameState) => {
  state.status = 'death';
  state.enemies = [];
  state.projectiles = [];
  state.soulOrbs = [];
  state.upgrades = [];
  state.queuedFrictionShots = [];
  state.queuedWispShots = [];
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
    addText(state, 'Blocked', { x: player.pos.x, y: player.pos.y - 28 }, '#93c5fd');
    if (state.effects.protector) {
      spawnRingProjectiles(state, 8, Math.max(4, Math.round(player.damage * 0.8)), '#93c5fd', 4);
    }
    return;
  }

  const amount = Math.max(1, Math.round(rawAmount * getCurrentDefenseMultiplier(state)));
  player.hp = Math.max(0, player.hp - amount);
  player.invuln = PLAYER_I_FRAMES * state.effects.invulnMultiplier;
  addText(state, `-${amount}`, { x: player.pos.x, y: player.pos.y - 28 }, '#f87171');

  if (attacker && 'hp' in attacker && state.effects.reflectDamage > 0) {
    damageEnemy(state, attacker, amount, '#fca5a5');
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
    createOrb(state, enemy.pos, enemy.soulDropAmount, 'soul');
    addText(state, `+${enemy.soulDropAmount} soul`, { x: enemy.pos.x, y: enemy.pos.y - 20 }, '#c084fc');
  }

  if (Math.random() <= state.effects.healOrbChance) {
    createOrb(state, enemy.pos, 2, 'heal');
  }
};

const spawnFragments = (state: GameState, pos: Vec, count: number, damage: number, color: string) => {
  const origin = { x: pos.x, y: pos.y };
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 250 + Math.random() * 130;
    createProjectile(state, {
      pos: { x: origin.x, y: origin.y },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      radius: 5 * state.effects.fragmentationSizeMultiplier,
      damage,
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

const killEnemy = (state: GameState, enemy: Enemy) => {
  if (enemy.deathHandled) return;
  enemy.deathHandled = true;
  enemy.hp = 0;
  const deathPos = { x: enemy.pos.x, y: enemy.pos.y };
  state.score += enemy.scoreValue + state.wave.number * 4;
  state.wave.cleared += 1;
  trySoulDrop(state, { ...enemy, pos: deathPos });
  if (state.effects.fragmentationCount > 0) {
    const fragmentDamage = Math.max(1, Math.round(state.player.damage * 0.4)) + state.effects.fragmentationDamageBonus;
    spawnFragments(state, deathPos, state.effects.fragmentationCount, fragmentDamage, '#fbbf24');
    addImpact(state, deathPos, 22 + state.effects.fragmentationCount * 2, '#fde047', 0.22);
  }
};

const getBleedTickInterval = (state: GameState) => 1 / Math.max(1, state.effects.bleedDamageMultiplier);

const damageEnemy = (state: GameState, enemy: Enemy, amount: number, color = '#ffffff', applyOnHitEffects = true) => {
  if (enemy.deathHandled) return;
  if (enemy.hp <= 0) {
    killEnemy(state, enemy);
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
    enemy.bleed = Math.max(enemy.bleed, 2);
    enemy.bleedStacks = Math.min(4, Math.max(0, enemy.bleedStacks) + 1);
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
    killEnemy(state, enemy);
  }
};

const explodeAt = (state: GameState, center: Vec, radius: number, damage: number, color: string) => {
  addImpact(state, center, radius, color, 0.26);
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 || enemy.deathHandled) continue;
    if (distance(enemy.pos, center) <= radius) {
      damageEnemy(state, enemy, damage, color);
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


const getThunderHitTarget = (state: GameState, from: Vec, to: Vec) => {
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
    const reach = Math.max(enemy.width, enemy.height) * 0.44 + 10;
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
  const lift = 10 + Math.random() * 30;
  return {
    x: targetX,
    y: clamp(groundY - lift, 56, state.height - 26),
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
    wave: {
      number: 1,
      toSpawn: getWaveSpawnCount(1),
      spawned: 0,
      cleared: 0,
      spawnTimer: 0.55,
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
  };
};

export const createGameState = createState;

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
  state.effects.firstHitCritReady = hasAscension(state, 'marksman');
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
    spawnTimer: 0.55,
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
  state.upgrades = pickUpgradeCards(state);
};

const returnToMenu = (state: GameState) => {
  const selectedMage = state.selectedMage;
  const souls = state.souls;
  const shopItems = state.shopItems.map((item) => ({ ...item }));
  const fresh = createState();
  Object.assign(state, fresh);
  state.selectedMage = selectedMage;
  state.souls = souls;
  state.shopItems = shopItems;
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
};

const resetRun = (state: GameState) => {
  const selectedMage = state.selectedMage;
  const souls = state.souls;
  const shopItems = state.shopItems.map((item) => ({ ...item }));
  const fresh = createState();
  Object.assign(state, fresh);
  state.selectedMage = selectedMage;
  state.souls = souls;
  state.shopItems = shopItems;
  state.player = createPlayer(state.terrain, selectedMage);
  applyOwnedShopItemsToPlayer(state);
  startWave(state, 1);
};

export const selectMage = (state: GameState, mageId: MageId) => {
  state.selectedMage = mageId;
  state.player = createPlayer(state.terrain, mageId);
  applyOwnedShopItemsToPlayer(state);
};

export const startSelectedRun = (state: GameState) => {
  resetRun(state);
};

const applyAscension = (state: GameState, card: UpgradeCard) => {
  if (state.ascensions.some((entry) => entry.id === card.id)) return;
  state.ascensions.push(card);
  addText(state, `${card.name} ascended`, { x: state.width / 2, y: 148 }, '#f59e0b');

  switch (card.id) {
    case 'absorbent':
      state.effects.absorbent = true;
      break;
    case 'antiAircraft':
      state.effects.frictionRadiusMultiplier *= 1.8;
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
      state.effects.enemyMissChance = Math.max(state.effects.enemyMissChance, 0.33);
      break;
    case 'godOfThunder':
      state.effects.thunderboltDamageMultiplier *= 3;
      break;
    case 'hoarder':
      state.effects.hoarder = true;
      break;
    case 'marksman':
      state.effects.firstHitCritReady = true;
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
      break;
    case 'sadistic':
      state.effects.reflectDamage += 1;
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
};

function applyUpgrade(state: GameState, upgradeId: UpgradeId, silent = false) {
  const card = getUpgradeCard(upgradeId);
  state.upgradeCounts[upgradeId] = (state.upgradeCounts[upgradeId] ?? 0) + 1;
  const commonBonus = card.rarity === 'common' ? state.effects.commonEffectivenessBonus : 0;
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
      state.player.jumpPower *= 1 + 0.3 * scale;
      break;
    case 'renew':
      state.player.hp = state.player.maxHp;
      break;
    case 'resist':
      state.player.damageTakenMultiplier *= Math.max(0.35, 1 - 0.04 * scale);
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
      state.player.moveSpeed *= 1 + 0.2 * scale;
      break;
    case 'catalystPlus':
      state.player.damage += 4;
      break;
    case 'charge':
      state.effects.projectileSizeMultiplier *= 1.2;
      break;
    case 'cloak':
      state.effects.invulnMultiplier += 0.1;
      break;
    case 'fragmentation':
      state.effects.fragmentationCount = state.effects.fragmentationCount === 0 ? 3 : state.effects.fragmentationCount + 1;
      state.effects.fragmentationDamageBonus += 1;
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
      state.effects.healOrbChance += 0.05;
      break;
    case 'precision':
      state.effects.critBonus += 0.5;
      break;
    case 'rage':
      state.effects.ragePower += 0.12;
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
      state.player.moveSpeed *= 1.4;
      break;
    case 'thunderbolt':
      state.effects.thunderboltCount += 2;
      state.effects.thunderboltTimer = 1.6;
      break;
    case 'appraisal':
      state.effects.appraisalChoices += 1;
      break;
    case 'barrier':
      state.effects.barrierCooldown = state.effects.barrierCooldown > 0 ? Math.max(2.6, state.effects.barrierCooldown - 0.4) : 6;
      state.effects.barrierReady = true;
      state.effects.barrierTimer = state.effects.barrierCooldown;
      break;
    case 'cold':
      state.effects.coldPerHit += 0.01;
      break;
    case 'fragmentationPlus':
      state.effects.fragmentationCount = Math.max(3, state.effects.fragmentationCount) + 3;
      state.effects.fragmentationDamageBonus += 3;
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
    case 'immortal':
      state.effects.reviveCharges += 1;
      break;
    case 'leechPlus':
      state.effects.lifesteal += 0.09;
      break;
    case 'overheat':
      state.effects.bodyDamage += 40;
      break;
    case 'thunderboltPlus':
      state.effects.thunderboltCount += 6;
      state.effects.thunderboltTimer = 1.2;
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
  unlocked.forEach((ascension) => applyAscension(state, ascension));

  state.upgrades = [];
  if (!silent) {
    addText(state, 'Upgrade taken', { x: state.width / 2, y: 118 }, '#fde68a');
    startWave(state, state.wave.number + 1);
  }
}

const rerollUpgrades = (state: GameState) => {
  if (state.status !== 'between') return;
  const hasUnlimitedFreeRerolls = hasActiveShopItem(state, 'dealerStaff');
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

  if (state.status === 'menu') {
    if (['1', '2', '3', '4', '5'].includes(key)) {
      const mage = MAGES[Number(key) - 1];
      if (mage) selectMage(state, mage.id);
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
        selectMage(state, card.id);
        return;
      }
    }

    if (state.ui.startRect && pointInRect(point, state.ui.startRect)) {
      startSelectedRun(state);
      return;
    }

    if (state.ui.shopRect && pointInRect(point, state.ui.shopRect)) {
      openShop(state);
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
  } else if (player.vel.y >= 0 && nextFoot >= nextGround && previousFoot <= Math.max(previousGround, nextGround) + 16) {
    nextY = nextGround - player.height / 2;
    player.vel.y = 0;
    player.onGround = true;
    player.jumpsRemaining = Math.max(0, player.maxJumps - 1);
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

  return dx <= (player.width + enemy.width) * 0.56 && dy <= (player.height + enemy.height) * 0.62;
};

const updateThunderbolts = (state: GameState) => {
  if (state.effects.thunderboltCount <= 0 || state.enemies.length === 0) return;
  for (let i = 0; i < state.effects.thunderboltCount; i += 1) {
    const target = getThunderStrikeGroundTarget(state, 32 + Math.random() * (state.width - 64));
    const lineFrom = {
      x: target.x + (Math.random() * 60 - 30),
      y: 20,
    };
    const damage = getThunderboltDamage(state);
    state.thunderStrikes.push({
      id: state.nextId++,
      from: lineFrom,
      to: target,
      life: 0.28,
      maxLife: 0.28,
    });
    createProjectile(state, {
      pos: target,
      lineFrom,
      vel: { x: 0, y: 0 },
      radius: 2,
      damage,
      color: '#60a5fa',
      life: 0.02,
      owner: 'player',
      behavior: 'thunder',
      pierce: 1,
      hitIds: [],
      aoeRadius: 0,
      homingStrength: 0,
    });
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
    createProjectile(state, {
      pos: { ...shot.origin },
      vel: { x: dir.x * shot.speed, y: dir.y * shot.speed },
      radius: 4,
      damage: shot.damage,
      color: shot.color,
      life: 1.85,
      owner: 'player',
      behavior: 'wisp',
      pierce: 0,
      hitIds: [],
      aoeRadius: 0,
      homingStrength: 0,
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
  const projectileSpeed = state.player.projectileSpeed * 0.55 * attackSpeedFactor;
  const damage = Math.max(1, Math.round(state.player.damage * 0.5));

  for (let i = 0; i < state.effects.wisps; i += 1) {
    const angle = state.effects.enchanter ? 0 : state.tick * 0.002 + i * (Math.PI * 2 / Math.max(1, state.effects.wisps));
    const origin = state.effects.enchanter
      ? { x: state.player.pos.x + state.player.facing * (14 + i * 4), y: state.player.pos.y - 10 }
      : { x: state.player.pos.x + Math.cos(angle) * 16, y: state.player.pos.y - 10 + Math.sin(angle) * 10 };

    const queuedShot: QueuedWispShot = {
      delay: i * shotSpacing,
      origin,
      target: { ...primaryTarget },
      speed: projectileSpeed,
      damage,
      color: '#f5d0fe',
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
  if (!state.effects.enchanter && !state.effects.streamer) return;
  const { from, to } = getAimBeamPoints(state, input);
  state.effects.streamerBeam = {
    from,
    to,
    timer: state.effects.enchanter ? 1 : 0.2,
  };
};

const updateStreamer = (state: GameState, dt: number, input: InputState) => {
  if (!state.effects.streamer) return;

  const { from, to } = getAimBeamPoints(state, input);
  state.effects.streamerBeam = { from, to, timer: state.effects.enchanter ? 1 : 0.2 };

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
    enemy.bleed = Math.max(0, enemy.bleed - dt);
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);

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

    const desiredY = getGroundY(state.terrain, enemy.pos.x) - enemy.hoverHeight + Math.sin(state.tick * 0.004 + enemy.hoverPhase) * 12;
    const settleFactor = enemy.pos.y < desiredY - 80 ? 0.012 : 0.028;
    enemy.pos.y = lerp(enemy.pos.y, desiredY, settleFactor);

    const toPlayer = { x: player.pos.x - enemy.pos.x, y: player.pos.y - enemy.pos.y };
    const planarDistance = Math.hypot(toPlayer.x, toPlayer.y);
    const direction = normalize(toPlayer);
    const speedFactor = Math.max(0, 1 - enemy.slow);

    if (enemy.isRanged) {
      const horizontal = player.pos.x - enemy.pos.x;
      const absHorizontal = Math.abs(horizontal);
      if (absHorizontal < enemy.preferredRange - 28) {
        enemy.pos.x -= Math.sign(horizontal) * enemy.speed * speedFactor * dt;
      } else if (absHorizontal > enemy.preferredRange + 18) {
        enemy.pos.x += Math.sign(horizontal) * enemy.speed * speedFactor * dt;
      }

      enemy.pos.x = clamp(enemy.pos.x, enemy.width / 2 + 10, state.width - enemy.width / 2 - 10);
      enemy.shootCooldown -= dt;
      if (enemy.shootCooldown <= 0 && planarDistance < 520) {
        fireEnemyShot(state, enemy);
        enemy.shootCooldown = enemy.shootRate + Math.random() * 0.35;
      }
    } else {
      enemy.pos.x += direction.x * enemy.speed * speedFactor * dt;
      const verticalChase = enemy.pos.y > desiredY - 26 ? direction.y * enemy.speed * 0.45 * speedFactor * dt : 0;
      enemy.pos.y += verticalChase;
      enemy.pos.x = clamp(enemy.pos.x, enemy.width / 2 + 10, state.width - enemy.width / 2 - 10);
    }

    if (enemyTouchesPlayer(state, enemy)) {
      damagePlayer(state, enemy.damage, enemy);
      if (state.effects.bodyDamage > 0 && enemy.bodyHitCooldown <= 0) {
        damageEnemy(state, enemy, state.effects.bodyDamage, '#f97316');
        enemy.bodyHitCooldown = 0.45;
      }
      if (!enemy.isRanged) {
        const pushStrength = state.effects.bulldozer ? 26 : 10;
        const push = normalize({ x: player.pos.x - enemy.pos.x, y: (player.pos.y - 6) - enemy.pos.y });
        enemy.pos.x -= push.x * pushStrength;
        enemy.pos.y -= push.y * pushStrength;
      }
    }
  }

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
    aoeRadius: 70,
    homingStrength: 0,
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
    if (state.effects.pacMan && enemyProjectileHp <= 0) {
      projectile.damage += 1 + Math.round(projectile.chargeBonus ?? 0);
    }
  }
};

const updateProjectiles = (state: GameState, dt: number) => {
  for (const projectile of state.projectiles) {
    projectile.life -= dt;

    if (projectile.behavior === 'thunder') {
      const from = projectile.lineFrom ?? { x: projectile.pos.x, y: 20 };
      const hitTarget = getThunderHitTarget(state, from, projectile.pos);
      if (hitTarget) {
        damageEnemy(state, hitTarget, projectile.damage, projectile.color);
        addImpact(state, hitTarget.pos, Math.max(18, hitTarget.width * 0.85), projectile.color, 0.22);
      } else {
        addImpact(state, projectile.pos, 28, projectile.color, 0.18);
      }
      projectile.life = 0;
      continue;
    }

    if (projectile.behavior === 'blackhole') {
      for (const enemy of state.enemies) {
        const dist = distance(enemy.pos, projectile.pos);
        if (dist <= projectile.aoeRadius) {
          const pull = normalize({ x: projectile.pos.x - enemy.pos.x, y: projectile.pos.y - enemy.pos.y });
          enemy.pos.x += pull.x * 60 * dt;
          enemy.pos.y += pull.y * 50 * dt;
          damageEnemy(state, enemy, projectile.damage * dt, '#a855f7');
        }
      }
      continue;
    }

    if (projectile.owner === 'player' && projectile.behavior === 'homing') {
      const target = nearestEnemy(state, projectile.pos, 260);
      if (target) {
        const desired = normalize({ x: target.pos.x - projectile.pos.x, y: target.pos.y - projectile.pos.y });
        projectile.vel.x = lerp(projectile.vel.x, desired.x * state.player.projectileSpeed, dt * projectile.homingStrength);
        projectile.vel.y = lerp(projectile.vel.y, desired.y * state.player.projectileSpeed, dt * projectile.homingStrength);
      }
    }

    projectile.pos.x += projectile.vel.x * dt;
    projectile.pos.y += projectile.vel.y * dt;

    if (projectile.owner === 'enemy') {
      const player = state.player;
      if (rectsOverlap(
        projectile.pos.x - projectile.radius,
        projectile.pos.y - projectile.radius,
        projectile.radius * 2,
        projectile.radius * 2,
        player.pos.x - player.width / 2,
        player.pos.y - player.height / 2,
        player.width,
        player.height,
      )) {
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
      if (enemyProjectile.owner !== 'enemy' || enemyProjectile.life <= 0 || enemyProjectile.id === projectile.id) continue;
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
      damageEnemy(state, enemy, projectile.damage, projectile.color);

      if (projectile.behavior === 'explosive' || projectile.behavior === 'meteor' || projectile.behavior === 'friction' || projectile.behavior === 'fragment') {
        explodeAt(state, { x: projectile.pos.x, y: projectile.pos.y }, projectile.aoeRadius, Math.max(1, Math.round(projectile.damage * 0.8)), projectile.color);
      }

      if (projectile.pierce > 0) {
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
        explodeAt(state, { x: projectile.pos.x, y: Math.min(projectile.pos.y, groundY) }, projectile.aoeRadius, projectile.damage, projectile.color);
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

const updateSoulOrbs = (state: GameState, dt: number) => {
  for (const orb of state.soulOrbs) {
    orb.life -= dt;
    orb.vel.y += GRAVITY * 0.24 * dt;
    const toPlayer = { x: state.player.pos.x - orb.pos.x, y: state.player.pos.y - orb.pos.y };
    const dist = Math.hypot(toPlayer.x, toPlayer.y);

    if (dist < ORB_PULL_RADIUS) {
      const pull = normalize(toPlayer);
      orb.vel.x += pull.x * 600 * dt;
      orb.vel.y += pull.y * 600 * dt;
    }

    orb.pos.x += orb.vel.x * dt;
    orb.pos.y += orb.vel.y * dt;
    orb.vel.x *= 0.98;
    orb.vel.y *= 0.98;

    const groundY = getGroundY(state.terrain, orb.pos.x) - orb.radius;
    if (orb.pos.y > groundY) {
      orb.pos.y = groundY;
      orb.vel.y *= -0.2;
      orb.vel.x *= 0.92;
    }

    if (distance(orb.pos, state.player.pos) < 22) {
      if (orb.kind === 'soul') {
        state.souls += orb.value;
        if (state.effects.soulBeam) {
          const target = nearestEnemy(state, orb.pos, 420);
          if (target) damageEnemy(state, target, Math.max(3, Math.round(state.player.damage * 1.2)), '#c084fc');
        }
        addText(state, `+${orb.value}`, { x: orb.pos.x, y: orb.pos.y - 16 }, '#c084fc');
      } else {
        healPlayer(state, orb.value);
        if (state.effects.hoarder) state.effects.attackCharges += 1;
      }
      orb.life = 0;
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

  updateWisps(state, dt, input);
  updateStreamer(state, dt, input);
  updateAimLaser(state, input);
  updateBurningMan(state, dt);

  if (state.effects.streamerBeam && !state.effects.enchanter) {
    state.effects.streamerBeam.timer -= dt;
    if (state.effects.streamerBeam.timer <= 0) state.effects.streamerBeam = null;
  }
  if (!state.effects.enchanter && !state.effects.streamer && state.effects.streamerBeam) {
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
    state.enemies.push(createEnemy(state.nextId++, state.wave.number));
    state.wave.spawned += 1;
    state.wave.spawnTimer = Math.max(0.4, 0.86 - state.wave.number * 0.012);
  }

  if (state.wave.spawned >= state.wave.toSpawn && state.enemies.length === 0) {
    beginBetweenWave(state);
  }
};

export const updateGameState = (state: GameState, input: InputState, dt: number) => {
  state.tick += dt * 1000;
  state.pointer = { ...input.mouse };

  if (state.status !== 'playing') {
    if (state.status !== 'paused') updateTexts(state, dt);
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
