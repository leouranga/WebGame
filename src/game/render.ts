import { MAGES } from '@/game/characters/mages';
import { FLOOR_BASE_Y, UPGRADE_REROLL_COST } from '@/game/constants';
import { getSelectedMage } from '@/game/engine';
import { drawEnemySprite, drawMagePortrait, drawMageSprite } from '@/game/rendering/sprites';
import { ALL_UPGRADES, getOwnedDisplayCards } from '@/game/upgrades';
import type { GameState, Rect, TerrainPoint, UpgradeCard, UpgradeRarity } from '@/game/types';
import { pointInRect } from '@/game/utils';

const fillPanel = (ctx: CanvasRenderingContext2D, rect: Rect, fill: string, stroke = 'rgba(148,163,184,0.35)') => {
  ctx.fillStyle = fill;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
};


const drawCenteredLabel = (
  ctx: CanvasRenderingContext2D,
  value: string,
  rect: Rect,
  font = '22px Arial',
  color = '#f8fafc',
) => {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.fillText(value, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.restore();
};

const getWrappedLines = (
  ctx: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
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
  return lines;
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) => {
  const lines = getWrappedLines(ctx, value, maxWidth);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
};

const wrapTextCentered = (
  ctx: CanvasRenderingContext2D,
  value: string,
  centerX: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) => {
  const lines = getWrappedLines(ctx, value, maxWidth);
  lines.forEach((line, index) => ctx.fillText(line, centerX, y + index * lineHeight));
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

const rarityColor = (rarity: UpgradeRarity) => ({
  common: '#f8fafc',
  uncommon: '#86efac',
  epic: '#c084fc',
  ascension: '#f59e0b',
}[rarity]);

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
    const t = i / (puffCount - 1);
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

  if (shadow) drawSmokeAuraLayer(ctx, state, ['rgba(15,15,20,0.5)', 'rgba(0,0,0,0.2)'], 1.12, 'back');
  if (aura) drawSmokeAuraLayer(ctx, state, ['rgba(251,191,36,0.38)', 'rgba(249,115,22,0.14)'], 0.94, 'back');

  drawMageSprite(ctx, state.player, state.tick);

  if (state.effects.barrierReady) {
    ctx.strokeStyle = 'rgba(147,197,253,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(state.player.pos.x, state.player.pos.y - 4, state.player.width * 0.85, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (shadow) drawSmokeAuraLayer(ctx, state, ['rgba(17,17,24,0.32)', 'rgba(0,0,0,0.1)'], 0.88, 'front');
  if (aura) drawSmokeAuraLayer(ctx, state, ['rgba(251,191,36,0.24)', 'rgba(249,115,22,0.08)'], 0.8, 'front');
};

const drawEnemies = (ctx: CanvasRenderingContext2D, state: GameState) => {
  for (const enemy of state.enemies) {
    drawEnemySprite(ctx, enemy, state.tick);

    const hpWidth = enemy.width + 12;
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = 'rgba(15,23,42,0.88)';
    ctx.fillRect(enemy.pos.x - hpWidth / 2, enemy.pos.y - enemy.height / 2 - 16, hpWidth, 5);
    ctx.fillStyle = enemy.isRanged ? '#f472b6' : '#22c55e';
    ctx.fillRect(enemy.pos.x - hpWidth / 2, enemy.pos.y - enemy.height / 2 - 16, hpWidth * ratio, 5);
  }
};

const drawStreamerBeam = (ctx: CanvasRenderingContext2D, state: GameState) => {
  const beam = state.effects.streamerBeam;
  if (!beam || beam.timer <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = 'rgba(147,197,253,0.92)';
  ctx.lineWidth = 6;
  ctx.shadowColor = '#93c5fd';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(beam.from.x, beam.from.y);
  ctx.lineTo(beam.to.x, beam.to.y);
  ctx.stroke();
  ctx.restore();
};

const drawThunderStrikes = (ctx: CanvasRenderingContext2D, state: GameState) => {
  for (const strike of state.thunderStrikes) {
    const alpha = Math.max(0, strike.life / strike.maxLife);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = `rgba(96,165,250,${0.95 * alpha})`;
    ctx.lineWidth = 5;
    ctx.shadowColor = '#93c5fd';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    const startY = 24;
    let currentX = strike.x;
    let currentY = startY;
    ctx.moveTo(currentX, currentY);
    const segments = 6;
    for (let i = 0; i < segments; i += 1) {
      const t = (i + 1) / segments;
      currentX += Math.sin(state.tick * 0.02 + i * 1.7 + strike.id) * 18;
      currentY = startY + (strike.y - startY) * t;
      ctx.lineTo(currentX, currentY);
    }
    ctx.stroke();

    const flash = ctx.createRadialGradient(strike.x, strike.y, 0, strike.x, strike.y, 54);
    flash.addColorStop(0, `rgba(147,197,253,${0.38 * alpha})`);
    flash.addColorStop(0.45, `rgba(96,165,250,${0.16 * alpha})`);
    flash.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = flash;
    ctx.beginPath();
    ctx.arc(strike.x, strike.y, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

const drawWillOWispOrbs = (ctx: CanvasRenderingContext2D, state: GameState) => {
  if (state.effects.wisps <= 0) return;
  const count = state.effects.wisps;
  for (let i = 0; i < count; i += 1) {
    const angle = state.effects.enchanter
      ? (-0.35 + i * 0.16)
      : state.tick * 0.0022 + i * (Math.PI * 2 / Math.max(1, count));
    const centerX = state.effects.enchanter
      ? state.player.pos.x + state.player.facing * (18 + i * 6)
      : state.player.pos.x + Math.cos(angle) * (22 + count * 2);
    const centerY = state.effects.enchanter
      ? state.player.pos.y - 18 + Math.sin(state.tick * 0.004 + i) * 5
      : state.player.pos.y - 10 + Math.sin(angle) * 12;
    const radius = 6 + Math.min(3, count * 0.35);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 3.2);
    glow.addColorStop(0, 'rgba(244,114,182,0.95)');
    glow.addColorStop(0.35, 'rgba(217,70,239,0.45)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f5d0fe';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.beginPath();
    ctx.arc(centerX - radius * 0.25, centerY - radius * 0.25, Math.max(1.4, radius * 0.32), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

const drawProjectiles = (ctx: CanvasRenderingContext2D, state: GameState) => {
  for (const projectile of state.projectiles) {
    if (projectile.behavior === 'blackhole') {
      const glow = ctx.createRadialGradient(projectile.pos.x, projectile.pos.y, 0, projectile.pos.x, projectile.pos.y, projectile.aoeRadius);
      glow.addColorStop(0, 'rgba(168,85,247,0.35)');
      glow.addColorStop(0.45, 'rgba(15,23,42,0.55)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(projectile.pos.x, projectile.pos.y, projectile.aoeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(projectile.pos.x, projectile.pos.y, projectile.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#020617';
      ctx.fill();
      ctx.strokeStyle = 'rgba(192,132,252,0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();
      continue;
    }

    const radius = projectile.radius;
    const speed = Math.hypot(projectile.vel.x, projectile.vel.y);
    const tailScale = projectile.behavior === 'meteor' ? 0.07 : projectile.behavior === 'enemy' ? 0.045 : projectile.behavior === 'fragment' ? 0.06 : 0.05;
    const tailX = projectile.pos.x - projectile.vel.x * tailScale;
    const tailY = projectile.pos.y - projectile.vel.y * tailScale;
    const trailWidth = Math.max(2, radius * (projectile.behavior === 'meteor' ? 1.35 : 0.9));

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const outerGlow = ctx.createRadialGradient(projectile.pos.x, projectile.pos.y, 0, projectile.pos.x, projectile.pos.y, radius * (projectile.behavior === 'meteor' ? 5.6 : projectile.behavior === 'fragment' ? 4.6 : 3.3));
    const coreColor = projectile.behavior === 'fragment' ? 'rgba(255,248,196,0.95)' : projectile.color;
    outerGlow.addColorStop(0, coreColor);
    outerGlow.addColorStop(0.35, projectile.color);
    outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(projectile.pos.x, projectile.pos.y, radius * (projectile.behavior === 'meteor' ? 5.6 : projectile.behavior === 'fragment' ? 4.6 : 3.3), 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = projectile.behavior === 'fragment' ? 'rgba(255,248,196,0.9)' : 'rgba(255,255,255,0.55)';
    ctx.lineWidth = trailWidth;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(projectile.pos.x, projectile.pos.y);
    ctx.stroke();

    const trailDots = projectile.behavior === 'meteor' ? 4 : 3;
    for (let i = 1; i <= trailDots; i += 1) {
      const t = i / (trailDots + 1);
      const px = projectile.pos.x - projectile.vel.x * tailScale * t;
      const py = projectile.pos.y - projectile.vel.y * tailScale * t;
      ctx.fillStyle = projectile.color;
      ctx.globalAlpha = 0.22 + (1 - t) * 0.22;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1.2, radius * (0.42 - t * 0.08)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(projectile.pos.x, projectile.pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = projectile.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(projectile.pos.x - radius * 0.24, projectile.pos.y - radius * 0.24, Math.max(1.6, radius * 0.32), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.fill();

    ctx.restore();
  }
};

const drawImpacts = (ctx: CanvasRenderingContext2D, state: GameState) => {
  for (const impact of state.impacts) {
    const alpha = Math.max(0, impact.life / impact.maxLife);
    const progress = 1 - alpha;
    const radius = impact.radius * (0.45 + progress * 0.9);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const ring = ctx.createRadialGradient(impact.pos.x, impact.pos.y, 0, impact.pos.x, impact.pos.y, radius);
    ring.addColorStop(0, `rgba(255,255,255,${0.26 * alpha})`);
    ring.addColorStop(0.32, impact.color.replace('rgb', 'rgba').replace(')', `,${0.38 * alpha})`));
    ring.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(impact.pos.x, impact.pos.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,${0.65 * alpha})`;
    ctx.lineWidth = Math.max(1.5, radius * 0.06);
    for (let i = 0; i < 6; i += 1) {
      const angle = i * (Math.PI * 2 / 6) + progress * 0.6;
      const inner = radius * 0.24;
      const outer = radius * 0.82;
      ctx.beginPath();
      ctx.moveTo(impact.pos.x + Math.cos(angle) * inner, impact.pos.y + Math.sin(angle) * inner);
      ctx.lineTo(impact.pos.x + Math.cos(angle) * outer, impact.pos.y + Math.sin(angle) * outer);
      ctx.stroke();
    }

    ctx.restore();
  }
};

const drawSoulOrbs = (ctx: CanvasRenderingContext2D, state: GameState) => {
  for (const orb of state.soulOrbs) {
    const inner = orb.kind === 'heal' ? '#86efac' : '#a855f7';
    const mid = orb.kind === 'heal' ? '#22c55e' : '#c084fc';
    const outer = orb.kind === 'heal' ? 'rgba(34,197,94,0)' : 'rgba(168,85,247,0)';
    const gradient = ctx.createRadialGradient(orb.pos.x, orb.pos.y, 0, orb.pos.x, orb.pos.y, orb.radius * 2.8);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.35, mid);
    gradient.addColorStop(1, outer);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(orb.pos.x, orb.pos.y, orb.radius * 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(orb.pos.x, orb.pos.y, orb.radius, 0, Math.PI * 2);
    ctx.fillStyle = mid;
    ctx.fill();
    ctx.strokeStyle = orb.kind === 'heal' ? '#dcfce7' : '#f3e8ff';
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

const drawUpgradeTooltip = (ctx: CanvasRenderingContext2D, state: GameState, card: UpgradeCard, anchorX: number, anchorY: number) => {
  ctx.save();
  ctx.font = '14px Arial';
  const label = card.name;
  const paddingX = 12;
  const width = Math.max(120, ctx.measureText(label).width + paddingX * 2);
  const height = 34;
  const x = Math.min(Math.max(anchorX - width / 2, 14), state.width - width - 14);
  const y = Math.max(12, anchorY - height - 14);

  ctx.fillStyle = 'rgba(2,6,23,0.94)';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = 'rgba(226,232,240,0.32)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = rarityColor(card.rarity);
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
  ctx.fillText(`HP ${Math.ceil(state.player.hp)}/${state.player.maxHp}`, rightPanel.x + 16, rightPanel.y + 28);
  const hpBarX = rightPanel.x + 16;
  const hpBarY = rightPanel.y + 42;
  const hpBarW = rightPanel.w - 32;
  ctx.fillStyle = 'rgba(15,23,42,0.92)';
  ctx.fillRect(hpBarX, hpBarY, hpBarW, 14);
  ctx.fillStyle = '#34d399';
  ctx.fillRect(hpBarX, hpBarY, hpBarW * Math.max(0, state.player.hp / state.player.maxHp), 14);
  ctx.strokeStyle = 'rgba(226,232,240,0.42)';
  ctx.lineWidth = 2;
  ctx.strokeRect(hpBarX, hpBarY, hpBarW, 14);

  const active = getOwnedDisplayCards(state);
  if (active.length > 0) {
    const iconSize = 24;
    const itemWidth = 62;
    const iconsPerRow = Math.max(1, Math.floor((rightPanel.x - (leftPanel.x + leftPanel.w + 28)) / itemWidth));
    const startX = leftPanel.x + leftPanel.w + 24;
    const startY = topY + 8;

    active.forEach(({ card, count }, index) => {
      const row = Math.floor(index / iconsPerRow);
      const col = index % iconsPerRow;
      const x = startX + col * itemWidth;
      const y = startY + row * 26;
      if (y > topY + 54) return;

      drawUpgradeIcon(ctx, card.icon, x, y, iconSize, card.color, 'plain');
      ctx.fillStyle = '#f8fafc';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`x${count}`, x + iconSize + 2, y + iconSize / 2 + 1);
      state.ui.hudUpgradeIcons.push({ id: card.id, rect: { x: x - 3, y: y - 2, w: itemWidth, h: iconSize + 6 } });
    });
  }

  const hoveredUpgrade = findHoveredUpgrade(state);
  if (hoveredUpgrade) {
    const hoveredRect = state.ui.hudUpgradeIcons.find((entry) => entry.id === hoveredUpgrade.id)?.rect;
    if (hoveredRect) drawUpgradeTooltip(ctx, state, hoveredUpgrade, hoveredRect.x + hoveredRect.w / 2, hoveredRect.y);
  }
};

const drawMenu = (ctx: CanvasRenderingContext2D, state: GameState) => {
  state.ui.mageCards = [];
  state.ui.startRect = null;
  state.ui.shopRect = null;

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
    wrapTextCentered(ctx, mage.summary, rect.x + rect.w / 2, rect.y + 178, rect.w - 26, 16);
  });

  const buttonY = 394;
  const startRect = { x: state.width / 2 - 230, y: buttonY, w: 216, h: 56 };
  const shopRect = { x: state.width / 2 + 14, y: buttonY, w: 216, h: 56 };
  state.ui.startRect = startRect;
  state.ui.shopRect = shopRect;

  fillPanel(ctx, startRect, 'rgba(91,33,182,0.92)', '#c4b5fd');
  fillPanel(ctx, shopRect, 'rgba(15,23,42,0.94)', '#93c5fd');

  drawCenteredLabel(ctx, 'Start Run', startRect, '22px Arial');
  drawCenteredLabel(ctx, 'Shop', shopRect, '22px Arial');
};

const drawBetweenWave = (ctx: CanvasRenderingContext2D, state: GameState) => {
  state.ui.upgradeCards = [];
  state.ui.hudUpgradeIcons = [];
  state.ui.shopCards = [];
  state.ui.nextWaveRect = null;
  state.ui.rerollRect = null;

  const columns = Math.min(4, Math.max(1, state.upgrades.length));
  const rows = Math.ceil(state.upgrades.length / columns);
  const cardWidth = 218;
  const cardHeight = 136;
  const gapX = 14;
  const gapY = 18;
  const totalWidth = columns * cardWidth + (columns - 1) * gapX;
  const contentTop = 168;
  const contentHeight = rows * cardHeight + (rows - 1) * gapY;
  const panel = { x: 30, y: 44, w: state.width - 60, h: Math.max(430, contentTop + contentHeight + 92) };

  fillPanel(ctx, panel, 'rgba(3,7,18,0.94)', 'rgba(148,163,184,0.45)');
  ctx.fillStyle = '#f8fafc';
  ctx.font = '34px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Wave ${state.wave.number} cleared`, state.width / 2, panel.y + 48);
  ctx.font = '17px Arial';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Pick one upgrade. The next wave starts immediately.', state.width / 2, panel.y + 78);
  ctx.fillText(`Souls available: ${state.souls}`, state.width / 2, panel.y + 102);

  ctx.textAlign = 'center';
  ctx.font = '22px Arial';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('Choose one upgrade', state.width / 2, panel.y + 134);

  const startX = panel.x + (panel.w - totalWidth) / 2;
  const startY = panel.y + contentTop;

  state.upgrades.forEach((upgrade, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const rect = { x: startX + col * (cardWidth + gapX), y: startY + row * (cardHeight + gapY), w: cardWidth, h: cardHeight };
    state.ui.upgradeCards.push({ id: upgrade.id, rect });
    fillPanel(ctx, rect, 'rgba(15,23,42,0.94)', upgrade.color);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 15px Arial';
    const titleLines = getWrappedLines(ctx, upgrade.name, rect.w - 24).slice(0, 2);
    titleLines.forEach((line, lineIndex) => {
      ctx.fillText(line, rect.x + rect.w / 2, rect.y + 22 + lineIndex * 17);
    });

    const iconSize = 34;
    const titleHeight = Math.max(1, titleLines.length) * 17;
    const iconY = rect.y + 18 + titleHeight + 8;
    drawUpgradeIcon(ctx, upgrade.icon, rect.x + rect.w / 2 - iconSize / 2, iconY, iconSize, upgrade.color);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '13px Arial';
    wrapTextCentered(ctx, upgrade.description, rect.x + rect.w / 2, iconY + iconSize + 22, rect.w - 20, 17);
  });

  const rerollRect = { x: state.width / 2 - 126, y: startY + contentHeight + 24, w: 252, h: 40 };
  state.ui.rerollRect = rerollRect;
  const rerollEnabled = state.effects.freeRerollAvailable || state.souls >= UPGRADE_REROLL_COST;
  fillPanel(ctx, rerollRect, rerollEnabled ? 'rgba(30,41,59,0.92)' : 'rgba(30,41,59,0.55)', rerollEnabled ? '#93c5fd' : 'rgba(100,116,139,0.7)');
  ctx.textAlign = 'center';
  ctx.fillStyle = rerollEnabled ? '#e0f2fe' : '#94a3b8';
  ctx.font = '17px Arial';
  const rerollLabel = state.effects.freeRerollAvailable ? 'Refresh upgrades · Free' : `Refresh upgrades · ${UPGRADE_REROLL_COST} souls`;
  drawCenteredLabel(ctx, rerollLabel, rerollRect, '17px Arial', rerollEnabled ? '#e0f2fe' : '#94a3b8');
};

const drawShopScreen = (ctx: CanvasRenderingContext2D, state: GameState) => {
  state.ui.shopCards = [];
  state.ui.menuRect = { x: state.width / 2 - 122, y: 538, w: 244, h: 58 };
  state.ui.restartRect = null;

  ctx.fillStyle = 'rgba(2,6,23,0.82)';
  ctx.fillRect(0, 0, state.width, state.height);

  const panel = { x: state.width / 2 - 430, y: 72, w: 860, h: 544 };
  fillPanel(ctx, panel, 'rgba(3,7,18,0.96)', 'rgba(148,163,184,0.45)');

  const headerBand = { x: panel.x + 26, y: panel.y + 24, w: panel.w - 52, h: 96 };
  fillPanel(ctx, headerBand, 'rgba(15,23,42,0.5)', 'rgba(148,163,184,0.2)');

  ctx.fillStyle = '#f8fafc';
  ctx.font = '40px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Soul Shop', state.width / 2, panel.y + 54);
  ctx.font = '18px Arial';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`Souls available: ${state.souls}`, state.width / 2, panel.y + 92);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f8fafc';
  ctx.font = '24px Arial';
  ctx.fillText('Permanent purchases', state.width / 2, panel.y + 154);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '15px Arial';
  ctx.fillText('Purchased auras carry into every new run.', state.width / 2, panel.y + 182);

  state.shopItems.forEach((item, index) => {
    const rect = { x: panel.x + 50, y: panel.y + 214 + index * 116, w: panel.w - 100, h: 92 };
    state.ui.shopCards.push({ id: item.id, rect });
    const fill = item.owned ? 'rgba(16,44,31,0.9)' : 'rgba(15,23,42,0.95)';
    fillPanel(ctx, rect, fill, item.color === '#111111' ? '#94a3b8' : item.color);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 21px Arial';
    ctx.fillText(`${item.name} · ${item.cost} souls`, rect.x + rect.w / 2, rect.y + 32);
    ctx.fillStyle = item.owned ? '#86efac' : '#cbd5e1';
    ctx.font = '15px Arial';
    wrapTextCentered(ctx, item.owned ? 'Owned — active on every new run.' : item.description, rect.x + rect.w / 2, rect.y + 60, rect.w - 52, 19);
  });

  fillPanel(ctx, state.ui.menuRect, 'rgba(15,23,42,0.94)', '#93c5fd');
  drawCenteredLabel(ctx, 'Back', state.ui.menuRect, '22px Arial');
};

const drawDeathScreen = (ctx: CanvasRenderingContext2D, state: GameState) => {
  state.ui.shopCards = [];
  state.ui.restartRect = { x: state.width / 2 - 258, y: 356, w: 236, h: 60 };
  state.ui.menuRect = { x: state.width / 2 + 22, y: 356, w: 236, h: 60 };

  ctx.fillStyle = 'rgba(2,6,23,0.86)';
  ctx.fillRect(0, 0, state.width, state.height);

  const panel = { x: state.width / 2 - 360, y: 160, w: 720, h: 320 };
  fillPanel(ctx, panel, 'rgba(3,7,18,0.96)', 'rgba(148,163,184,0.45)');

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f8fafc';
  ctx.font = '42px Arial';
  ctx.fillText('You Died', state.width / 2, panel.y + 62);
  ctx.font = '18px Arial';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`Wave ${state.wave.number} · Score ${state.score}`, state.width / 2, panel.y + 102);
  ctx.fillText(`Souls banked: ${state.souls}`, state.width / 2, panel.y + 130);
  ctx.fillText('Choose to restart with the same mage or go back to character select.', state.width / 2, panel.y + 170);

  fillPanel(ctx, state.ui.restartRect, 'rgba(91,33,182,0.92)', '#c4b5fd');
  fillPanel(ctx, state.ui.menuRect, 'rgba(15,23,42,0.94)', '#93c5fd');

  drawCenteredLabel(ctx, 'Restart Run', state.ui.restartRect, '22px Arial');
  drawCenteredLabel(ctx, 'Character Select', state.ui.menuRect, '22px Arial');
};

export const renderGame = (ctx: CanvasRenderingContext2D, state: GameState) => {
  state.ui.mageCards = [];
  state.ui.upgradeCards = [];
  state.ui.hudUpgradeIcons = [];
  state.ui.shopCards = [];
  state.ui.startRect = null;
  state.ui.shopRect = null;
  state.ui.nextWaveRect = null;
  state.ui.restartRect = null;
  state.ui.menuRect = null;
  state.ui.rerollRect = null;

  drawBackground(ctx, state.width, state.height, state.tick);
  drawTerrain(ctx, state.terrain, state.width, state.height);
  drawThunderStrikes(ctx, state);
  drawImpacts(ctx, state);
  drawSoulOrbs(ctx, state);
  drawProjectiles(ctx, state);
  drawEnemies(ctx, state);
  drawWillOWispOrbs(ctx, state);
  drawPlayer(ctx, state);
  drawTexts(ctx, state);
  drawHud(ctx, state);

  if (state.status === 'menu') drawMenu(ctx, state);
  if (state.status === 'between') drawBetweenWave(ctx, state);
  if (state.status === 'shop') drawShopScreen(ctx, state);
  if (state.status === 'death') drawDeathScreen(ctx, state);
};
