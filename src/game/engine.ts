import { PLAYER_I_FRAMES, GAME_HEIGHT, GAME_WIDTH, GRAVITY, ORB_PULL_RADIUS } from '@/game/constants';
import { createPlayer, getMageDefinition, MAGES } from '@/game/characters/mages';
import { createEnemy } from '@/game/monsters/monsters';
import { createShopItems } from '@/game/shop/items';
import { fireEnemyShot, firePlayerShot } from '@/game/spells/projectiles';
import { clamp, createTerrain, getGroundY, lerp } from '@/game/terrain';
import type {
  Enemy,
  FloatingText,
  GameState,
  InputState,
  MageId,
  Projectile,
  ShopItemId,
  SoulOrb,
  UpgradeId,
  Vec,
} from '@/game/types';
import { createEmptyUpgradeCounts, pickUpgradeCards } from '@/game/upgrades';
import { distance, normalize, pointInRect, rectsOverlap } from '@/game/utils';

const addText = (state: GameState, value: string, pos: Vec, color: string) => {
  const text: FloatingText = {
    id: state.nextId++,
    pos: { ...pos },
    value,
    color,
    life: 1,
  };
  state.texts.push(text);
};

const createSoulOrb = (state: GameState, pos: Vec, amount: number) => {
  const orb: SoulOrb = {
    id: state.nextId++,
    pos: { x: pos.x, y: pos.y },
    vel: { x: Math.random() * 80 - 40, y: -40 - Math.random() * 40 },
    value: amount,
    radius: 6,
    life: 14,
  };
  state.soulOrbs.push(orb);
};

const damagePlayer = (state: GameState, rawAmount: number) => {
  const player = state.player;
  if (player.invuln > 0 || state.status !== 'playing') return;

  const amount = Math.max(1, Math.round(rawAmount * player.damageTakenMultiplier));
  player.hp = Math.max(0, player.hp - amount);
  player.invuln = PLAYER_I_FRAMES;
  addText(state, `-${amount}`, { x: player.pos.x, y: player.pos.y - 28 }, '#f87171');

  if (player.hp <= 0) {
    state.status = 'deathshop';
    state.enemies = [];
    state.projectiles = [];
    state.soulOrbs = [];
    state.upgrades = [];
    addText(state, 'Run ended', { x: state.width / 2, y: 118 }, '#f8fafc');
  }
};

const trySoulDrop = (state: GameState, enemy: Enemy) => {
  if (Math.random() <= enemy.soulDropChance) {
    createSoulOrb(state, enemy.pos, enemy.soulDropAmount);
    addText(state, `+${enemy.soulDropAmount} soul`, { x: enemy.pos.x, y: enemy.pos.y - 20 }, '#c084fc');
  }
};

const killEnemy = (state: GameState, enemy: Enemy) => {
  state.score += enemy.scoreValue + state.wave.number * 4;
  state.wave.cleared += 1;
  trySoulDrop(state, enemy);
};

const damageEnemy = (state: GameState, enemy: Enemy, amount: number, color = '#ffffff') => {
  enemy.hp -= amount;
  enemy.hitFlash = 0.12;
  addText(state, `${amount}`, { x: enemy.pos.x, y: enemy.pos.y - 12 }, color);
  if (enemy.hp <= 0) {
    killEnemy(state, enemy);
  }
};

const explodeAt = (state: GameState, center: Vec, radius: number, damage: number, color: string) => {
  addText(state, 'BOOM', { x: center.x, y: center.y - 12 }, color);
  for (const enemy of state.enemies) {
    if (distance(enemy.pos, center) <= radius) {
      damageEnemy(state, enemy, damage, color);
    }
  }
};

const nearestEnemy = (state: GameState, from: Vec, maxDistance = Number.POSITIVE_INFINITY) => {
  let best: Enemy | null = null;
  let bestDistance = maxDistance;

  for (const enemy of state.enemies) {
    const current = distance(from, enemy.pos);
    if (current < bestDistance) {
      best = enemy;
      bestDistance = current;
    }
  }

  return best;
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
    wave: {
      number: 1,
      toSpawn: 10,
      spawned: 0,
      cleared: 0,
      spawnTimer: 0.3,
    },
    fireTimer: 0.1,
    souls: 0,
    score: 0,
    upgrades: [],
    upgradeCounts: createEmptyUpgradeCounts(),
    shopItems: createShopItems(),
    ui: {
      mageCards: [],
      startRect: null,
      upgradeCards: [],
      hudUpgradeIcons: [],
      shopCards: [],
      nextWaveRect: null,
      restartRect: null,
    },
    pointer: { x: GAME_WIDTH * 0.7, y: GAME_HEIGHT * 0.45 },
  };
};

export const createGameState = createState;

const applyOwnedShopItemsToPlayer = (state: GameState) => {
  state.player.damageTakenMultiplier = 1;
  state.player.moveSpeed = 270;
  state.player.jumpPower = 650;

  for (const item of state.shopItems) {
    if (!item.owned) continue;

    if (item.id === 'amberAura') {
      state.player.damageTakenMultiplier *= 0.8;
      state.player.moveSpeed *= 0.85;
    }

    if (item.id === 'shadowAura') {
      state.player.jumpPower += 150;
    }
  }
};


const startWave = (state: GameState, number: number) => {
  state.wave = {
    number,
    toSpawn: 8 + number * 3,
    spawned: 0,
    cleared: 0,
    spawnTimer: 0.4,
  };
  state.status = 'playing';
  state.fireTimer = 0.1;
  addText(state, `Wave ${number}`, { x: state.width / 2, y: 88 }, '#f5d0fe');
};

const beginBetweenWave = (state: GameState) => {
  if (state.player.hp <= 0 || state.status !== 'playing') return;
  state.status = 'between';
  state.upgrades = pickUpgradeCards();
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
};

export const startSelectedRun = (state: GameState) => {
  resetRun(state);
};

const applyUpgrade = (state: GameState, upgradeId: UpgradeId) => {
  state.upgradeCounts[upgradeId] += 1;

  switch (upgradeId) {
    case 'power':
      state.player.damage += 1;
      break;
    case 'rapid':
      state.player.fireInterval = Math.max(0.15, state.player.fireInterval * 0.88);
      break;
    case 'stride':
      state.player.moveSpeed += 25;
      break;
    case 'vitality':
      state.player.maxHp += 2;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 2);
      break;
    case 'focus':
      state.player.projectileSpeed += 90;
      break;
    case 'feather':
      state.player.jumpPower += 80;
      break;
    default:
      break;
  }

  state.upgrades = [];
  addText(state, 'Upgrade taken', { x: state.width / 2, y: 118 }, '#fde68a');
  startWave(state, state.wave.number + 1);
};

const buyShopItem = (state: GameState, itemId: ShopItemId) => {
  const item = state.shopItems.find((entry) => entry.id === itemId);
  if (!item || item.owned || state.souls < item.cost) return;

  state.souls -= item.cost;
  item.owned = true;
  addText(state, `${item.name} purchased`, { x: state.width / 2, y: 150 }, item.id === 'amberAura' ? '#f59e0b' : '#d1d5db');
};

export const handleActionKey = (state: GameState, key: string) => {
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

  if (state.status === 'deathshop' && key === 'Enter') {
    startSelectedRun(state);
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

    return;
  }

  if (state.status === 'deathshop') {
    for (const card of state.ui.shopCards) {
      if (pointInRect(point, card.rect)) {
        buyShopItem(state, card.id);
        return;
      }
    }

    if (state.ui.restartRect && pointInRect(point, state.ui.restartRect)) {
      startSelectedRun(state);
    }
  }
};

const updatePlayer = (state: GameState, input: InputState, dt: number) => {
  const player = state.player;
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  player.vel.x = lerp(player.vel.x, direction * player.moveSpeed, 0.18);
  if (direction !== 0) player.facing = direction > 0 ? 1 : -1;

  const nextX = clamp(player.pos.x + player.vel.x * dt, player.width / 2 + 8, state.width - player.width / 2 - 8);

  if (input.jumpPressed && player.onGround) {
    player.vel.y = -player.jumpPower;
    player.onGround = false;
  }

  const previousFoot = player.pos.y + player.height / 2;
  const previousGround = getGroundY(state.terrain, player.pos.x);
  player.vel.y += GRAVITY * dt;
  let nextY = player.pos.y + player.vel.y * dt;
  const nextGround = getGroundY(state.terrain, nextX);
  const nextFoot = nextY + player.height / 2;

  if (player.onGround && !input.jumpPressed) {
    nextY = nextGround - player.height / 2;
    player.vel.y = 0;
  } else if (player.vel.y >= 0 && nextFoot >= nextGround && previousFoot <= Math.max(previousGround, nextGround) + 16) {
    nextY = nextGround - player.height / 2;
    player.vel.y = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  player.pos.x = nextX;
  player.pos.y = nextY;

  if (player.invuln > 0) {
    player.invuln = Math.max(0, player.invuln - dt);
  }

  state.fireTimer -= dt;
  if (input.mouseDown && state.fireTimer <= 0) {
    firePlayerShot(state, input.mouse);
    state.fireTimer = player.fireInterval;
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

const updateEnemies = (state: GameState, dt: number) => {
  const player = state.player;

  for (const enemy of state.enemies) {
    const desiredY = getGroundY(state.terrain, enemy.pos.x) - enemy.hoverHeight + Math.sin(state.tick * 0.004 + enemy.hoverPhase) * 12;
    enemy.pos.y = lerp(enemy.pos.y, desiredY, 0.04);
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);

    const toPlayer = { x: player.pos.x - enemy.pos.x, y: player.pos.y - enemy.pos.y };
    const planarDistance = Math.hypot(toPlayer.x, toPlayer.y);
    const direction = normalize(toPlayer);

    if (enemy.isRanged) {
      const horizontal = player.pos.x - enemy.pos.x;
      const absHorizontal = Math.abs(horizontal);
      if (absHorizontal < enemy.preferredRange - 18) {
        enemy.pos.x -= Math.sign(horizontal) * enemy.speed * dt;
      } else if (absHorizontal > enemy.preferredRange + 24) {
        enemy.pos.x += Math.sign(horizontal) * enemy.speed * dt;
      }

      enemy.pos.x = clamp(enemy.pos.x, enemy.width / 2 + 10, state.width - enemy.width / 2 - 10);
      enemy.shootCooldown -= dt;
      if (enemy.shootCooldown <= 0 && planarDistance < 520) {
        fireEnemyShot(state, enemy);
        enemy.shootCooldown = enemy.shootRate;
      }
    } else {
      enemy.pos.x += direction.x * enemy.speed * dt;
      enemy.pos.y += direction.y * enemy.speed * dt;
      enemy.pos.x = clamp(enemy.pos.x, enemy.width / 2 + 10, state.width - enemy.width / 2 - 10);
    }

    if (enemyTouchesPlayer(state, enemy)) {
      damagePlayer(state, enemy.damage);
      if (!enemy.isRanged) {
        const push = normalize({ x: player.pos.x - enemy.pos.x, y: (player.pos.y - 6) - enemy.pos.y });
        enemy.pos.x -= push.x * 10;
        enemy.pos.y -= push.y * 10;
      }
    }
  }

  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
};

const updateProjectiles = (state: GameState, dt: number) => {
  for (const projectile of state.projectiles) {
    projectile.life -= dt;

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
        damagePlayer(state, projectile.damage);
        projectile.life = 0;
        continue;
      }

      const groundY = getGroundY(state.terrain, projectile.pos.x);
      if (projectile.pos.y >= groundY) projectile.life = 0;
      continue;
    }

    for (const enemy of state.enemies) {
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

      if (projectile.behavior === 'explosive' || projectile.behavior === 'meteor') {
        explodeAt(state, { x: projectile.pos.x, y: projectile.pos.y }, projectile.aoeRadius, projectile.damage, projectile.color);
      }

      if (projectile.pierce > 0) {
        projectile.pierce -= 1;
      } else {
        projectile.life = 0;
      }
      break;
    }

    const offscreen = projectile.pos.x < -80 || projectile.pos.x > state.width + 80 || projectile.pos.y < -120 || projectile.pos.y > state.height + 120;
    if (offscreen) projectile.life = 0;
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
      state.souls += orb.value;
      orb.life = 0;
      addText(state, `+${orb.value}`, { x: orb.pos.x, y: orb.pos.y - 16 }, '#c084fc');
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
};

const updateWave = (state: GameState, dt: number) => {
  if (state.status !== 'playing' || state.player.hp <= 0) return;
  state.wave.spawnTimer -= dt;
  if (state.wave.spawned < state.wave.toSpawn && state.wave.spawnTimer <= 0) {
    state.enemies.push(createEnemy(state.nextId++, state.wave.number));
    state.wave.spawned += 1;
    state.wave.spawnTimer = Math.max(0.28, 0.7 - state.wave.number * 0.03);
  }

  if (state.wave.spawned >= state.wave.toSpawn && state.enemies.length === 0) {
    beginBetweenWave(state);
  }
};

export const updateGameState = (state: GameState, input: InputState, dt: number) => {
  state.tick += dt * 1000;
  state.pointer = { ...input.mouse };

  if (state.status !== 'playing') {
    updateTexts(state, dt);
    return;
  }

  updatePlayer(state, input, dt);
  if (state.status !== 'playing') {
    updateTexts(state, dt);
    return;
  }

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
