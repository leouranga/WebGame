import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readSessionFromCookies } from '@/lib/auth';
import { isDealerStaffActiveForProgress, normalizeAccountProgress } from '@/lib/progress';
import { normalizeRunStatus, validateRunCheckpoint, verifyRunSessionToken } from '@/lib/run-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const unauthorized = () => NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });

const saveProgress = async (request: Request) => {
  const session = await readSessionFromCookies();
  if (!session) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    try {
      const raw = await request.text();
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
  }

  const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const progress = normalizeAccountProgress(payload);
  const runSessionId = typeof payload.runSessionId === 'string' && payload.runSessionId.trim() ? payload.runSessionId.trim() : null;
  const runStatus = normalizeRunStatus(payload.runStatus);

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      highScore: true,
      highestWave: true,
    },
  });

  if (!currentUser) return unauthorized();

  let highScore = currentUser.highScore;
  let highestWave = currentUser.highestWave;
  const rankingBlockedByDealerStaff = isDealerStaffActiveForProgress(progress);

  if (runSessionId && !rankingBlockedByDealerStaff) {
    const runToken = await verifyRunSessionToken(runSessionId, session.userId);
    if (runToken) {
      const validation = validateRunCheckpoint({
        selectedMage: progress.selectedMage,
        reportedScore: progress.currentScore,
        reportedWave: progress.currentWave,
        runStatus,
        tokenMage: runToken.mage,
        startedAt: new Date(runToken.startedAtMs),
        now: new Date(),
      });

      if (validation.accepted) {
        highScore = Math.max(highScore, validation.validatedScore);
        highestWave = Math.max(highestWave, validation.validatedWave);
      }
    }
  }

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: {
      souls: progress.souls,
      selectedMage: progress.selectedMage,
      unlockedMages: progress.unlockedMages,
      shopItems: progress.shopItems,
      highScore,
      highestWave,
    },
    select: {
      highScore: true,
      highestWave: true,
    },
  });

  return NextResponse.json(updated, { headers: { 'Cache-Control': 'no-store' } });
};

export async function POST(request: Request) {
  return saveProgress(request);
}

export async function PUT(request: Request) {
  return saveProgress(request);
}
