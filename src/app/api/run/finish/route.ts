import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readSessionFromCookies } from '@/lib/auth';
import { isDealerStaffActiveForProgress, normalizeAccountProgress } from '@/lib/progress';
import { normalizeRunStatus, validateRunCheckpoint, verifyRunSessionToken } from '@/lib/run-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store' };
const unauthorized = () => NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers });

export async function POST(request: Request) {
  const session = await readSessionFromCookies();
  if (!session) return unauthorized();

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    try {
      rawBody = JSON.parse(await request.text());
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400, headers });
    }
  }

  const payload = rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)
    ? rawBody as Record<string, unknown>
    : {};

  const progress = normalizeAccountProgress(payload.progress);
  const runSessionId = typeof payload.runSessionId === 'string' && payload.runSessionId.trim()
    ? payload.runSessionId.trim()
    : typeof payload.runId === 'string' && payload.runId.trim()
      ? payload.runId.trim()
      : null;
  const runStatus = normalizeRunStatus(payload.finalStatus ?? payload.runStatus);

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { highScore: true, highestWave: true },
  });

  if (!currentUser) return unauthorized();

  let highScore = currentUser.highScore;
  let highestWave = currentUser.highestWave;
  let accepted = false;
  let reason: string | null = null;
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

      accepted = validation.accepted;
      if (accepted) {
        highScore = Math.max(highScore, validation.validatedScore);
        highestWave = Math.max(highestWave, validation.validatedWave);
      } else {
        reason = 'Run submission failed server-side validation.';
      }
    } else {
      reason = 'Run session was invalid or expired.';
    }
  } else {
    reason = 'Missing run session id.';
  }

  const user = await prisma.user.update({
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

  return NextResponse.json({
    ok: accepted && !rankingBlockedByDealerStaff,
    error: rankingBlockedByDealerStaff ? 'Dealer Staff disables ranking for that match.' : reason,
    rankingBlocked: rankingBlockedByDealerStaff,
    highScore: user.highScore,
    highestWave: user.highestWave,
  }, { status: accepted || rankingBlockedByDealerStaff ? 200 : 422, headers });
}
