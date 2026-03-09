import type { ShopItem } from '@/game/types';

export const createShopItems = (): ShopItem[] => [
  {
    id: 'amberAura',
    name: 'Amber Aura',
    description: 'Orange aura: +20% defense, but your move speed drops.',
    color: '#f59e0b',
    cost: 5,
    owned: false,
  },
  {
    id: 'shadowAura',
    name: 'Shadow Aura',
    description: 'Black aura: jump much higher.',
    color: '#111111',
    cost: 7,
    owned: false,
  },
];
