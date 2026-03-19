import type { ShopItem } from "@/game/types";

export const createShopItems = (): ShopItem[] => [
  {
    id: "bulwarkStaff",
    name: "Bulwark Staff",
    description: "Gain 20% defense, lose a lot of movement speed.",
    color: "#f59e0b",
    cost: 50,
    owned: false,
    active: false,
  },
  {
    id: "vaultStaff",
    name: "Vault Staff",
    description: "Gain double jump.",
    color: "#60a5fa",
    cost: 50,
    owned: false,
    active: false,
  },
  {
    id: "dealerStaff",
    name: "Dealer Staff",
    description: "Upgrade rerolls become free, but this run cannot enter the ranking.",
    color: "#c084fc",
    cost: 50,
    owned: false,
    active: false,
  },
  {
    id: "scholarStaff",
    name: "Scholar Staff",
    description: "Upgrade offers become uncommon only.",
    color: "#86efac",
    cost: 50,
    owned: false,
    active: false,
  },
];
