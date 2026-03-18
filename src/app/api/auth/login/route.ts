import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setSessionCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validators';
import { normalizeAccountProgress, type AccountResponse } from '@/lib/progress';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOCKOUT_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const identifier = parsed.data.identifier.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { login: identifier },
        { email: identifier },
      ],
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const remainingMs = user.lockedUntil.getTime() - Date.now();
    const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));
    return NextResponse.json({ error: `Too many failed attempts. Try again in ${remainingMinutes} minute(s).` }, { status: 429, headers: { 'Cache-Control': 'no-store' } });
  }

  const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);

  if (!passwordMatches) {
    const failedLoginAttempts = user.failedLoginAttempts + 1;
    const lockUser = failedLoginAttempts >= 3;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: lockUser ? 0 : failedLoginAttempts,
        lockedUntil: lockUser ? new Date(Date.now() + LOCKOUT_MS) : null,
      },
    });

    const error = lockUser
      ? 'Too many failed attempts. Login is blocked for 5 minutes.'
      : 'Invalid credentials.';

    return NextResponse.json({ error }, { status: lockUser ? 429 : 401, headers: { 'Cache-Control': 'no-store' } });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await setSessionCookie({ userId: user.id, login: user.login, nickname: user.nickname });

  const progress = normalizeAccountProgress({
    souls: user.souls,
    selectedMage: user.selectedMage,
    unlockedMages: user.unlockedMages,
    shopItems: user.shopItems,
    currentScore: user.highScore,
    currentWave: user.highestWave,
  });

  return NextResponse.json<AccountResponse>({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      login: user.login,
      nickname: user.nickname,
      highScore: user.highScore,
      highestWave: user.highestWave,
    },
    progress,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
