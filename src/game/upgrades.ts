import type { UpgradeCard, UpgradeId } from '@/game/types';

export const ALL_UPGRADES: UpgradeCard[] = [
  {
    id: 'power',
    name: 'Arcane Power',
    description: '+1 base damage.',
    color: '#c084fc',
    icon: '✦',
  },
  {
    id: 'rapid',
    name: 'Rapid Casting',
    description: 'Cast faster.',
    color: '#60a5fa',
    icon: '»',
  },
  {
    id: 'stride',
    name: 'Swift Stride',
    description: 'Move faster on the ground.',
    color: '#34d399',
    icon: '➜',
  },
  {
    id: 'vitality',
    name: 'Vitality',
    description: '+2 max HP and heal 2.',
    color: '#f87171',
    icon: '❤',
  },
  {
    id: 'focus',
    name: 'Arc Focus',
    description: 'Projectiles travel faster.',
    color: '#fbbf24',
    icon: '◉',
  },
  {
    id: 'feather',
    name: 'Feather Step',
    description: 'Jump higher.',
    color: '#e5e7eb',
    icon: '⬆',
  },
];

export const pickUpgradeCards = (): UpgradeCard[] => {
  const pool = [...ALL_UPGRADES];
  const picks: UpgradeCard[] = [];

  while (picks.length < 3 && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }

  return picks;
};

export const getUpgradeCard = (id: UpgradeId) => ALL_UPGRADES.find((upgrade) => upgrade.id === id) ?? ALL_UPGRADES[0];

export const createEmptyUpgradeCounts = (): Record<UpgradeId, number> => ({
  power: 0,
  rapid: 0,
  stride: 0,
  vitality: 0,
  focus: 0,
  feather: 0,
});

export const isUpgradeId = (value: string): value is UpgradeId => (
  ALL_UPGRADES.some((upgrade) => upgrade.id === value)
);
