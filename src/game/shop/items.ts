import type { ShopItem } from '@/game/types';

export const createShopItems = (): ShopItem[] => [
  {
    id: 'bulwarkStaff',
    name: 'Bulwark Staff',
    description: 'Gain 20% defense, lose a lot of movement speed, and wield a staff with a U-shaped tip.',
    color: '#f59e0b',
    cost: 5,
    owned: false,
    active: false,
  },
  {
    id: 'vaultStaff',
    name: 'Vault Staff',
    description: 'Gain double jump and wield a staff with a round tip.',
    color: '#60a5fa',
    cost: 7,
    owned: false,
    active: false,
  },
  {
    id: 'dealerStaff',
    name: 'Dealer Staff',
    description: 'Upgrade rerolls become free and you wield a staff with a triangular tip.',
    color: '#c084fc',
    cost: 8,
    owned: false,
    active: false,
  },
  {
    id: 'scholarStaff',
    name: 'Scholar Staff',
    description: 'Upgrade offers become uncommon only and you wield a staff with a square tip.',
    color: '#86efac',
    cost: 9,
    owned: false,
    active: false,
  },
];
