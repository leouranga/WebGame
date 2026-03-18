export { normalizeRunStatus, validateRunCheckpoint, verifyRunSessionToken, createRunSessionToken } from '@/lib/run-validation';

export const normalizeRunFinishPayload = (value: unknown) => {
  const record = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return {
    runId: typeof record.runId === 'string' ? record.runId : '',
    runSessionId: typeof record.runSessionId === 'string' ? record.runSessionId : '',
    finalStatus: typeof record.finalStatus === 'string' ? record.finalStatus : 'completed',
    progress: record.progress ?? null,
  };
};

export const validateFinishedRun = () => ({
  accepted: false,
  progress: null,
  acceptedScore: 0,
  acceptedWave: 1,
  reason: 'Legacy run validation has been replaced by token-based validation.',
});
