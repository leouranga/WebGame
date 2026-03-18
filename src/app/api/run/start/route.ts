import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readSessionFromCookies } from '@/lib/auth';
import { normalizeMageId } from '@/lib/progress';
import { createRunSessionToken } from '@/lib/run-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const unauthorized = () => NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  const session = await readSessionFromCookies();
  if (!session) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true },
  });

  if (!user) return unauthorized();

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const selectedMage = body && typeof body === 'object' && 'selectedMage' in body
    ? normalizeMageId((body as { selectedMage?: unknown }).selectedMage)
    : 'wind';

  const runSessionId = await createRunSessionToken({
    userId: session.userId,
    selectedMage,
  });

  return NextResponse.json({ runSessionId }, { headers: { 'Cache-Control': 'no-store' } });
}
