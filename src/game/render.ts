import { MAGES } from '@/game/characters/mages';
import { ALL_UPGRADES } from '@/game/upgrades';
import { FLOOR_BASE_Y } from '@/game/constants';
import { getSelectedMage } from '@/game/engine';
import { drawEnemySprite, drawMagePortrait, drawMageSprite } from '@/game/rendering/sprites';
import type { GameState, Rect, TerrainPoint, UpgradeCard } from '@/game/types';
import { pointInRect } from '@/game/utils';

const fillPanel = (ctx: CanvasRenderingContext2D, rect: Rect, fill: string, stroke = 'rgba(148,163,184,0.35)') => {
  ctx.fillStyle = fill;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) => {
  const words = value.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }

  if (current) lines.push(current);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
};

const drawUpgradeIcon = (
  ctx: CanvasRenderingContext2D,
  icon: string,
  x: number,
  y: number,
  size: number,
  color: string,
  variant: 'framed' | 'plain' = 'framed',
) => {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (variant === 'framed') {
    ctx.fillStyle = 'rgba(15,23,42,0.9)';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);
  }

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = variant === 'plain' ? 12 : 6;
  ctx.font = `${Math.round(size * (variant === 'plain' ? 0.78 : 0.56))}px Arial`;
  ctx.fillText(icon, x + size / 2, y + size / 2 + 1);
  ctx.restore();
};

const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, tick: number) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#071227');
  gradient.addColorStop(0.55, '#040917');
  gradient.addColorStop(1, '#02040b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255,255,255,0.48)';
  for (let i = 0; i < 48; i += 1) {
    const x = (i * 97.37) % width;
    const y = ((i * 53.8) + tick * 0.005) % (height * 0.66);
    const size = i % 3 === 0 ? 2 : 1.4;
    ctx.fillRect(x, y, size, size);
  }

  ctx.beginPath();
  ctx.arc(width * 0.14, height * 0.1, height * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(129,140,248,0.06)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(width * 0.82, height * 0.08, height * 0.09, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(56,189,248,0.05)';
  ctx.fill();
};

const drawTerrain = (ctx: CanvasRenderingContext2D, terrain: TerrainPoint[], width: number, height: number) => {
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(terrain[0].x, terrain[0].y);
  for (const point of terrain) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.lineTo(width, height);
  ctx.closePath();

  const fill = ctx.createLinearGradient(0, FLOOR_BASE_Y - 80, 0, height);
  fill.addColorStop(0, '#111f38');
  fill.addColorStop(1, '#09101f');
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(terrain[0].x, terrain[0].y);
  for (const point of terrain) ctx.lineTo(point.x, point.y);
  ctx.strokeStyle = 'rgba(165, 180, 252, 0.92)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(terrain[0].x, terrain[0].y - 2);
  for (const point of terrain) ctx.lineTo(point.x, point.y - 2);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  const grass = ctx.createLinearGradient(0, FLOOR_BASE_Y - 24, 0, FLOOR_BASE_Y + 16);
  grass.addColorStop(0, 'rgba(34,197,94,0.18)');
  grass.addColorStop(1, 'rgba(34,197,94,0)');
  ctx.fillStyle = grass;
  ctx.fill();
  ctx.restore();
};

const drawSmokeAuraLayer = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
  colorStops: [string, string],
  strength = 1,
  layer: 'back' | 'front',
) => {
  const { player, tick } = state;
  const bodyRadiusX = player.width * 0.7;
  const bodyRadiusY = player.height * 0.62;
  const puffCount = layer === 'back' ? 6 : 5;
  const startAngle = layer === 'back' ? Math.PI * 0.2 : -Math.PI * 0.15;
  const endAngle = layer === 'back' ? Math.PI * 1.8 : Math.PI * 0.95;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < puffCount; i += 1) {
    const t = puffCount === 1 ? 0.5 : i / (puffCount - 1);
    const angle = startAngle + (endAngle - startAngle) * t + Math.sin(tick * 0.035 + i * 0.9) * 0.08;
    const swirl = tick * 0.018 + i * 1.37;
    const orbitX = Math.cos(angle) * bodyRadiusX;
    const orbitY = Math.sin(angle) * bodyRadiusY;
    const puffX = player.pos.x + orbitX + Math.cos(swirl) * 5;
    const puffY = player.pos.y + orbitY - player.height * 0.04 + Math.sin(swirl * 1.15) * 4;
    const radius = (10 + i * 2.1) * strength;
    const alphaBoost = layer === 'front' ? 1.08 : 0.92;
    const puff = ctx.createRadialGradient(puffX, puffY, 0, puffX, puffY, radius);
    puff.addColorStop(0, colorStops[0]);
    puff.addColorStop(0.52, colorStops[1]);
    puff.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alphaBoost;
    ctx.fillStyle = puff;
    ctx.beginPath();
    ctx.arc(puffX, puffY, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
};

const drawPlayer = (ctx: CanvasRenderingContext2D, state: GameState) => {
  const aura = state.shopItems.find((item) => item.id === 'amberAura' && item.owned);
  const shadow = state.shopItems.find((item) => item.id === 'shadowAura' && item.owned);

  if (shadow) {
    drawSmokeAuraLayer(ctx, state, ['rgba(15,15,20,0.5)', 'rgba(0,0,0,0.2)'], 1.12, 'back');
  }

  if (aura) {
    drawSmokeAuraLayer(ctx, state, ['rgba(251,191,36,0.38)', 'rgba(249,115,22,0.14)'], 0.94, 'back');
  }

  drawMageSprite(ctx, state.player, state.tick);

  if (shadow) {
    drawSmokeAuraLayer(ctx, state, ['rgba(17,17,24,0.32)', 'rgba(0,0,0,0.1)'], 0.88, 'front');
  }

  if (aura) {
    drawSmokeAuraLayer(ctx, state, ['rgba(251,191,36,0.24)', 'rgba(249,115,22,0.08)'], 0.8, 'front');
  }
};

const drawEnemies = (ctx: CanvasRenderingContext2D, state: GameState) => {
  for (const enemy of state.enemies) {
    drawEnemySprite(ctx, enemy, state.tick);

    const hpWidth = enemy.width + 12;
    const ratio = enemy.hp / enemy.maxHp;
    ctx.fillStyle = 'rgba(15,23,42,0.88)';
    ctx.fillRect(enemy.pos.x - hpWidth / 2, enemy.pos.y - enemy.height / 2 - 16, hpWidth, 5);
    ctx.fillStyle = enemy.isRanged ? '#f472b6' : '#22c55e';
    ctx.fillRect(enemy.pos.x - hpWidth / 2, enemy.pos.y - enemy.height / 2 - 16, hpWidth * ratio, 5);
  }
};

const drawProjectiles = (ctx: CanvasRenderingContext2D, state: GameState) => {
  for (const projectile of state.projectiles) {
    const radius = projectile.radius;
    const glow = ctx.createRadialGradient(projectile.pos.x, projectile.pos.y, 0, projectile.pos.x, projectile.pos.y, radius * 2.4);
    glow.addColorStop(0, projectile.color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(projectile.pos.x, projectile.pos.y, radius * 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(projectile.pos.x, projectile.pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = projectile.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(projectile.pos.x - radius * 0.24, projectile.pos.y - radius * 0.24, Math.max(1.6, radius * 0.32), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
  }
};

const drawSoulOrbs = (ctx: CanvasRenderingContext2D, state: GameState) => {
  for (const orb of state.soulOrbs) {
    const gradient = ctx.createRadialGradient(orb.pos.x, orb.pos.y, 0, orb.pos.x, orb.pos.y, orb.radius * 2.8);
    gradient.addColorStop(0, '#e9d5ff');
    gradient.addColorStop(0.35, '#c084fc');
    gradient.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(orb.pos.x, orb.pos.y, orb.radius * 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(orb.pos.x, orb.pos.y, orb.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#a855f7';
    ctx.fill();
    ctx.strokeStyle = '#f3e8ff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
};

const drawTexts = (ctx: CanvasRenderingContext2D, state: GameState) => {
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  for (const text of state.texts) {
    ctx.globalAlpha = Math.max(0, text.life);
    ctx.fillStyle = text.color;
    ctx.fillText(text.value, text.pos.x, text.pos.y);
  }
  ctx.globalAlpha = 1;
};

const findHoveredUpgrade = (state: GameState): UpgradeCard | null => {
  for (const entry of state.ui.hudUpgradeIcons) {
    if (pointInRect(state.pointer, entry.rect)) {
      return ALL_UPGRADES.find((upgrade) => upgrade.id === entry.id) ?? null;
    }
  }

  return null;
};

const drawUpgradeTooltip = (ctx: CanvasRenderingContext2D, state: GameState, label: string, anchorX: number, anchorY: number) => {
  ctx.save();
  ctx.font = '14px Arial';
  const paddingX = 12;
  const width = Math.max(84, ctx.measureText(label).width + paddingX * 2);
  const height = 30;
  const x = Math.min(Math.max(anchorX - width / 2, 14), state.width - width - 14);
  const y = Math.max(12, anchorY - height - 14);

  ctx.fillStyle = 'rgba(2,6,23,0.94)';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = 'rgba(226,232,240,0.32)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + width / 2, y + height / 2 + 1);
  ctx.restore();
};

const drawHud = (ctx: CanvasRenderingContext2D, state: GameState) => {
  const mage = getSelectedMage(state);
  const topY = 18;
  const leftPanel = { x: 20, y: topY, w: 356, h: 96 };
  const rightPanel = { x: state.width - 250, y: topY, w: 230, h: 78 };

  state.ui.hudUpgradeIcons = [];

  fillPanel(ctx, leftPanel, 'rgba(5,10,22,0.76)');
  ctx.fillStyle = '#f8fafc';
  ctx.font = '24px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`${mage.name} · Wave ${state.wave.number}`, leftPanel.x + 16, leftPanel.y + 30);
  ctx.fillStyle = '#a5b4fc';
  ctx.font = '15px Arial';
  ctx.fillText(mage.passive, leftPanel.x + 16, leftPanel.y + 56);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '15px Arial';
  ctx.fillText(`Souls: ${state.souls}`, leftPanel.x + 16, leftPanel.y + 82);
  ctx.fillText(`Score: ${state.score}`, leftPanel.x + 128, leftPanel.y + 82);

  fillPanel(ctx, rightPanel, 'rgba(5,10,22,0.76)');
  ctx.fillStyle = '#f8fafc';
  ctx.font = '18px Arial';
  ctx.fillText(`HP ${state.player.hp}/${state.player.maxHp}`, rightPanel.x + 16, rightPanel.y + 28);
  const hpBarX = rightPanel.x + 16;
  const hpBarY = rightPanel.y + 42;
  const hpBarW = rightPanel.w - 32;
  ctx.fillStyle = 'rgba(15,23,42,0.92)';
  ctx.fillRect(hpBarX, hpBarY, hpBarW, 14);
  ctx.fillStyle = '#34d399';
  ctx.fillRect(hpBarX, hpBarY, hpBarW * (state.player.hp / state.player.maxHp), 14);
  ctx.strokeStyle = 'rgba(226,232,240,0.42)';
  ctx.lineWidth = 2;
  ctx.strokeRect(hpBarX, hpBarY, hpBarW, 14);

  const activeUpgrades = ALL_UPGRADES.filter((upgrade) => state.upgradeCounts[upgrade.id] > 0);
  if (activeUpgrades.length > 0) {
    const iconSize = 26;
    const itemWidth = 58;
    const iconY = topY + 18;
    const startX = leftPanel.x + leftPanel.w + 20;
    const maxX = rightPanel.x - 18;

    activeUpgrades.forEach((upgrade, index) => {
      const x = startX + index * itemWidth;
      if (x + itemWidth > maxX) return;

      drawUpgradeIcon(ctx, upgrade.icon, x, iconY, iconSize, upgrade.color, 'plain');
      ctx.fillStyle = '#f8fafc';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`x${state.upgradeCounts[upgrade.id]}`, x + iconSize + 4, iconY + iconSize / 2 + 1);

      state.ui.hudUpgradeIcons.push({
        id: upgrade.id,
        rect: { x: x - 2, y: iconY - 4, w: itemWidth, h: iconSize + 8 },
      });
    });

    ctx.textBaseline = 'alphabetic';
  }

  const hoveredUpgrade = findHoveredUpgrade(state);
  if (hoveredUpgrade) {
    const hoveredRect = state.ui.hudUpgradeIcons.find((entry) => entry.id === hoveredUpgrade.id)?.rect;
    if (hoveredRect) {
      drawUpgradeTooltip(ctx, state, hoveredUpgrade.name, hoveredRect.x + hoveredRect.w / 2, hoveredRect.y);
    }
  }
};

const drawMenu = (ctx: CanvasRenderingContext2D, state: GameState) => {
  state.ui.mageCards = [];
  state.ui.startRect = null;

  ctx.fillStyle = '#f8fafc';
  ctx.font = '36px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Choose your mage', state.width / 2, 78);
  ctx.font = '17px Arial';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Click a mage or press 1-5, then press Enter or Start', state.width / 2, 106);

  const cardWidth = 190;
  const cardHeight = 208;
  const gap = 18;
  const totalWidth = cardWidth * MAGES.length + gap * (MAGES.length - 1);
  const startX = (state.width - totalWidth) / 2;
  const y = 148;

  MAGES.forEach((mage, index) => {
    const rect = { x: startX + index * (cardWidth + gap), y, w: cardWidth, h: cardHeight };
    state.ui.mageCards.push({ id: mage.id, rect });
    const selected = state.selectedMage === mage.id;
    fillPanel(ctx, rect, selected ? 'rgba(30,41,59,0.96)' : 'rgba(8,15,28,0.82)', selected ? mage.color : 'rgba(148,163,184,0.35)');

    drawMagePortrait(ctx, rect.x + rect.w / 2, rect.y + 58, 90, mage.color);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '20px Arial';
    ctx.fillText(mage.name, rect.x + rect.w / 2, rect.y + 112);
    ctx.font = '14px Arial';
    ctx.fillStyle = mage.color;
    ctx.fillText(`Damage ${mage.damage}`, rect.x + rect.w / 2, rect.y + 134);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(mage.passive, rect.x + rect.w / 2, rect.y + 156);
    wrapText(ctx, mage.summary, rect.x + rect.w / 2, rect.y + 178, rect.w - 26, 16);
  });

  const startRect = { x: state.width / 2 - 108, y: 394, w: 216, h: 56 };
  state.ui.startRect = startRect;
  fillPanel(ctx, startRect, 'rgba(91,33,182,0.92)', '#c4b5fd');
  ctx.fillStyle = '#f8fafc';
  ctx.font = '22px Arial';
  ctx.fillText('Start Run', state.width / 2, 430);
};

const drawBetweenWave = (ctx: CanvasRenderingContext2D, state: GameState) => {
  state.ui.upgradeCards = [];
  state.ui.hudUpgradeIcons = [];
  state.ui.shopCards = [];
  state.ui.nextWaveRect = null;

  const panel = { x: state.width / 2 - 520, y: 84, w: 1040, h: 388 };
  fillPanel(ctx, panel, 'rgba(3,7,18,0.92)', 'rgba(148,163,184,0.45)');
  ctx.fillStyle = '#f8fafc';
  ctx.font = '34px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Wave ${state.wave.number} cleared`, state.width / 2, panel.y + 52);
  ctx.font = '17px Arial';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Pick one upgrade. The next wave starts immediately.', state.width / 2, panel.y + 84);

  ctx.textAlign = 'left';
  ctx.font = '22px Arial';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('Choose one upgrade', panel.x + 40, panel.y + 136);

  const upgradeWidth = 300;
  const upgradeHeight = 132;
  const startX = panel.x + 40;
  const gap = 30;

  state.upgrades.forEach((upgrade, index) => {
    const rect = { x: startX + index * (upgradeWidth + gap), y: panel.y + 164, w: upgradeWidth, h: upgradeHeight };
    state.ui.upgradeCards.push({ id: upgrade.id, rect });
    fillPanel(ctx, rect, 'rgba(15,23,42,0.94)', upgrade.color);
    drawUpgradeIcon(ctx, upgrade.icon, rect.x + 18, rect.y + 18, 34, upgrade.color);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '19px Arial';
    ctx.fillText(upgrade.name, rect.x + 64, rect.y + 32);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '15px Arial';
    wrapText(ctx, upgrade.description, rect.x + 18, rect.y + 76, rect.w - 36, 20);
  });
};

const drawDeathShop = (ctx: CanvasRenderingContext2D, state: GameState) => {
  state.ui.shopCards = [];
  state.ui.restartRect = { x: state.width / 2 - 122, y: 538, w: 244, h: 58 };

  ctx.fillStyle = 'rgba(2,6,23,0.82)';
  ctx.fillRect(0, 0, state.width, state.height);

  const panel = { x: state.width / 2 - 470, y: 72, w: 940, h: 544 };
  fillPanel(ctx, panel, 'rgba(3,7,18,0.95)', 'rgba(148,163,184,0.45)');

  ctx.fillStyle = '#f8fafc';
  ctx.font = '40px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Run ended', state.width / 2, panel.y + 54);
  ctx.font = '18px Arial';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`Wave ${state.wave.number} · Score ${state.score}`, state.width / 2, panel.y + 86);
  ctx.fillText(`Souls banked: ${state.souls}`, state.width / 2, panel.y + 114);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#f8fafc';
  ctx.font = '24px Arial';
  ctx.fillText('Death Shop', panel.x + 40, panel.y + 164);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '15px Arial';
  ctx.fillText('Spend souls here. Purchased auras carry into the next run.', panel.x + 40, panel.y + 192);

  state.shopItems.forEach((item, index) => {
    const rect = { x: panel.x + 40, y: panel.y + 224 + index * 116, w: panel.w - 80, h: 92 };
    state.ui.shopCards.push({ id: item.id, rect });
    const fill = item.owned ? 'rgba(16,44,31,0.9)' : 'rgba(15,23,42,0.95)';
    fillPanel(ctx, rect, fill, item.color === '#111111' ? '#94a3b8' : item.color);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '21px Arial';
    ctx.fillText(`${item.name} · ${item.cost} souls`, rect.x + 20, rect.y + 34);
    ctx.fillStyle = item.owned ? '#86efac' : '#cbd5e1';
    ctx.font = '15px Arial';
    wrapText(ctx, item.owned ? 'Owned — active on every new run.' : item.description, rect.x + 20, rect.y + 62, rect.w - 40, 20);
  });

  fillPanel(ctx, state.ui.restartRect, 'rgba(91,33,182,0.92)', '#c4b5fd');
  ctx.fillStyle = '#f8fafc';
  ctx.font = '22px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Restart Run', state.width / 2, state.ui.restartRect.y + 37);
};

export const renderGame = (ctx: CanvasRenderingContext2D, state: GameState) => {
  state.ui.mageCards = [];
  state.ui.upgradeCards = [];
  state.ui.hudUpgradeIcons = [];
  state.ui.shopCards = [];
  state.ui.startRect = null;
  state.ui.nextWaveRect = null;
  state.ui.restartRect = null;

  drawBackground(ctx, state.width, state.height, state.tick);
  drawTerrain(ctx, state.terrain, state.width, state.height);
  drawSoulOrbs(ctx, state);
  drawProjectiles(ctx, state);
  drawEnemies(ctx, state);
  drawPlayer(ctx, state);
  drawTexts(ctx, state);
  drawHud(ctx, state);

  if (state.status === 'menu') drawMenu(ctx, state);
  if (state.status === 'between') drawBetweenWave(ctx, state);
  if (state.status === 'deathshop') drawDeathShop(ctx, state);
};
