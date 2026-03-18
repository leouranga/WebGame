import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setSessionCookie } from '@/lib/auth';
import { createDefaultAccountProgress, type AccountResponse } from '@/lib/progress';
import { registrationSchema } from '@/lib/validators';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid registration data.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const email = parsed.data.email.toLowerCase();
  const login = parsed.data.login.toLowerCase();
  const nickname = parsed.data.nickname.trim();

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { login },
        { nickname },
      ],
    },
    select: { email: true, login: true, nickname: true },
  });

  if (existing) {
    const error = existing.email === email
      ? 'Email is already in use.'
      : existing.login === login
        ? 'Login is already in use.'
        : 'Nickname is already in use.';

    return NextResponse.json({ error }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const progress = createDefaultAccountProgress();

  const user = await prisma.user.create({
    data: {
      email,
      login,
      nickname,
      passwordHash,
      souls: progress.souls,
      selectedMage: progress.selectedMage,
      unlockedMages: progress.unlockedMages,
      shopItems: progress.shopItems,
      highScore: 0,
      highestWave: 1,
    },
    select: {
      id: true,
      email: true,
      login: true,
      nickname: true,
      highScore: true,
      highestWave: true,
    },
  });

  await setSessionCookie({ userId: user.id, login: user.login, nickname: user.nickname });

  return NextResponse.json<AccountResponse>({
    authenticated: true,
    user,
    progress,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
