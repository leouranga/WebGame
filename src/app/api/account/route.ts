import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readSessionFromCookies } from '@/lib/auth';
import { normalizeAccountProgress, type AccountResponse } from '@/lib/progress';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await readSessionFromCookies();
  if (!session) {
    return NextResponse.json<AccountResponse>({ authenticated: false, user: null, progress: null }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      login: true,
      nickname: true,
      souls: true,
      selectedMage: true,
      unlockedMages: true,
      shopItems: true,
      highScore: true,
      highestWave: true,
    },
  });

  if (!user) {
    return NextResponse.json<AccountResponse>({ authenticated: false, user: null, progress: null }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

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
