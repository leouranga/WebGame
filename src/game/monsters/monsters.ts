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
    hp: 30,
    damage: 3,
    speed: 62,
    ranged: false,
    preferredRange: 0,
    shootRate: 0,
    projectileSpeed: 0,
    projectileRadius: 0,
    projectileColor: "#000000",
    bodyColor: "#f97316",
    hoverHeight: 138,
    soulDropChance: 0.18,
    soulDropAmount: 1,
    scoreValue: 12,
    minWave: 1,
    weight: 1.45,
  },
  mauler: {
    width: 48,
    height: 48,
    hp: 100,
    damage: 15,
    speed: 74,
    ranged: false,
    preferredRange: 0,
    shootRate: 0,
    projectileSpeed: 0,
    projectileRadius: 0,
    projectileColor: "#000000",
    bodyColor: "#ef4444",
    hoverHeight: 150,
    soulDropChance: 0.2,
    soulDropAmount: 1,
    scoreValue: 16,
    minWave: 15,
    weight: 1.05,
  },
  stalker: {
    width: 45,
    height: 45,
    hp: 250,
    damage: 40,
    speed: 86,
    ranged: false,
    preferredRange: 0,
    shootRate: 0,
    projectileSpeed: 0,
    projectileRadius: 0,
    projectileColor: "#000000",
    bodyColor: "#22c55e",
    hoverHeight: 176,
    soulDropChance: 0.24,
    soulDropAmount: 2,
    scoreValue: 21,
    minWave: 25,
    weight: 0.72,
  },
  behemoth: {
    width: 70,
    height: 70,
    hp: 600,
    damage: 60,
    speed: 54,
    ranged: false,
    preferredRange: 0,
    shootRate: 0,
    projectileSpeed: 0,
    projectileRadius: 0,
    projectileColor: "#000000",
    bodyColor: "#8b5cf6",
    hoverHeight: 168,
    soulDropChance: 0.3,
    soulDropAmount: 3,
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
    bodyColor: "#fdba74",
    hoverHeight: 250,
    soulDropChance: 0.12,
    soulDropAmount: 1,
    scoreValue: 9,
    minWave: 1,
    weight: 1.2,
  },
  spitter: {
    width: 42,
    height: 42,
    hp: 100,
    damage: 15,
    speed: 84,
    ranged: true,
    preferredRange: 410,
    shootRate: 2.55,
    projectileSpeed: 205,
    projectileRadius: 5,
    projectileColor: "#f59e0b",
    bodyColor: "#fbbf24",
    hoverHeight: 300,
    soulDropChance: 0.16,
    soulDropAmount: 1,
    scoreValue: 14,
    minWave: 10,
    weight: 1,
  },
  slinger: {
    width: 46,
    height: 46,
    hp: 200,
    damage: 25,
    speed: 80,
    ranged: true,
    preferredRange: 455,
    shootRate: 2.9,
    projectileSpeed: 180,
    projectileRadius: 8,
    projectileColor: "#60a5fa",
    bodyColor: "#38bdf8",
    hoverHeight: 310,
    soulDropChance: 0.18,
    soulDropAmount: 1,
    scoreValue: 18,
    minWave: 20,
    weight: 0.82,
  },
  oracle: {
    width: 50,
    height: 50,
    hp: 300,
    damage: 30,
    speed: 76,
    ranged: true,
    preferredRange: 520,
    shootRate: 3.2,
    projectileSpeed: 220,
    projectileRadius: 6,
    projectileColor: "#fb7185",
    bodyColor: "#f472b6",
    hoverHeight: 342,
    soulDropChance: 0.24,
    soulDropAmount: 2,
    scoreValue: 23,
    minWave: 30,
    weight: 0.66,
  },
  hexeye: {
    width: 56,
    height: 56,
    hp: 500,
    damage: 35,
    speed: 72,
    ranged: true,
    preferredRange: 575,
    shootRate: 3.45,
    projectileSpeed: 165,
    projectileRadius: 12,
    projectileColor: "#a855f7",
    bodyColor: "#c084fc",
    hoverHeight: 356,
    soulDropChance: 0.28,
    soulDropAmount: 2,
    scoreValue: 28,
    minWave: 40,
    weight: 0.5,
  },
  starseer: {
    width: 62,
    height: 62,
    hp: 700,
    damage: 70,
    speed: 68,
    ranged: true,
    preferredRange: 700,
    shootRate: 3.8,
    projectileSpeed: 150,
    projectileRadius: 10,
    projectileColor: "#eab308",
    bodyColor: "#fde047",
    hoverHeight: 390,
    soulDropChance: 0.34,
    soulDropAmount: 3,
    scoreValue: 34,
    minWave: 45,
    weight: 0.35,
    cornerShooter: true,
  },

  brainboss: {
    width: 168,
    height: 142,
    hp: 3500,
    damage: 100,
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
    soulDropAmount: 10,
    scoreValue: 500,
    minWave: 50,
    weight: 0,
  },
};

const MONSTER_RELEASE_ORDER: EnemyKind[] = [
  "wisp",
  "crusher",
  "spitter",
  "mauler",
  "slinger",
  "stalker",
  "oracle",
  "behemoth",
  "hexeye",
  "starseer",
];

const getReleasedKinds = (wave: number): EnemyKind[] => {
  const unlockedCount = Math.max(
    1,
    Math.min(
      MONSTER_RELEASE_ORDER.length,
      1 + Math.floor(Math.max(0, wave - 1) / 5),
    ),
  );
  return MONSTER_RELEASE_ORDER.slice(0, unlockedCount);
};

const pickKind = (wave: number): EnemyKind => {
  const releasedKinds = getReleasedKinds(wave);
  const available = releasedKinds.map(
    (kind) => [kind, MONSTER_BASES[kind]] as const,
  );
  const totalWeight = available.reduce((sum, [, base]) => sum + base.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const [kind, base] of available) {
    roll -= base.weight;
    if (roll <= 0) return kind;
  }

  return available[available.length - 1]?.[0] ?? "wisp";
};

const getWaveHealthBonus = (wave: number) => Math.floor(wave / 10) * 5;
const getWaveDamageBonus = (wave: number) => Math.floor(wave / 10);

export const createEnemy = (nextId: number, wave: number): Enemy => {
  const kind = wave === 50 ? "brainboss" : pickKind(wave);
  const startX =
    kind === "brainboss"
      ? GAME_WIDTH * 0.5
      : 56 + Math.random() * (GAME_WIDTH - 112);
  const startY = kind === "brainboss" ? -220 : -90 - Math.random() * 180;
  const base = MONSTER_BASES[kind];

  const sizeScale = kind === "brainboss" ? 1 : 0.94 + Math.random() * 0.28;
  const width = Math.round(base.width * sizeScale);
  const height = Math.round(base.height * sizeScale);
  const healthBonus = kind === "brainboss" ? 0 : getWaveHealthBonus(wave);
  const damageBonus = kind === "brainboss" ? 0 : getWaveDamageBonus(wave);
  const speedScale = kind === "brainboss" ? 1 : 1 + (1 - sizeScale) * 0.22;

  const spawnDuration = kind === "brainboss" ? 3.4 : 2.9 + Math.random() * 0.35;

  return {
    id: nextId,
    kind,
    pos: { x: startX, y: startY },
    vel: { x: 0, y: kind === "brainboss" ? 0 : 22 + Math.random() * 16 },
    width,
    height,
    hp: Math.ceil(base.hp + healthBonus),
    maxHp: Math.ceil(base.hp + healthBonus),
    damage: base.damage + damageBonus,
    speed: Math.round(base.speed * speedScale * (base.ranged ? 1 : 0.7)),
    isRanged: base.ranged,
    preferredRange:
      base.preferredRange *
        (base.ranged && !base.cornerShooter && kind !== "brainboss"
          ? 1.24
          : 1) +
      (base.ranged && !base.cornerShooter && kind !== "brainboss"
        ? Math.random() * 72
        : 0),
    shootCooldown:
      kind === "brainboss"
        ? 999
        : base.ranged
          ? (1.1 + Math.random() * base.shootRate) /
            MONSTER_ATTACK_SPEED_MULTIPLIER
          : 0,
    shootRate: base.shootRate,
    projectileSpeed: base.projectileSpeed,
    projectileRadius: base.projectileRadius,
    projectileColor: base.projectileColor,
    bodyColor: base.bodyColor,
    hoverHeight:
      base.hoverHeight *
      (kind === "brainboss"
        ? 1
        : base.ranged
          ? 1.12 + Math.random() * 0.2
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
    deathHandled: false,
    marksmanCritConsumed: false,
    spawnStartY: startY,
    spawnElapsed: 0,
    spawnDuration,
    bossOrbCooldown:
      kind === "brainboss" ? 2.8 / MONSTER_ATTACK_SPEED_MULTIPLIER : 999,
    bossLaserCooldown:
      kind === "brainboss" ? 1.8 / MONSTER_ATTACK_SPEED_MULTIPLIER : 999,
    bossBlastCooldown:
      kind === "brainboss" ? 5.2 / MONSTER_ATTACK_SPEED_MULTIPLIER : 999,
  };
};
