import type { Enemy, Player } from '@/game/types';

const roundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

const glow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha = 0.55,
) => {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(alpha, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
};

const fillCircle = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
};

const fillEllipse = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
) => {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
};

export const drawMageSprite = (
  ctx: CanvasRenderingContext2D,
  player: Player,
  tick: number,
  scale = 1,
) => {
  const w = player.width * scale;
  const h = player.height * scale;
  ctx.save();
  ctx.translate(player.pos.x, player.pos.y);

  if (player.invuln > 0) {
    ctx.globalAlpha = 0.68;
  }

  fillEllipse(ctx, 0, h * 0.5, w * 0.46, h * 0.14, 'rgba(15,23,42,0.35)');
  glow(ctx, 0, -h * 0.08, Math.max(w, h) * 0.95, 'rgba(255,255,255,0.20)', 0.18);

  ctx.beginPath();
  ctx.moveTo(-w * 0.36, -h * 0.05);
  ctx.quadraticCurveTo(-w * 0.44, h * 0.18, -w * 0.34, h * 0.42);
  ctx.quadraticCurveTo(0, h * 0.62, w * 0.34, h * 0.42);
  ctx.quadraticCurveTo(w * 0.44, h * 0.18, w * 0.36, -h * 0.05);
  ctx.quadraticCurveTo(w * 0.2, -h * 0.48, 0, -h * 0.52);
  ctx.quadraticCurveTo(-w * 0.2, -h * 0.48, -w * 0.36, -h * 0.05);
  ctx.closePath();
  ctx.fillStyle = player.color;
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2 * scale;
  ctx.stroke();

  fillEllipse(ctx, 0, -h * 0.16, w * 0.22, h * 0.18, 'rgba(240,248,255,0.95)');
  fillEllipse(ctx, 0, -h * 0.18, w * 0.28, h * 0.22, 'rgba(255,255,255,0.08)');

  fillCircle(ctx, -w * 0.07, -h * 0.16, 2.4 * scale, '#0f172a');
  fillCircle(ctx, w * 0.07, -h * 0.16, 2.4 * scale, '#0f172a');

  fillCircle(ctx, w * 0.28 * player.facing, -h * 0.06, 4.8 * scale, 'rgba(255,255,255,0.9)');
  fillCircle(ctx, w * 0.28 * player.facing, -h * 0.06, 2.8 * scale, player.color);
  glow(ctx, w * 0.28 * player.facing, -h * 0.06, 12 * scale, 'rgba(255,255,255,0.25)', 0.22);


  ctx.restore();
};

const drawWisp = (ctx: CanvasRenderingContext2D, enemy: Enemy, tick: number) => {
  const t = tick * 0.08 + enemy.hoverPhase;
  glow(ctx, 0, 0, enemy.width * 1.4, 'rgba(251,146,60,0.24)', 0.2);

  ctx.beginPath();
  ctx.moveTo(-enemy.width * 0.36, -enemy.height * 0.08);
  ctx.quadraticCurveTo(-enemy.width * 0.5, enemy.height * 0.15, -enemy.width * 0.2, enemy.height * 0.44);
  ctx.quadraticCurveTo(0, enemy.height * 0.63, enemy.width * 0.2, enemy.height * 0.44);
  ctx.quadraticCurveTo(enemy.width * 0.5, enemy.height * 0.12, enemy.width * 0.36, -enemy.height * 0.08);
  ctx.quadraticCurveTo(0, -enemy.height * 0.54, -enemy.width * 0.36, -enemy.height * 0.08);
  ctx.closePath();
  ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : enemy.bodyColor;
  ctx.fill();

  fillCircle(ctx, -enemy.width * 0.08, -enemy.height * 0.1, 2.4, '#0f172a');
  fillCircle(ctx, enemy.width * 0.08, -enemy.height * 0.1, 2.4, '#0f172a');

  for (let i = 0; i < 3; i += 1) {
    const angle = t + i * (Math.PI * 2) / 3;
    fillCircle(
      ctx,
      Math.cos(angle) * enemy.width * 0.16,
      enemy.height * 0.1 + Math.sin(angle * 1.4) * 5,
      2.6,
      'rgba(255,255,255,0.35)',
    );
  }
};

const drawCrusher = (ctx: CanvasRenderingContext2D, enemy: Enemy, tick: number) => {
  const pulse = 1 + Math.sin(tick * 0.05 + enemy.hoverPhase) * 0.06;
  glow(ctx, 0, 0, enemy.width * 1.35, 'rgba(249,115,22,0.18)', 0.18);

  ctx.save();
  ctx.scale(pulse, pulse);
  fillCircle(ctx, 0, 0, enemy.width * 0.34, enemy.hitFlash > 0 ? '#ffffff' : '#374151');
  fillCircle(ctx, 0, 0, enemy.width * 0.18, enemy.bodyColor);

  for (let i = 0; i < 4; i += 1) {
    const angle = enemy.hoverPhase + tick * 0.01 + i * Math.PI * 0.5;
    ctx.save();
    ctx.rotate(angle);
    roundedRectPath(ctx, enemy.width * 0.22, -enemy.height * 0.08, enemy.width * 0.18, enemy.height * 0.16, 4);
    ctx.fillStyle = '#475569';
    ctx.fill();
    ctx.restore();
  }

  fillCircle(ctx, -enemy.width * 0.08, -enemy.height * 0.04, 2.8, '#111827');
  fillCircle(ctx, enemy.width * 0.08, -enemy.height * 0.04, 2.8, '#111827');
  ctx.restore();
};

const drawSpitter = (ctx: CanvasRenderingContext2D, enemy: Enemy, tick: number) => {
  glow(ctx, 0, 0, enemy.width * 1.4, 'rgba(251,191,36,0.18)', 0.18);
  fillEllipse(ctx, 0, -enemy.height * 0.02, enemy.width * 0.34, enemy.height * 0.28, enemy.hitFlash > 0 ? '#ffffff' : enemy.bodyColor);
  fillEllipse(ctx, 0, -enemy.height * 0.1, enemy.width * 0.22, enemy.height * 0.16, 'rgba(255,255,255,0.16)');

  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * enemy.width * 0.12, enemy.height * 0.1);
    ctx.quadraticCurveTo(i * enemy.width * 0.18, enemy.height * 0.34, i * enemy.width * 0.08, enemy.height * 0.5 + Math.sin(tick * 0.08 + i) * 4);
    ctx.strokeStyle = 'rgba(250,204,21,0.75)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  fillCircle(ctx, -enemy.width * 0.08, -enemy.height * 0.06, 2.5, '#111827');
  fillCircle(ctx, enemy.width * 0.08, -enemy.height * 0.06, 2.5, '#111827');
  fillCircle(ctx, enemy.width * 0.24, enemy.height * 0.02, 4, enemy.projectileColor);
};

const drawOracle = (ctx: CanvasRenderingContext2D, enemy: Enemy, tick: number) => {
  const spin = tick * 0.02 + enemy.hoverPhase;
  glow(ctx, 0, 0, enemy.width * 1.7, 'rgba(244,114,182,0.2)', 0.2);

  ctx.save();
  ctx.rotate(spin);
  ctx.strokeStyle = 'rgba(244,114,182,0.55)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, enemy.width * 0.45, enemy.height * 0.22, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  fillCircle(ctx, 0, 0, enemy.width * 0.34, enemy.hitFlash > 0 ? '#ffffff' : enemy.bodyColor);
  fillEllipse(ctx, 0, 0, enemy.width * 0.2, enemy.height * 0.12, '#fdf2f8');
  fillCircle(ctx, 0, 0, enemy.width * 0.08, '#6d28d9');
  fillCircle(ctx, 0, 0, enemy.width * 0.04, '#111827');

  for (let i = 0; i < 3; i += 1) {
    const angle = spin + i * (Math.PI * 2) / 3;
    fillCircle(
      ctx,
      Math.cos(angle) * enemy.width * 0.52,
      Math.sin(angle) * enemy.height * 0.32,
      3,
      enemy.projectileColor,
    );
  }
};

export const drawEnemySprite = (ctx: CanvasRenderingContext2D, enemy: Enemy, tick: number) => {
  ctx.save();
  ctx.translate(enemy.pos.x, enemy.pos.y);

  const hpAlpha = 0.18 + 0.82 * Math.max(0, enemy.hp / Math.max(1, enemy.maxHp));
  ctx.globalAlpha = hpAlpha;

  fillEllipse(ctx, 0, enemy.height * 0.52, enemy.width * 0.42, enemy.height * 0.1, 'rgba(15,23,42,0.26)');

  if (enemy.kind === 'wisp') drawWisp(ctx, enemy, tick);
  if (enemy.kind === 'crusher') drawCrusher(ctx, enemy, tick);
  if (enemy.kind === 'spitter') drawSpitter(ctx, enemy, tick);
  if (enemy.kind === 'oracle') drawOracle(ctx, enemy, tick);

  if (enemy.hitFlash > 0) {
    ctx.globalAlpha = enemy.hitFlash * 0.9;
    glow(ctx, 0, 0, Math.max(enemy.width, enemy.height) * 1.2, 'rgba(255,255,255,0.9)', 0.18);
  }

  ctx.restore();
};

export const drawMagePortrait = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) => {
  const fakePlayer: Player = {
    pos: { x, y },
    vel: { x: 0, y: 0 },
    width: size * 0.48,
    height: size * 0.76,
    baseWidth: size * 0.48,
    baseHeight: size * 0.76,
    onGround: true,
    facing: 1,
    hp: 1,
    maxHp: 1,
    damageTakenMultiplier: 1,
    moveSpeed: 1,
    jumpPower: 1,
    projectileSpeed: 1,
    projectileRadius: 1,
    fireInterval: 1,
    damage: 1,
    color,
    name: '',
    passive: '',
    mageId: 'wind',
    behavior: 'normal',
    explosionRadius: 0,
    homingStrength: 0,
    invuln: 0,
    maxJumps: 1,
    jumpsRemaining: 0,
  };

  drawMageSprite(ctx, fakePlayer, 0, 1);
};
