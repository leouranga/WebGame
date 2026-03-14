import type {
  GameState,
  UpgradeCard,
  UpgradeId,
  UpgradeRarity,
} from "@/game/types";

const card = (
  id: UpgradeId,
  name: string,
  description: string,
  rarity: UpgradeRarity,
  icon: string,
  color: string,
  extra: Partial<UpgradeCard> = {},
): UpgradeCard => ({ id, name, description, rarity, icon, color, ...extra });

export const COMMON_UPGRADES: UpgradeCard[] = [
  card("catalyst", "Catalyst", "Damage +2", "common", "✦", "#f8fafc"),
  card("eyesight", "Eyesight", "Critical Chance +5%", "common", "◉", "#f8fafc"),
  card("growth", "Growth", "Max HP +10", "common", "♥", "#f8fafc"),
  card("impulse", "Impulse", "Jump Height +30%", "common", "↟", "#f8fafc"),
  card("renew", "Renew", "Heal to Max HP", "common", "✚", "#f8fafc"),
  card("resist", "Resist", "Armor +4%", "common", "▣", "#f8fafc"),
  card("resonance", "Resonance", "Atk Speed +12%", "common", "≫", "#f8fafc"),
  card(
    "souls",
    "Souls",
    "Chance to drop soul orb +1%",
    "common",
    "◌",
    "#f8fafc",
  ),
  card(
    "stability",
    "Stability",
    "Projectile takes +1 hit before exploding",
    "common",
    "⬢",
    "#f8fafc",
  ),
  card("swift", "Swift", "Movement Speed +20%", "common", "➜", "#f8fafc"),
];

export const UNCOMMON_UPGRADES: UpgradeCard[] = [
  card("catalystPlus", "Catalyst+", "Damage +4", "uncommon", "✶", "#86efac"),
  card("charge", "Charge", "Projectile Size +20%", "uncommon", "⬤", "#86efac"),
  card(
    "cloak",
    "Cloak",
    "Increases invulnerability by 10% (after taking damage)",
    "uncommon",
    "🛡",
    "#86efac",
  ),
  card(
    "fragmentation",
    "Fragmentation",
    "Killed enemies release 3 small projectiles",
    "uncommon",
    "✹",
    "#86efac",
  ),
  card(
    "friction",
    "Friction",
    "Running launches 1 explosive projectile upward more often",
    "uncommon",
    "⇡",
    "#86efac",
  ),
  card("growthPlus", "Growth+", "Max HP +20", "uncommon", "❤", "#86efac"),
  card("gush", "Gush", "Adds +1 Jump", "uncommon", "⤊", "#86efac"),
  card("leech", "Leech", "Life Steal of 3% Damage", "uncommon", "🜏", "#86efac"),
  card(
    "luck",
    "Luck",
    "Bigger chance to roll uncommon items",
    "uncommon",
    "☘",
    "#86efac",
  ),
  card(
    "orb",
    "Orb",
    "Dead enemies have 5% chance to drop a healing orb",
    "uncommon",
    "◎",
    "#86efac",
  ),
  card(
    "precision",
    "Precision",
    "Critical deals +50% damage",
    "uncommon",
    "✺",
    "#86efac",
  ),
  card(
    "rage",
    "Rage",
    "Under 50% HP, your projectile and body damage rise",
    "uncommon",
    "⚑",
    "#86efac",
  ),
  card(
    "regrowth",
    "Regrowth",
    "Regenerates HP based on enemies alive",
    "uncommon",
    "❈",
    "#86efac",
  ),
  card(
    "resonancePlus",
    "Resonance+",
    "Attack Speed +24%",
    "uncommon",
    "≫",
    "#86efac",
  ),
  card("shrink", "Shrink", "Makes you 10% smaller", "uncommon", "◔", "#86efac"),
  card(
    "swiftPlus",
    "Swift+",
    "Movement Speed +40%",
    "uncommon",
    "➠",
    "#86efac",
  ),
  card(
    "thunderbolt",
    "Thunderbolt",
    "Calls 2 thunderbolts from the sky every few seconds",
    "uncommon",
    "⚡",
    "#86efac",
  ),
];

export const EPIC_UPGRADES: UpgradeCard[] = [
  card(
    "appraisal",
    "Appraisal",
    "+1 item choice from now on",
    "epic",
    "⌘",
    "#c084fc",
  ),
  card(
    "barrier",
    "Barrier",
    "Creates a shield that blocks damage once every few seconds",
    "epic",
    "⬡",
    "#c084fc",
  ),
  card(
    "cold",
    "Cold",
    "Enemies get 1% slower every time they take damage",
    "epic",
    "❄",
    "#c084fc",
  ),
  card(
    "fragmentationPlus",
    "Fragmentation+",
    "Killed enemies release 6 small projectiles",
    "epic",
    "✹",
    "#c084fc",
  ),
  card(
    "frictionPlus",
    "Friction+",
    "Running launches 1 explosive projectile upward much more often",
    "epic",
    "⇈",
    "#c084fc",
  ),
  card(
    "focus",
    "Focus",
    "Gain attack speed every second you do not move",
    "epic",
    "◈",
    "#c084fc",
  ),
  card("growthPlusPlus", "Growth++", "Max HP +40", "epic", "♥", "#c084fc"),
  card(
    "leechPlus",
    "Leech+",
    "Life Steal of 9% Damage",
    "epic",
    "🜏",
    "#c084fc",
  ),
  card(
    "overheat",
    "Overheat",
    "Your body deals 40 damage on contact",
    "epic",
    "☄",
    "#c084fc",
  ),
  card(
    "thunderboltPlus",
    "Thunderbolt+",
    "Calls 6 thunderbolts from the sky every few seconds",
    "epic",
    "⚡",
    "#c084fc",
  ),
  card(
    "tome",
    "Tome",
    "New common items are 35% more effective",
    "epic",
    "📘",
    "#c084fc",
  ),
  card(
    "willOWisp",
    "Will-O-Wisp",
    "Summons a wisp with half your attack damage and speed",
    "epic",
    "✧",
    "#c084fc",
  ),
  card(
    "wound",
    "Wound",
    "Dealing damage applies bleeding to the enemy",
    "epic",
    "🩸",
    "#c084fc",
  ),
];

export const ASCENSIONS: UpgradeCard[] = [
  card(
    "absorbent",
    "Absorbent",
    "Projectile hits during invulnerability heal 1 HP",
    "ascension",
    "🜁",
    "#f59e0b",
    { sourceId: "cloak", threshold: 4 },
  ),
  card(
    "antiAircraft",
    "Anti-Aircraft",
    "Larger explosion area of friction projectiles",
    "ascension",
    "✸",
    "#f59e0b",
    { sourceId: "friction", threshold: 10 },
  ),
  card(
    "avenger",
    "Avenger",
    "Lethal damage instead kills half the enemies and heals half HP",
    "ascension",
    "⚔",
    "#f59e0b",
    { sourceId: "rage", threshold: 5 },
  ),
  card(
    "blessed",
    "Blessed",
    "5% chance of finding epic items",
    "ascension",
    "✟",
    "#f59e0b",
    { sourceId: "luck", threshold: 5 },
  ),
  card(
    "bloodyMage",
    "Bloody Mage",
    "Bleeding ticks twice as fast",
    "ascension",
    "🩸",
    "#f59e0b",
    { sourceId: "wound", threshold: 3 },
  ),
  card(
    "bulldozer",
    "Bulldozer",
    "Pushing enemies away with your body gets easier",
    "ascension",
    "⬌",
    "#f59e0b",
    { sourceId: "swift", threshold: 8 },
  ),
  card(
    "bunker",
    "Bunker",
    "Standing still grants armor every second up to 95",
    "ascension",
    "▤",
    "#f59e0b",
    { sourceId: "focus", threshold: 3 },
  ),
  card(
    "burningMan",
    "Burning Man",
    "Body damage pulses every 2 seconds around you",
    "ascension",
    "🔥",
    "#f59e0b",
    { sourceId: "overheat", threshold: 3 },
  ),
  card(
    "colossus",
    "Colossus",
    "Your HP and size are doubled",
    "ascension",
    "⬟",
    "#f59e0b",
    { sourceId: "growth", threshold: 15 },
  ),
  card(
    "comet",
    "Comet",
    "Landing after a big drop deals area damage",
    "ascension",
    "☄",
    "#f59e0b",
    { sourceId: "impulse", threshold: 5 },
  ),
  card(
    "dealer",
    "Dealer",
    "You can reroll for free",
    "ascension",
    "⟳",
    "#f59e0b",
    { sourceId: "appraisal", threshold: 4 },
  ),
  card(
    "desperate",
    "Desperate",
    "Heal to full HP at the beginning of every wave",
    "ascension",
    "✚",
    "#f59e0b",
    { sourceId: "renew", threshold: 5 },
  ),
  card(
    "enchanter",
    "Enchanter",
    "Wisps stay close to you and shoot where you aim",
    "ascension",
    "✧",
    "#f59e0b",
    { sourceId: "willOWisp", threshold: 4 },
  ),
  card(
    "exorcist",
    "Exorcist",
    "Picking up a soul orb calls a soul strike",
    "ascension",
    "☄",
    "#f59e0b",
    { sourceId: "souls", threshold: 6 },
  ),
  card(
    "freezer",
    "Freezer",
    "Enemies can now be slowed to 100% and may shatter",
    "ascension",
    "❅",
    "#f59e0b",
    { sourceId: "cold", threshold: 3 },
  ),
  card(
    "flyingSorcerer",
    "Flying Sorcerer",
    "You can jump as much as you want",
    "ascension",
    "🕊",
    "#f59e0b",
    { sourceId: "gush", threshold: 5 },
  ),
  card(
    "gnome",
    "Gnome",
    "Enemy projectiles have a 33% chance to miss",
    "ascension",
    "◔",
    "#f59e0b",
    { sourceId: "shrink", threshold: 5 },
  ),
  card(
    "godOfThunder",
    "God of Thunder",
    "Thunderbolts deal 3x more damage",
    "ascension",
    "⚡",
    "#f59e0b",
    { sourceId: "thunderbolt", threshold: 10 },
  ),
  card(
    "hoarder",
    "Hoarder",
    "Healing orbs charge your next attack",
    "ascension",
    "◎",
    "#f59e0b",
    { sourceId: "orb", threshold: 5 },
  ),
  card(
    "marksman",
    "Marksman",
    "The first hit is always critical",
    "ascension",
    "⌖",
    "#f59e0b",
    { sourceId: "eyesight", threshold: 6 },
  ),
  card(
    "nerd",
    "Nerd",
    "Receive a random common card every wave",
    "ascension",
    "📗",
    "#f59e0b",
    { sourceId: "tome", threshold: 4 },
  ),
  card(
    "pacMan",
    "Pac-Man",
    "Projectiles that eat enemy shots gain damage",
    "ascension",
    "◉",
    "#f59e0b",
    { sourceId: "stability", threshold: 5 },
  ),
  card(
    "plagueSpreader",
    "Plague Spreader",
    "Removes 1% HP from all enemies every second",
    "ascension",
    "☣",
    "#f59e0b",
    { sourceId: "regrowth", threshold: 5 },
  ),
  card(
    "protector",
    "Protector",
    "When your shield breaks, shoot in all directions",
    "ascension",
    "⬡",
    "#f59e0b",
    { sourceId: "barrier", threshold: 3 },
  ),
  card(
    "ramDestroyer",
    "RAM Destroyer",
    "Fragmentation projectiles become larger",
    "ascension",
    "✹",
    "#f59e0b",
    { sourceId: "fragmentation", threshold: 10 },
  ),
  card(
    "sadistic",
    "Sadistic",
    "Damage the attacker back",
    "ascension",
    "↺",
    "#f59e0b",
    { sourceId: "resist", threshold: 6 },
  ),
  card(
    "speculator",
    "Speculator",
    "Critical hits have a chance to become super critical hits",
    "ascension",
    "✺",
    "#f59e0b",
    { sourceId: "precision", threshold: 5 },
  ),
  card("streamer", "Streamer", "Shoot a beam", "ascension", "═", "#f59e0b", {
    sourceId: "resonance",
    threshold: 8,
  }),
  card(
    "tryhard",
    "Tryhard",
    "Does absolutely nothing",
    "ascension",
    "☻",
    "#f59e0b",
    { sourceId: "catalyst", threshold: 20 },
  ),
  card(
    "vampire",
    "Vampire",
    "Half of all your damage returns as HP",
    "ascension",
    "🦇",
    "#f59e0b",
    { sourceId: "leech", threshold: 12 },
  ),
  card(
    "whiteDwarf",
    "White Dwarf",
    "Projectiles normalize in size and create large black holes",
    "ascension",
    "●",
    "#f59e0b",
    { sourceId: "charge", threshold: 5 },
  ),
];

export const ALL_UPGRADES: UpgradeCard[] = [
  ...COMMON_UPGRADES,
  ...UNCOMMON_UPGRADES,
  ...EPIC_UPGRADES,
  ...ASCENSIONS,
];

export const getUpgradeCard = (id: UpgradeId) =>
  ALL_UPGRADES.find((upgrade) => upgrade.id === id) ?? COMMON_UPGRADES[0];

export const createEmptyUpgradeCounts = (): Record<string, number> => ({});

export const isUpgradeId = (value: string): value is UpgradeId =>
  ALL_UPGRADES.some((upgrade) => upgrade.id === value);

const hasActiveShopItem = (state: GameState, itemId: string) =>
  state.shopItems.some(
    (item) => item.id === itemId && item.owned && item.active,
  );

const UPGRADE_FAMILIES: Record<string, UpgradeId[]> = {
  appraisal: ["appraisal"],
  barrier: ["barrier"],
  catalyst: ["catalyst", "catalystPlus"],
  charge: ["charge"],
  cloak: ["cloak"],
  cold: ["cold"],
  eyesight: ["eyesight"],
  focus: ["focus"],
  fragmentation: ["fragmentation", "fragmentationPlus"],
  friction: ["friction", "frictionPlus"],
  growth: ["growth", "growthPlus", "growthPlusPlus"],
  gush: ["gush"],
  impulse: ["impulse"],
  leech: ["leech", "leechPlus"],
  luck: ["luck"],
  orb: ["orb"],
  overheat: ["overheat"],
  precision: ["precision"],
  rage: ["rage"],
  regrowth: ["regrowth"],
  renew: ["renew"],
  resonance: ["resonance", "resonancePlus"],
  resist: ["resist"],
  shrink: ["shrink"],
  souls: ["souls"],
  stability: ["stability"],
  swift: ["swift", "swiftPlus"],
  thunderbolt: ["thunderbolt", "thunderboltPlus"],
  tome: ["tome"],
  willOWisp: ["willOWisp"],
  wound: ["wound"],
};

const getUpgradeFamily = (sourceId?: UpgradeId): UpgradeId[] => {
  if (!sourceId) return [];
  return UPGRADE_FAMILIES[sourceId] ?? [sourceId];
};

const getUpgradeFamilyCards = (sourceId?: UpgradeId) =>
  getUpgradeFamily(sourceId)
    .map((id) => ALL_UPGRADES.find((upgrade) => upgrade.id === id))
    .filter((upgrade): upgrade is UpgradeCard => Boolean(upgrade));

const hasCommonOrUncommonVariant = (cards: UpgradeCard[]) =>
  cards.some(
    (upgrade) => upgrade.rarity === "common" || upgrade.rarity === "uncommon",
  );

const ASCENSION_POINT_OVERRIDES: Partial<Record<UpgradeId, number>> = {
  appraisal: 1,
  barrier: 1,
  charge: 1,
  cloak: 1,
  cold: 1,
  focus: 1,
  fragmentation: 1,
  fragmentationPlus: 2,
  friction: 1,
  frictionPlus: 2,
  growthPlusPlus: 2,
  gush: 1,
  leech: 1,
  leechPlus: 2,
  luck: 1,
  orb: 1,
  overheat: 1,
  precision: 1,
  rage: 1,
  regrowth: 1,
  shrink: 1,
  thunderbolt: 1,
  thunderboltPlus: 2,
  tome: 1,
  willOWisp: 1,
  wound: 1,
};

const getUpgradePointValue = (
  upgrade: UpgradeCard,
  familyCards: UpgradeCard[],
  _sourceId?: UpgradeId,
) => {
  const override = ASCENSION_POINT_OVERRIDES[upgrade.id];
  if (override !== undefined) return override;
  if (upgrade.rarity === "common") return 1;
  if (upgrade.rarity === "uncommon") return 2;
  if (upgrade.rarity === "epic")
    return hasCommonOrUncommonVariant(familyCards) ? 3 : 1;
  return 1;
};

const getAscensionThreshold = (sourceId?: UpgradeId) => {
  if (!sourceId) return Number.POSITIVE_INFINITY;
  return (
    ASCENSIONS.find((ascension) => ascension.sourceId === sourceId)
      ?.threshold ?? Number.POSITIVE_INFINITY
  );
};

export const getAscensionStackCount = (
  state: GameState,
  sourceId?: UpgradeId,
) => {
  const family = getUpgradeFamilyCards(sourceId);
  return family.reduce(
    (total, upgrade) =>
      total +
      (state.upgradeCounts[upgrade.id] ?? 0) *
        getUpgradePointValue(upgrade, family, sourceId),
    0,
  );
};

export const getUpgradeProgressCount = getAscensionStackCount;

const getRarityWeights = (state: GameState) => {
  const common = 0.72;
  const uncommon = 0.23 + state.effects.uncommonChanceBonus;
  const epic = 0.05 + state.effects.epicChanceBonus;
  const total = common + uncommon + epic;
  return {
    common: common / total,
    uncommon: uncommon / total,
    epic: epic / total,
  };
};

const pickByRarity = (
  state: GameState,
  excluded: Set<string>,
  rarity: UpgradeRarity,
) => {
  const source =
    rarity === "common"
      ? COMMON_UPGRADES
      : rarity === "uncommon"
        ? UNCOMMON_UPGRADES
        : EPIC_UPGRADES;
  const available = source.filter((entry) => {
    if (excluded.has(entry.id)) return false;
    const count = state.upgradeCounts[entry.id] ?? 0;
    return entry.maxStacks === undefined || count < entry.maxStacks;
  });

  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
};

const EPIC_WAVE_INTERVAL = 5;

const isGuaranteedEpicWave = (waveNumber: number) =>
  waveNumber === 1 || waveNumber % EPIC_WAVE_INTERVAL === 0;

const canOfferEpicUpgrades = (state: GameState) =>
  isGuaranteedEpicWave(state.wave.number) || state.effects.epicChanceBonus > 0;

const rollRarity = (state: GameState, allowEpic: boolean): UpgradeRarity => {
  const weights = getRarityWeights(state);
  const roll = Math.random();

  if (allowEpic) {
    if (roll < weights.epic) return "epic";
    if (roll < weights.epic + weights.uncommon) return "uncommon";
    return "common";
  }

  const uncommonWeight =
    weights.common + weights.uncommon > 0
      ? weights.uncommon / (weights.common + weights.uncommon)
      : 0;

  return roll < uncommonWeight ? "uncommon" : "common";
};

export const pickUpgradeCards = (state: GameState): UpgradeCard[] => {
  const excluded = new Set<string>();
  const picks: UpgradeCard[] = [];
  const target = Math.max(4, 4 + state.effects.appraisalChoices);
  const guaranteedEpicWave = isGuaranteedEpicWave(state.wave.number);
  const allowEpicRolls = canOfferEpicUpgrades(state);
  const uncommonOnly = hasActiveShopItem(state, "scholarStaff");

  while (
    picks.length < target &&
    excluded.size <
      COMMON_UPGRADES.length + UNCOMMON_UPGRADES.length + EPIC_UPGRADES.length
  ) {
    const picked = uncommonOnly
      ? pickByRarity(state, excluded, "uncommon")
      : guaranteedEpicWave
        ? pickByRarity(state, excluded, "epic")
        : (() => {
            const rarity = rollRarity(state, allowEpicRolls);
            return (
              pickByRarity(state, excluded, rarity) ??
              pickByRarity(state, excluded, "common") ??
              pickByRarity(state, excluded, "uncommon") ??
              (allowEpicRolls ? pickByRarity(state, excluded, "epic") : null)
            );
          })();

    if (!picked) break;
    excluded.add(picked.id);
    picks.push(picked);
  }

  return picks;
};

export const getOwnedDisplayCards = (
  state: GameState,
): Array<{ card: UpgradeCard; count: number }> => {
  const entries: Array<{ card: UpgradeCard; count: number }> = [];
  const familyKeys = Object.keys(UPGRADE_FAMILIES) as UpgradeId[];

  familyKeys.forEach((familyKey) => {
    const family = getUpgradeFamilyCards(familyKey);
    const count = family.reduce(
      (total, upgrade) =>
        total +
        (state.upgradeCounts[upgrade.id] ?? 0) *
          getUpgradePointValue(upgrade, family, familyKey),
      0,
    );
    if (count <= 0) return;
    const representative = getUpgradeCard(familyKey);
    entries.push({ card: representative, count });
  });

  state.ascensions.forEach((ascension) => {
    entries.push({ card: ascension, count: 1 });
  });

  const rarityOrder: Record<UpgradeRarity, number> = {
    common: 0,
    uncommon: 1,
    epic: 2,
    ascension: 3,
  };
  entries.sort((a, b) => {
    const rarityDiff = rarityOrder[a.card.rarity] - rarityOrder[b.card.rarity];
    if (rarityDiff !== 0) return rarityDiff;
    return a.card.name.localeCompare(b.card.name);
  });
  return entries;
};

export const findUnlockedAscensions = (state: GameState): UpgradeCard[] =>
  ASCENSIONS.filter((ascension) => {
    if (state.ascensions.some((entry) => entry.id === ascension.id))
      return false;
    const sourceCount = getAscensionStackCount(state, ascension.sourceId);
    return sourceCount >= getAscensionThreshold(ascension.sourceId);
  });
