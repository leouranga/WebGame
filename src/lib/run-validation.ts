import { SignJWT, jwtVerify } from 'jose';
import { clampNonNegativeInt, normalizeMageId } from '@/lib/progress';

const TERMINAL_RUN_STATUSES = new Set(['menu', 'death']);
const TIME_WAVE_GRACE = 2;
const SECONDS_PER_WAVE_UPPER_BOUND = 1.2;
const RUN_TOKEN_DURATION_SECONDS = 60 * 60 * 12;

const getRunTokenSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not configured.');
  return new TextEncoder().encode(secret);
};

const getWaveSpawnCount = (waveNumber: number) => (waveNumber === 50 ? 1 : waveNumber === 100 ? 2 : waveNumber + 1);

const getMaxEnemyScoreValue = (waveNumber: number) => {
  if (waveNumber === 50) return 500;
  if (waveNumber === 100) return 260;
  if (waveNumber >= 80) return 34;
  if (waveNumber >= 70) return 30;
  if (waveNumber >= 60) return 23;
  if (waveNumber >= 51) return 21;
  if (waveNumber >= 40) return 18;
  if (waveNumber >= 30) return 16;
  if (waveNumber >= 20) return 14;
  if (waveNumber >= 10) return 12;
  return 9;
};

const getScoreUpperBoundForWave = (currentWave: number) => {
  let total = 0;
  for (let wave = 1; wave <= Math.max(1, currentWave); wave += 1) {
    total += getWaveSpawnCount(wave) * (getMaxEnemyScoreValue(wave) + wave * 4);
  }
  return total;
};

const getWaveUpperBoundByTime = (startedAt: Date, now: Date) => {
  const elapsedSeconds = Math.max(0, (now.getTime() - startedAt.getTime()) / 1000);
  return Math.max(1, 1 + Math.floor(elapsedSeconds / SECONDS_PER_WAVE_UPPER_BOUND) + TIME_WAVE_GRACE);
};

export const normalizeRunStatus = (value: unknown) => (typeof value === 'string' ? value : 'menu');

export const isTerminalRunStatus = (value: string) => TERMINAL_RUN_STATUSES.has(value);

export type RunSessionTokenPayload = {
  userId: string;
  mage: ReturnType<typeof normalizeMageId>;
  startedAtMs: number;
};

export const createRunSessionToken = async ({
  userId,
  selectedMage,
  startedAtMs = Date.now(),
}: {
  userId: string;
  selectedMage: unknown;
  startedAtMs?: number;
}) => new SignJWT({
  mage: normalizeMageId(selectedMage),
  startedAtMs,
})
  .setProtectedHeader({ alg: 'HS256' })
  .setSubject(userId)
  .setIssuedAt()
  .setExpirationTime(`${RUN_TOKEN_DURATION_SECONDS}s`)
  .sign(getRunTokenSecret());

export const verifyRunSessionToken = async (token: string, expectedUserId: string): Promise<RunSessionTokenPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, getRunTokenSecret());
    if (typeof payload.sub !== 'string' || payload.sub !== expectedUserId) return null;
    if (typeof payload.mage !== 'string' || typeof payload.startedAtMs !== 'number' || !Number.isFinite(payload.startedAtMs)) return null;

    return {
      userId: payload.sub,
      mage: normalizeMageId(payload.mage),
      startedAtMs: Math.max(0, Math.round(payload.startedAtMs)),
    };
  } catch {
    return null;
  }
};

export const validateRunCheckpoint = ({
  selectedMage,
  reportedScore,
  reportedWave,
  runStatus,
  tokenMage,
  startedAt,
  now = new Date(),
}: {
  selectedMage: unknown;
  reportedScore: unknown;
  reportedWave: unknown;
  runStatus: string;
  tokenMage: string;
  startedAt: Date;
  now?: Date;
}) => {
  const normalizedMage = normalizeMageId(selectedMage);
  const normalizedScore = clampNonNegativeInt(reportedScore, 9_999_999_999);
  const normalizedWave = Math.max(1, clampNonNegativeInt(reportedWave, 9_999_999));
  const waveUpperBound = getWaveUpperBoundByTime(startedAt, now);
  const scoreUpperBound = getScoreUpperBoundForWave(normalizedWave);
  const accepted = tokenMage === normalizedMage && normalizedWave <= waveUpperBound && normalizedScore <= scoreUpperBound;

  return {
    accepted,
    validatedScore: accepted ? normalizedScore : 0,
    validatedWave: accepted ? normalizedWave : 1,
    shouldEndRun: isTerminalRunStatus(runStatus),
  };
};
