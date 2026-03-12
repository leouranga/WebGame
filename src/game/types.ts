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

export type SpellBehavior =
  | 'normal'
  | 'pierce'
  | 'explosive'
  | 'homing'
  | 'meteor'
  | 'enemy'
  | 'fragment'
  | 'friction'
  | 'blackhole'
  | 'wisp';

export type EnemyKind = 'wisp' | 'crusher' | 'spitter' | 'oracle';

export type GameStatus = 'menu' | 'playing' | 'between' | 'death' | 'shop';

export type UpgradeRarity = 'common' | 'uncommon' | 'epic' | 'ascension';

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
  baseWidth: number;
  baseHeight: number;
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
  maxJumps: number;
  jumpsRemaining: number;
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
  behavior: SpellBehavior;
  pierce: number;
  hitIds: number[];
  aoeRadius: number;
  homingStrength: number;
  fromUpgrade?: string;
  chargeBonus?: number;
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
  slow: number;
  bleed: number;
  bodyHitCooldown: number;
};

export type OrbKind = 'soul' | 'heal';

export type SoulOrb = {
  id: number;
  pos: Vec;
  vel: Vec;
  value: number;
  radius: number;
  life: number;
  kind: OrbKind;
};

export type FloatingText = {
  id: number;
  pos: Vec;
  value: string;
  color: string;
  life: number;
};

export type LightningStrike = {
  id: number;
  x: number;
  y: number;
  life: number;
  maxLife: number;
};

export type ImpactEffect = {
  id: number;
  pos: Vec;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
};

export type UpgradeId = string;

export type UpgradeCard = {
  id: UpgradeId;
  name: string;
  description: string;
  color: string;
  icon: string;
  rarity: UpgradeRarity;
  maxStacks?: number;
  sourceId?: UpgradeId;
  threshold?: number;
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
  shopRect: Rect | null;
  upgradeCards: Array<{ id: UpgradeId; rect: Rect }>;
  hudUpgradeIcons: Array<{ id: UpgradeId; rect: Rect }>;
  shopCards: Array<{ id: ShopItemId; rect: Rect }>;
  nextWaveRect: Rect | null;
  restartRect: Rect | null;
  menuRect: Rect | null;
  rerollRect: Rect | null;
};

export type RunEffects = {
  critChance: number;
  critBonus: number;
  projectileDurability: number;
  soulDropBonus: number;
  projectileSizeMultiplier: number;
  invulnMultiplier: number;
  fragmentationCount: number;
  fragmentationDamageBonus: number;
  fragmentationLifeMultiplier: number;
  fragmentationSizeMultiplier: number;
  frictionShots: number;
  frictionRadiusMultiplier: number;
  lifesteal: number;
  uncommonChanceBonus: number;
  healOrbChance: number;
  ragePower: number;
  regrowthRate: number;
  thunderboltCount: number;
  thunderboltTimer: number;
  thunderboltInterval: number;
  thunderboltDamageMultiplier: number;
  appraisalChoices: number;
  barrierReady: boolean;
  barrierCooldown: number;
  barrierTimer: number;
  coldPerHit: number;
  maxSlow: number;
  reviveCharges: number;
  commonEffectivenessBonus: number;
  wisps: number;
  wispTimer: number;
  wound: boolean;
  bleedDamageMultiplier: number;
  bodyDamage: number;
  runDistance: number;
  frictionDistance: number;
  stationaryTime: number;
  focusBonus: number;
  focusGainPerSecond: number;
  bunkerArmor: number;
  bunkerArmorCap: number;
  freeReroll: boolean;
  freeRerollAvailable: boolean;
  epicChanceBonus: number;
  absorbent: boolean;
  avenger: boolean;
  avengerCooldown: number;
  desperate: boolean;
  enchanter: boolean;
  soulBeam: boolean;
  freezeExecute: boolean;
  infiniteJump: boolean;
  enemyMissChance: number;
  firstHitCritReady: boolean;
  randomCommonEachWave: boolean;
  pacMan: boolean;
  plague: boolean;
  plagueTimer: number;
  protector: boolean;
  reflectDamage: number;
  superCrits: boolean;
  streamer: boolean;
  streamerTimer: number;
  streamerInterval: number;
  vampire: boolean;
  blackHoleOnImpact: boolean;
  whiteDwarf: boolean;
  bulldozer: boolean;
  burningMan: boolean;
  burningManTimer: number;
  comet: boolean;
  airPeakY: number;
  hoarder: boolean;
  attackCharges: number;
  streamerBeam: { from: Vec; to: Vec; timer: number } | null;
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
  thunderStrikes: LightningStrike[];
  impacts: ImpactEffect[];
  wave: WaveState;
  fireTimer: number;
  souls: number;
  score: number;
  upgrades: UpgradeCard[];
  upgradeCounts: Record<string, number>;
  ascensions: UpgradeCard[];
  shopItems: ShopItem[];
  ui: UiRects;
  pointer: Vec;
  effects: RunEffects;
};
