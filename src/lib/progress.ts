import type { MageId, ShopItemId } from '@/game/types';

export type PersistedUnlockedMages = Record<MageId, boolean>;

export type PersistedShopItemState = {
  id: ShopItemId;
  owned: boolean;
  active: boolean;
};

export type PersistedAccountProgress = {
  souls: number;
  selectedMage: MageId;
  unlockedMages: PersistedUnlockedMages;
  shopItems: PersistedShopItemState[];
  currentScore: number;
  currentWave: number;
};

export type PublicAccountUser = {
  id: string;
  email: string;
  login: string;
  nickname: string;
  highScore: number;
  highestWave: number;
};

export type AccountResponse = {
  authenticated: boolean;
  user: PublicAccountUser | null;
  progress: PersistedAccountProgress | null;
};

export type RankingEntry = {
  rank: number;
  nickname: string;
  highScore: number;
  highestWave: number;
};

export const MAGE_IDS: MageId[] = ['water', 'fire', 'wind', 'earth', 'void', 'avatar'];
export const SHOP_ITEM_IDS: ShopItemId[] = ['bulwarkStaff', 'vaultStaff', 'dealerStaff', 'scholarStaff'];

const DEFAULT_UNLOCKED: PersistedUnlockedMages = {
  water: false,
  fire: false,
  wind: true,
  earth: false,
  void: false,
  avatar: false,
};

export const createDefaultUnlockedMages = (): PersistedUnlockedMages => ({ ...DEFAULT_UNLOCKED });

export const createDefaultShopItemStates = (): PersistedShopItemState[] => SHOP_ITEM_IDS.map((id) => ({
  id,
  owned: false,
  active: false,
}));

export const createDefaultAccountProgress = (): PersistedAccountProgress => ({
  souls: 0,
  selectedMage: 'wind',
  unlockedMages: createDefaultUnlockedMages(),
  shopItems: createDefaultShopItemStates(),
  currentScore: 0,
  currentWave: 1,
});

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const normalizeMageId = (value: unknown): MageId => (
  typeof value === 'string' && MAGE_IDS.includes(value as MageId) ? value as MageId : 'wind'
);

export const clampNonNegativeInt = (value: unknown, max = 1_000_000_000) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.round(value)));
};

export const normalizeUnlockedMages = (value: unknown): PersistedUnlockedMages => {
  const defaults = createDefaultUnlockedMages();
  if (!isRecord(value)) return defaults;

  const result = { ...defaults };
  for (const mageId of MAGE_IDS) {
    if (typeof value[mageId] === 'boolean') result[mageId] = value[mageId] as boolean;
  }

  result.wind = true;
  return result;
};

export const normalizeShopItemStates = (value: unknown): PersistedShopItemState[] => {
  const defaults = createDefaultShopItemStates();
  if (!Array.isArray(value)) return defaults;

  const byId = new Map(defaults.map((entry) => [entry.id, { ...entry }]));

  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== 'string' || !SHOP_ITEM_IDS.includes(item.id as ShopItemId)) continue;
    byId.set(item.id as ShopItemId, {
      id: item.id as ShopItemId,
      owned: Boolean(item.owned),
      active: Boolean(item.active),
    });
  }

  const normalized = Array.from(byId.values()).map((item) => ({
    ...item,
    active: item.owned ? item.active : false,
  }));

  const activeOwned = normalized.filter((item) => item.owned && item.active);
  if (activeOwned.length > 1) {
    let activeSeen = false;
    for (const item of normalized) {
      if (!item.owned || !item.active) continue;
      if (!activeSeen) {
        activeSeen = true;
        continue;
      }
      item.active = false;
    }
  }

  return normalized;
};

export const isDealerStaffActiveForProgress = (progress: Pick<PersistedAccountProgress, 'shopItems'>) => progress.shopItems.some((item) => item.id === 'dealerStaff' && item.owned && item.active);

export const normalizeAccountProgress = (value: unknown): PersistedAccountProgress => {
  const defaults = createDefaultAccountProgress();
  if (!isRecord(value)) return defaults;

  return {
    souls: clampNonNegativeInt(value.souls, 9_999_999),
    selectedMage: normalizeMageId(value.selectedMage),
    unlockedMages: normalizeUnlockedMages(value.unlockedMages),
    shopItems: normalizeShopItemStates(value.shopItems),
    currentScore: clampNonNegativeInt(value.currentScore, 9_999_999_999),
    currentWave: Math.max(1, clampNonNegativeInt(value.currentWave, 9_999_999)),
  };
};
