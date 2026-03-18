import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { RankingEntry } from '@/lib/progress';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() ?? '';

  const users = await prisma.user.findMany({
    where: query
      ? {
          nickname: { contains: query, mode: 'insensitive' },
        }
      : undefined,
    orderBy: [
      { highScore: 'desc' },
      { highestWave: 'desc' },
      { updatedAt: 'asc' },
    ],
    take: 100,
    select: {
      nickname: true,
      highScore: true,
      highestWave: true,
    },
  });

  const ranking: RankingEntry[] = users.map((user, index) => ({
    rank: index + 1,
    nickname: user.nickname,
    highScore: user.highScore,
    highestWave: user.highestWave,
  }));

  return NextResponse.json({ ranking }, { headers: { 'Cache-Control': 'no-store' } });
}
