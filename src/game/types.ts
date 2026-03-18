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
  | 'wisp'
  | 'thunder'
  | 'enemyLaser';

export type EnemyKind =
  | 'wisp'
  | 'crusher'
  | 'spitter'
  | 'oracle'
  | 'mauler'
  | 'stalker'
  | 'behemoth'
  | 'slinger'
  | 'hexeye'
  | 'starseer'
  | 'brainboss';

export type GameStatus = 'menu' | 'playing' | 'paused' | 'between' | 'death' | 'shop' | 'ascension';

export type MenuOverlay = 'login' | 'register' | 'ranking' | 'logout';

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

export type CriticalKind = 'none' | 'crit' | 'super';

export type Projectile = {
  id: number;
  pos: Vec;
  lineFrom?: Vec;
  vel: Vec;
  radius: number;
  damage: number;
  baseDamage?: number;
  critKind?: CriticalKind;
  color: string;
  life: number;
  owner: 'player' | 'enemy';
  behavior: SpellBehavior;
  pierce: number;
  hitIds: number[];
  aoeRadius: number;
  homingStrength: number;
  projectileHp?: number;
  projectileMaxHp?: number;
  fromUpgrade?: string;
  sourceEnemyId?: number;
  chargeBonus?: number;
  tickTimer?: number;
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
  projectileRadius: number;
  projectileColor: string;
  bodyColor: string;
  hoverHeight: number;
  hoverPhase: number;
  cornerShooter: boolean;
  soulDropChance: number;
  soulDropAmount: number;
  scoreValue: number;
  hitFlash: number;
  slow: number;
  bleed: number;
  bleedStacks: number;
  bleedTickTimer: number;
  bodyHitCooldown: number;
  meleeAttackCooldown: number;
  deathHandled: boolean;
  marksmanCritConsumed: boolean;
  spawnStartY: number;
  spawnElapsed: number;
  spawnDuration: number;
  bossOrbCooldown: number;
  bossLaserCooldown: number;
  bossBlastCooldown: number;
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
  from: Vec;
  to: Vec;
  life: number;
  maxLife: number;
  style?: 'thunder' | 'soul' | 'god';
  flashRadius?: number;
  boltWidth?: number;
};

export type QueuedFrictionShot = {
  delay: number;
  behindDirection: 1 | -1;
  horizontalCarry: number;
};

export type QueuedWispShot = {
  delay: number;
  origin: Vec;
  target: Vec;
  speed: number;
  damage: number;
  color: string;
  radius: number;
  behavior: SpellBehavior;
  aoeRadius: number;
  homingStrength: number;
  pierce: number;
};

export type WispFollower = {
  pos: Vec;
  vel: Vec;
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

export type ShopItemId = 'bulwarkStaff' | 'vaultStaff' | 'dealerStaff' | 'scholarStaff';

export type ShopItem = {
  id: ShopItemId;
  name: string;
  description: string;
  color: string;
  cost: number;
  owned: boolean;
  active: boolean;
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
  loginRect: Rect | null;
  registerRect: Rect | null;
  rankingRect: Rect | null;
  logoutRect: Rect | null;
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
  cloakInvulnDuration: number;
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
  thunderboltDamageBonus: number;
  thunderboltDamageMultiplier: number;
  godOfThunder: boolean;
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
  resistArmor: number;
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
  jumpHoldTimer: number;
  jumpHoldMax: number;
  streamerBeam: { from: Vec; to: Vec; timer: number } | null;
};

export type AscensionNoticeState = {
  active: UpgradeCard | null;
  queue: UpgradeCard[];
  returnStatus: Exclude<GameStatus, 'ascension'>;
};

export type AuthState = {
  isLoggedIn: boolean;
  userId: string | null;
  login: string | null;
  nickname: string | null;
  highScore: number;
  highestWave: number;
};

export type GameState = {
  width: number;
  height: number;
  status: GameStatus;
  tick: number;
  nextId: number;
  selectedMage: MageId;
  unlockedMages: Record<MageId, boolean>;
  terrain: TerrainPoint[];
  player: Player;
  projectiles: Projectile[];
  enemies: Enemy[];
  soulOrbs: SoulOrb[];
  texts: FloatingText[];
  thunderStrikes: LightningStrike[];
  impacts: ImpactEffect[];
  queuedFrictionShots: QueuedFrictionShot[];
  queuedWispShots: QueuedWispShot[];
  wispFollowers: WispFollower[];
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
  ascensionNotice: AscensionNoticeState;
  auth: AuthState;
  menuOverlay: MenuOverlay | null;
};
