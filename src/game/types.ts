export type Vec = {
  x: number;
  y: number;
};

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type TerrainPoint = {
  x: number;
  y: number;
};

export type MageId = 'water' | 'fire' | 'wind' | 'earth' | 'void';

export type SpellBehavior = 'normal' | 'pierce' | 'explosive' | 'homing' | 'meteor';

export type EnemyKind = 'wisp' | 'crusher' | 'spitter' | 'oracle';

export type GameStatus = 'menu' | 'playing' | 'between' | 'deathshop';

export type InputState = {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
  mouseDown: boolean;
  mouse: Vec;
};

export type MageDefinition = {
  id: MageId;
  name: string;
  color: string;
  damage: number;
  passive: string;
  summary: string;
  fireInterval: number;
  projectileSpeed: number;
  projectileRadius: number;
  behavior: SpellBehavior;
  explosionRadius: number;
  homingStrength: number;
};

export type Player = {
  pos: Vec;
  vel: Vec;
  width: number;
  height: number;
  onGround: boolean;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  damageTakenMultiplier: number;
  moveSpeed: number;
  jumpPower: number;
  projectileSpeed: number;
  projectileRadius: number;
  fireInterval: number;
  damage: number;
  color: string;
  name: string;
  passive: string;
  mageId: MageId;
  behavior: SpellBehavior;
  explosionRadius: number;
  homingStrength: number;
  invuln: number;
};

export type Projectile = {
  id: number;
  pos: Vec;
  vel: Vec;
  radius: number;
  damage: number;
  color: string;
  life: number;
  owner: 'player' | 'enemy';
  behavior: SpellBehavior | 'enemy';
  pierce: number;
  hitIds: number[];
  aoeRadius: number;
  homingStrength: number;
};

export type Enemy = {
  id: number;
  kind: EnemyKind;
  pos: Vec;
  vel: Vec;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  isRanged: boolean;
  preferredRange: number;
  shootCooldown: number;
  shootRate: number;
  projectileSpeed: number;
  projectileColor: string;
  bodyColor: string;
  hoverHeight: number;
  hoverPhase: number;
  soulDropChance: number;
  soulDropAmount: number;
  scoreValue: number;
  hitFlash: number;
};

export type SoulOrb = {
  id: number;
  pos: Vec;
  vel: Vec;
  value: number;
  radius: number;
  life: number;
};

export type FloatingText = {
  id: number;
  pos: Vec;
  value: string;
  color: string;
  life: number;
};

export type UpgradeId = 'power' | 'rapid' | 'stride' | 'vitality' | 'focus' | 'feather';

export type UpgradeCard = {
  id: UpgradeId;
  name: string;
  description: string;
  color: string;
  icon: string;
};

export type ShopItemId = 'amberAura' | 'shadowAura';

export type ShopItem = {
  id: ShopItemId;
  name: string;
  description: string;
  color: string;
  cost: number;
  owned: boolean;
};

export type WaveState = {
  number: number;
  toSpawn: number;
  spawned: number;
  cleared: number;
  spawnTimer: number;
};

export type UiRects = {
  mageCards: Array<{ id: MageId; rect: Rect }>;
  startRect: Rect | null;
  upgradeCards: Array<{ id: UpgradeId; rect: Rect }>;
  hudUpgradeIcons: Array<{ id: UpgradeId; rect: Rect }>;
  shopCards: Array<{ id: ShopItemId; rect: Rect }>;
  nextWaveRect: Rect | null;
  restartRect: Rect | null;
};

export type GameState = {
  width: number;
  height: number;
  status: GameStatus;
  tick: number;
  nextId: number;
  selectedMage: MageId;
  terrain: TerrainPoint[];
  player: Player;
  projectiles: Projectile[];
  enemies: Enemy[];
  soulOrbs: SoulOrb[];
  texts: FloatingText[];
  wave: WaveState;
  fireTimer: number;
  souls: number;
  score: number;
  upgrades: UpgradeCard[];
  upgradeCounts: Record<UpgradeId, number>;
  shopItems: ShopItem[];
  ui: UiRects;
  pointer: Vec;
};
