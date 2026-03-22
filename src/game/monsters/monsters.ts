import { GAME_WIDTH, MONSTER_ATTACK_SPEED_MULTIPLIER } from "@/game/constants";
import type { Enemy, EnemyKind } from "@/game/types";

type EnemyBase = {
  width: number;
  height: number;
  hp: number;
  damage: number;
  speed: number;
  ranged: boolean;
  preferredRange: number;
  shootRate: number;
  projectileSpeed: number;
  projectileRadius: number;
  projectileColor: string;
  bodyColor: string;
  hoverHeight: number;
  soulDropChance: number;
  soulDropAmount: number;
  scoreValue: number;
  minWave: number;
  weight: number;
  cornerShooter?: boolean;
};

const MONSTER_BASES: Record<EnemyKind, EnemyBase> = {
  // Melee progression: Crusher -> Mauler -> Stalker -> Behemoth
  crusher: {
    width: 52,
    height: 52,
    hp: 50,
    damage: 5,
    speed: 62,
    ranged: false,
    preferredRange: 0,
    shootRate: 0,
    projectileSpeed: 0,
    projectileRadius: 0,
    projectileColor: "#000000",
    bodyColor: "#f97316",
    hoverHeight: 138,
    soulDropChance: 0.04,
    soulDropAmount: 1,
    scoreValue: 12,
    minWave: 1,
    weight: 1.45,
  },
  mauler: {
    width: 48,
    height: 48,
    hp: 250,
    damage: 30,
    speed: 74,
    ranged: false,
    preferredRange: 0,
    shootRate: 0,
    projectileSpeed: 0,
    projectileRadius: 0,
    projectileColor: "#000000",
    bodyColor: "#75ef44",
    hoverHeight: 150,
    soulDropChance: 0.06,
    soulDropAmount: 1,
    scoreValue: 16,
    minWave: 15,
    weight: 1.05,
  },
  stalker: {
    width: 45,
    height: 45,
    hp: 500,
    damage: 60,
    speed: 86,
    ranged: false,
    preferredRange: 0,
    shootRate: 0,
    projectileSpeed: 0,
    projectileRadius: 0,
    projectileColor: "#000000",
    bodyColor: "#22a7c9",
    hoverHeight: 176,
    soulDropChance: 0.08,
    soulDropAmount: 1,
    scoreValue: 21,
    minWave: 25,
    weight: 0.72,
  },
  behemoth: {
    width: 70,
    height: 70,
    hp: 1000,
    damage: 150,
    speed: 54,
    ranged: false,
    preferredRange: 0,
    shootRate: 0,
    projectileSpeed: 0,
    projectileRadius: 0,
    projectileColor: "#000000",
    bodyColor: "#8b5cf6",
    hoverHeight: 142,
    soulDropChance: 0.10,
    soulDropAmount: 1,
    scoreValue: 30,
    minWave: 35,
    weight: 0.42,
  },

  // Ranged progression: Wisp -> Spitter -> Slinger -> Oracle -> Hexeye -> Starseer
  wisp: {
    width: 38,
    height: 38,
    hp: 15,
    damage: 3,
    speed: 88,
    ranged: true,
    preferredRange: 340,
    shootRate: 2.35,
    projectileSpeed: 190,
    projectileRadius: 4,
    projectileColor: "#fb923c",
    bodyColor: "#f56200",
    hoverHeight: 250,
    soulDropChance: 0.03,
    soulDropAmount: 1,
    scoreValue: 9,
    minWave: 1,
    weight: 1.2,
  },
  spitter: {
    width: 42,
    height: 42,
    hp: 200,
    damage: 30,
    speed: 84,
    ranged: true,
    preferredRange: 410,
    shootRate: 2.55,
    projectileSpeed: 205,
    projectileRadius: 5,
    projectileColor: "#ab0bf5",
    bodyColor: "#f85b83",
    hoverHeight: 300,
    soulDropChance: 0.05,
    soulDropAmount: 1,
    scoreValue: 14,
    minWave: 10,
    weight: 1,
  },
  slinger: {
    width: 46,
    height: 46,
    hp: 400,
    damage: 50,
    speed: 80,
    ranged: true,
    preferredRange: 455,
    shootRate: 2.9,
    projectileSpeed: 180,
    projectileRadius: 8,
    projectileColor: "#60a5fa",
    bodyColor: "#38bdf8",
    hoverHeight: 310,
    soulDropChance: 0.07,
    soulDropAmount: 1,
    scoreValue: 18,
    minWave: 20,
    weight: 0.82,
  },
  oracle: {
    width: 50,
    height: 50,
    hp: 800,
    damage: 100,
    speed: 76,
    ranged: true,
    preferredRange: 520,
    shootRate: 3.2,
    projectileSpeed: 220,
    projectileRadius: 6,
    projectileColor: "#413839",
    bodyColor: "#7bbd7e",
    hoverHeight: 342,
    soulDropChance: 0.09,
    soulDropAmount: 1,
    scoreValue: 23,
    minWave: 30,
    weight: 0.66,
  },
  hexeye: {
    width: 56,
    height: 56,
    hp: 1500,
    damage: 150,
    speed: 72,
    ranged: true,
    preferredRange: 575,
    shootRate: 3.45,
    projectileSpeed: 165,
    projectileRadius: 12,
    projectileColor: "#c4d8c2",
    bodyColor: "#3a21a8",
    hoverHeight: 356,
    soulDropChance: 0.11,
    soulDropAmount: 1,
    scoreValue: 28,
    minWave: 40,
    weight: 0.5,
  },
  starseer: {
    width: 62,
    height: 62,
    hp: 2000,
    damage: 250,
    speed: 68,
    ranged: true,
    preferredRange: 700,
    shootRate: 3.8,
    projectileSpeed: 150,
    projectileRadius: 10,
    projectileColor: "#ea0808",
    bodyColor: "#c0c400",
    hoverHeight: 390,
    soulDropChance: 0.12,
    soulDropAmount: 1,
    scoreValue: 34,
    minWave: 45,
    weight: 0.35,
    cornerShooter: true,
  },

  bossladoLaser: {
    width: 100,
    height: 100,
    hp: 300000,
    damage: 2700,
    speed: 90,
    ranged: true,
    preferredRange: 0,
    shootRate: 0,
    projectileSpeed: 0,
    projectileRadius: 0,
    projectileColor: "#3ff47b",
    bodyColor: "#ffffff",
    hoverHeight: 142,
    soulDropChance: 1,
    soulDropAmount: 1,
    scoreValue: 260,
    minWave: 100,
    weight: 0,
  },
  bossladoOrb: {
    width: 100,
    height: 100,
    hp: 300000,
    damage: 2700,
    speed: 84,
    ranged: true,
    preferredRange: 0,
    shootRate: 0,
    projectileSpeed: 0,
    projectileRadius: 0,
    projectileColor: "#a855f7",
    bodyColor: "#ffffff",
    hoverHeight: 142,
    soulDropChance: 1,
    soulDropAmount: 1,
    scoreValue: 260,
    minWave: 100,
    weight: 0,
  },
  brainboss: {
    width: 168,
    height: 142,
    hp: 50000,
    damage: 300,
    speed: 68,
    ranged: true,
    preferredRange: 0,
    shootRate: 0,
    projectileSpeed: 0,
    projectileRadius: 0,
    projectileColor: "#f43f5e",
    bodyColor: "#f472b6",
    hoverHeight: 188,
    soulDropChance: 1,
    soulDropAmount: 1,
    scoreValue: 500,
    minWave: 50,
    weight: 0,
  },
};

const getWaveDistribution = (wave: number): Array<[EnemyKind, number]> => {
  if (wave >= 110) {
    return [
      ["wisp", 5],
      ["spitter", 5],
      ["mauler", 3],
      ["slinger", 5],
      ["stalker", 3],
      ["oracle", 5],
      ["behemoth", 9],
      ["hexeye", 5],
      ["starseer", 60],
    ];
  }

  if (wave >= 101) {
    return [
      ["wisp", 5],
      ["spitter", 5],
      ["mauler", 3],
      ["slinger", 5],
      ["stalker", 3],
      ["oracle", 5],
      ["behemoth", 9],
      ["hexeye", 20],
      ["starseer", 45],
    ];
  }

  if (wave >= 90) {
    return [
      ["wisp", 5],
      ["spitter", 5],
      ["mauler", 3],
      ["slinger", 5],
      ["stalker", 3],
      ["oracle", 15],
      ["behemoth", 9],
      ["hexeye", 25],
      ["starseer", 30],
    ];
  }

  if (wave >= 80) {
    return [
      ["wisp", 5],
      ["spitter", 5],
      ["mauler", 3],
      ["slinger", 15],
      ["stalker", 3],
      ["oracle", 30],
      ["behemoth", 9],
      ["hexeye", 30],
    ];
  }

  if (wave >= 70) {
    return [
      ["wisp", 5],
      ["spitter", 10],
      ["mauler", 3],
      ["slinger", 25],
      ["stalker", 7],
      ["oracle", 45],
      ["behemoth", 5],
    ];
  }

  if (wave >= 60) {
    return [
      ["wisp", 5],
      ["spitter", 20],
      ["mauler", 5],
      ["slinger", 30],
      ["stalker", 10],
      ["oracle", 30],
    ];
  }

  if (wave >= 51) {
    return [
      ["wisp", 5],
      ["spitter", 35],
      ["mauler", 10],
      ["slinger", 45],
      ["stalker", 5],
    ];
  }

  if (wave >= 40) {
    return [
      ["wisp", 10],
      ["spitter", 45],
      ["crusher", 5],
      ["mauler", 10],
      ["slinger", 30],
    ];
  }

  if (wave >= 30) {
    return [
      ["wisp", 30],
      ["spitter", 55],
      ["crusher", 10],
      ["mauler", 5],
    ];
  }

  if (wave >= 20) {
    return [
      ["wisp", 50],
      ["spitter", 35],
      ["crusher", 15],
    ];
  }

  if (wave >= 10) {
    return [
      ["wisp", 85],
      ["crusher", 15],
    ];
  }

  return [["wisp", 100]];
};

// Keep stat scaling aligned with the first wave a kind can actually spawn on.
const MONSTER_UNLOCK_SCAN_LIMIT = 500;
const SPECIAL_UNLOCK_WAVES: Partial<Record<EnemyKind, number>> = {
  brainboss: 50,
  bossladoLaser: 100,
  bossladoOrb: 100,
};

const getMonsterUnlockWaves = (): Record<EnemyKind, number> => {
  const unlockWaves: Partial<Record<EnemyKind, number>> = {
    ...SPECIAL_UNLOCK_WAVES,
  };

  for (let wave = 1; wave <= MONSTER_UNLOCK_SCAN_LIMIT; wave += 1) {
    for (const [kind] of getWaveDistribution(wave)) {
      if (unlockWaves[kind] === undefined) {
        unlockWaves[kind] = wave;
      }
    }
  }

  for (const kind of Object.keys(MONSTER_BASES) as EnemyKind[]) {
    if (unlockWaves[kind] === undefined) {
      unlockWaves[kind] = MONSTER_BASES[kind].minWave;
    }
  }

  return unlockWaves as Record<EnemyKind, number>;
};

const MONSTER_UNLOCK_WAVES = getMonsterUnlockWaves();

const getMonsterScalingWave = (wave: number, kind: EnemyKind) =>
  Math.max(1, wave - (MONSTER_UNLOCK_WAVES[kind] ?? 1) + 1);

export const buildWaveSpawnKinds = (
  wave: number,
  total: number,
): EnemyKind[] => {
  if (wave === 50) return ["brainboss"];
  if (wave === 100) return ["bossladoLaser", "bossladoOrb"];

  const distribution = getWaveDistribution(wave);
  if (total <= 0) return [];

  const counts = distribution.map(([kind, percent]) => {
    const exact = (percent / 100) * total;
    const whole = Math.floor(exact);
    return { kind, whole, fraction: exact - whole };
  });

  let assigned = counts.reduce((sum, entry) => sum + entry.whole, 0);
  counts
    .sort((a, b) => b.fraction - a.fraction)
    .slice(0, Math.max(0, total - assigned))
    .forEach((entry) => {
      entry.whole += 1;
    });

  const kinds: EnemyKind[] = [];
  for (const entry of counts) {
    for (let i = 0; i < entry.whole; i += 1) {
      kinds.push(entry.kind);
    }
  }

  while (kinds.length < total && distribution.length > 0) {
    kinds.push(distribution[distribution.length - 1][0]);
  }

  for (let i = kinds.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }

  return kinds;
};

const pickKind = (wave: number): EnemyKind => {
  const distribution = getWaveDistribution(wave);
  const totalWeight = distribution.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * totalWeight;
  for (const [kind, weight] of distribution) {
    roll -= weight;
    if (roll <= 0) return kind;
  }
  return distribution[distribution.length - 1]?.[0] ?? "wisp";
};

const getWaveHealthBonus = (wave: number, kind: EnemyKind, baseHp: number) => {
  const scalingWave = getMonsterScalingWave(wave, kind);
  const upTo20 = Math.min(Math.max(scalingWave - 1, 0), 19);
  const waves21To40 = Math.min(Math.max(scalingWave - 20, 0), 20);
  const waves41To49 = Math.min(Math.max(scalingWave - 40, 0), 9);
  const waves51Plus = Math.max(scalingWave - 50, 0);

  return Math.ceil(
    baseHp *
      (upTo20 * 0.05 +
        waves21To40 * 0.1 +
        waves41To49 * 0.15 +
        waves51Plus * 0.15),
  );
};

const getWaveDamageBonus = (wave: number, kind: EnemyKind, baseDamage: number) => {
  const scalingWave = getMonsterScalingWave(wave, kind);
  const upTo20 = Math.min(Math.max(scalingWave - 1, 0), 19);
  const waves21To40 = Math.min(Math.max(scalingWave - 20, 0), 20);
  const waves41To49 = Math.min(Math.max(scalingWave - 40, 0), 9);
  const waves51Plus = Math.max(scalingWave - 50, 0);

  return Math.ceil(
    baseDamage *
      (upTo20 * 0.1 +
        waves21To40 * 0.05 +
        waves41To49 * 0.03 +
        waves51Plus * 0.02),
  );
};

const isBossWave = (wave: number) => wave === 50 || wave === 100;
const getBossladoKind = (nextId: number): EnemyKind =>
  nextId % 2 === 1 ? "bossladoLaser" : "bossladoOrb";

export const createEnemy = (
  nextId: number,
  wave: number,
  forcedKind?: EnemyKind,
): Enemy => {
  const kind =
    forcedKind ??
    (wave === 50
      ? "brainboss"
      : wave === 100
        ? getBossladoKind(nextId)
        : pickKind(wave));
  const bosslado = kind === "bossladoLaser" || kind === "bossladoOrb";
  const startX =
    kind === "brainboss"
      ? GAME_WIDTH * 0.5
      : bosslado
        ? kind === "bossladoLaser"
          ? GAME_WIDTH * 0.34
          : GAME_WIDTH * 0.66
        : 56 + Math.random() * (GAME_WIDTH - 112);
  const startY =
    kind === "brainboss" ? -220 : bosslado ? -180 : -90 - Math.random() * 180;
  const base = MONSTER_BASES[kind];

  const sizeScale =
    kind === "brainboss" || bosslado ? 1 : 0.94 + Math.random() * 0.28;
  const width = Math.round(base.width * sizeScale * 1.6);
  const height = Math.round(base.height * sizeScale * 1.6);
  const healthBonus = getWaveHealthBonus(wave, kind, base.hp);
  const damageBonus = getWaveDamageBonus(wave, kind, base.damage);
  const speedScale =
    kind === "brainboss" || bosslado ? 1 : 1 + (1 - sizeScale) * 0.22;

  const spawnDuration =
    kind === "brainboss" ? 3.4 : bosslado ? 2.6 : 2.9 + Math.random() * 0.35;

  return {
    id: nextId,
    kind,
    pos: { x: startX, y: startY },
    vel: {
      x: 0,
      y: kind === "brainboss" || bosslado ? 0 : 22 + Math.random() * 16,
    },
    width,
    height,
    hp: Math.ceil(base.hp + healthBonus),
    maxHp: Math.ceil(base.hp + healthBonus),
    damage: base.damage + damageBonus,
    speed: Math.round(base.speed * speedScale * (base.ranged ? 1 : 0.63)),
    isRanged: base.ranged,
    preferredRange:
      base.preferredRange *
        (base.ranged && !base.cornerShooter && kind !== "brainboss" && !bosslado
          ? 1.52
          : 1) +
      (base.ranged && !base.cornerShooter && kind !== "brainboss" && !bosslado
        ? Math.random() * 96
        : 0),
    shootCooldown:
      kind === "brainboss" || bosslado
        ? 999
        : base.ranged
          ? (1.1 + Math.random() * base.shootRate) /
            MONSTER_ATTACK_SPEED_MULTIPLIER
          : 0,
    shootRate: base.shootRate,
    projectileSpeed:
      base.ranged && kind !== "brainboss" && !bosslado
        ? base.projectileSpeed * 0.8
        : base.projectileSpeed,
    projectileRadius: base.projectileRadius,
    projectileColor: base.projectileColor,
    bodyColor: base.bodyColor,
    hoverHeight:
      base.hoverHeight *
      (kind === "brainboss"
        ? 1
        : bosslado
          ? 1
          : base.ranged
            ? 1.32 + Math.random() * 0.22
            : 0.95 + Math.random() * 0.1),
    hoverPhase: Math.random() * Math.PI * 2,
    cornerShooter: Boolean(base.cornerShooter),
    soulDropChance: base.soulDropChance,
    soulDropAmount: base.soulDropAmount,
    scoreValue: base.scoreValue,
    hitFlash: 0,
    slow: 0,
    bleed: 0,
    bleedStacks: 0,
    bleedTickTimer: 1,
    bodyHitCooldown: 0,
    meleeAttackCooldown: 0,
    deathHandled: false,
    marksmanCritConsumed: false,
    spawnStartY: startY,
    spawnElapsed: 0,
    spawnDuration,
    bossOrbCooldown:
      kind === "brainboss"
        ? 2.8 / MONSTER_ATTACK_SPEED_MULTIPLIER
        : bosslado && kind === "bossladoOrb"
          ? 2.6 / MONSTER_ATTACK_SPEED_MULTIPLIER
          : 999,
    bossLaserCooldown:
      kind === "brainboss"
        ? 1.8 / MONSTER_ATTACK_SPEED_MULTIPLIER
        : bosslado && kind === "bossladoLaser"
          ? 1.55 / MONSTER_ATTACK_SPEED_MULTIPLIER
          : 999,
    bossBlastCooldown:
      kind === "brainboss" ? 5.2 / MONSTER_ATTACK_SPEED_MULTIPLIER : 999,
    bossEnraged: false,
    bossDashCooldown: bosslado ? 1.25 : 999,
    bossDashTime: 0,
    bossDashTargetX: startX,
    bossDashTargetY: startY,
  };
};
