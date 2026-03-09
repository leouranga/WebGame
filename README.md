# Arcfall Stand

A Next.js + Tailwind + TypeScript browser survival game inspired by the structure of Seraph's Last Stand.

## Run

```bash
npm install
npm run dev
```

## Controls

- `A / D` or arrow keys: move
- `W / Space / Arrow Up`: jump
- Hold left mouse: cast toward cursor
- Menu: click a mage or press `1-5`
- `Enter`: start run / next wave / restart

## Structure

- `src/components/GameClient.tsx` - canvas setup and browser input
- `src/game/engine.ts` - main game loop and state updates
- `src/game/render.ts` - all canvas rendering
- `src/game/terrain.ts` - terrain shape and collision queries
- `src/game/upgrades.ts` - wave reward cards
- `src/game/characters/mages.ts` - mage definitions
- `src/game/spells/projectiles.ts` - projectile creation logic
- `src/game/monsters/monsters.ts` - monster definitions and spawning
- `src/game/shop/items.ts` - shop inventory

## Shop items

- **Amber Aura**: 20% more defense, slower move speed
- **Shadow Aura**: higher jump

## Soul economy

Soul drops are intentionally much rarer now. Enemies only have a chance to drop soul orbs instead of paying souls every kill.
