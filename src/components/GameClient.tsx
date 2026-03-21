'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import { GAME_HEIGHT, GAME_WIDTH } from '@/game/constants';
import {
  applyAccountProgress,
  consumeMenuOverlayRequest,
  createGameState,
  exportAccountProgress,
  handleActionKey,
  handlePointerClick,
  setAuthState,
  updateGameState,
} from '@/game/engine';
import { renderGame } from '@/game/render';
import type { GameState, InputState } from '@/game/types';
import { createDefaultAccountProgress, type AccountResponse, type RankingEntry } from '@/lib/progress';

const createInput = (): InputState => ({
  left: false,
  right: false,
  jumpHeld: false,
  jumpPressed: false,
  mouseDown: false,
  mouse: { x: GAME_WIDTH * 0.7, y: GAME_HEIGHT * 0.45 },
});

const pointInRect = (point: { x: number; y: number }, rect: { x: number; y: number; w: number; h: number } | null) => Boolean(
  rect
  && point.x >= rect.x
  && point.x <= rect.x + rect.w
  && point.y >= rect.y
  && point.y <= rect.y + rect.h,
);

const isPointerOnInteractiveUi = (state: GameState) => {
  const { pointer, ui } = state;
  if (ui.mageCards.some((entry) => pointInRect(pointer, entry.rect))) return true;
  if (ui.upgradeCards.some((entry) => pointInRect(pointer, entry.rect))) return true;
  if (ui.shopCards.some((entry) => pointInRect(pointer, entry.rect))) return true;
  if (ui.hudUpgradeIcons.some((entry) => pointInRect(pointer, entry.rect))) return true;

  return [
    ui.startRect,
    ui.shopRect,
    ui.loginRect,
    ui.registerRect,
    ui.rankingRect,
    ui.logoutRect,
    ui.nextWaveRect,
    ui.restartRect,
    ui.menuRect,
    ui.rerollRect,
  ].some((rect) => pointInRect(pointer, rect));
};

type DialogMode = 'login' | 'register' | 'ranking' | null;

type LoginFormState = {
  identifier: string;
  password: string;
};

type RegistrationFormState = {
  email: string;
  login: string;
  password: string;
  nickname: string;
};

const defaultLoginForm = (): LoginFormState => ({ identifier: '', password: '' });
const defaultRegistrationForm = (): RegistrationFormState => ({ email: '', login: '', password: '', nickname: '' });

type RunSnapshot = {
  status: GameState['status'];
  progress: ReturnType<typeof exportAccountProgress>;
  runSessionId: string | null;
};

const RUN_ACTIVE_STATUSES = new Set<GameState['status']>(['playing', 'paused', 'between', 'ascension', 'death']);

const createRunSnapshot = (state: GameState, runSessionId: string | null): RunSnapshot => ({
  status: state.status,
  progress: exportAccountProgress(state),
  runSessionId,
});

const buildProgressPayload = (snapshot: RunSnapshot, runStatus = snapshot.status) => JSON.stringify({
  ...snapshot.progress,
  runSessionId: snapshot.runSessionId,
  runStatus,
});

const modalOverlayClass = 'absolute inset-0 z-20 flex items-center justify-center bg-slate-950/62 backdrop-blur-[2px]';
const modalCardClass = 'w-full border border-slate-500/45 bg-[rgba(3,7,18,0.96)] p-6 text-slate-100 shadow-[0_0_60px_rgba(15,23,42,0.82)]';
const modalButtonClass = 'border border-slate-600/60 bg-[rgba(15,23,42,0.94)] px-4 py-2 text-xs text-slate-100 transition hover:border-slate-300/70';
const inputClass = 'w-full border border-slate-600/55 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-indigo-300';
const buttonClass = 'border px-4 py-3 text-sm font-semibold transition';

export function GameClient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const accountRef = useRef<AccountResponse['user']>(null);
  const dialogRef = useRef<DialogMode>(null);
  const syncRef = useRef({
    inFlight: false,
    lastPayload: '',
    lastSentAt: 0,
    lastStatus: 'menu' as GameState['status'],
    pendingPayload: '',
    pendingForce: false,
  });
  const runSessionIdRef = useRef<string | null>(null);
  const snapshotRef = useRef<RunSnapshot | null>(null);
  const betweenUiAwaitingReleaseRef = useRef(false);
  const betweenUiIgnoreNextClickRef = useRef(false);
  const lastStatusRef = useRef<GameState['status']>('menu');

  const [dialog, setDialog] = useState<DialogMode>(null);
  const [account, setAccount] = useState<AccountResponse['user']>(null);
  const [loginForm, setLoginForm] = useState<LoginFormState>(defaultLoginForm());
  const [registerForm, setRegisterForm] = useState<RegistrationFormState>(defaultRegistrationForm());
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [rankingEntries, setRankingEntries] = useState<RankingEntry[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [rankingQuery, setRankingQuery] = useState('');

  const closeDialog = () => {
    dialogRef.current = null;
    setDialog(null);
    setAuthError(null);
    setRankingError(null);
  };

  const waitForProgressToSettle = async (timeoutMs = 1500) => {
    const startedAt = performance.now();

    while (performance.now() - startedAt < timeoutMs) {
      if (!syncRef.current.inFlight && !syncRef.current.pendingPayload) return;
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }
  };

  const openDialog = (mode: Exclude<DialogMode, null>) => {
    dialogRef.current = mode;
    setDialog(mode);
    setAuthError(null);
    setRankingError(null);
    if (mode === 'ranking') {
      void (async () => {
        await waitForProgressToSettle();
        await fetchRanking();
      })();
    }
  };

  const applySession = (payload: AccountResponse, targetState?: GameState | null) => {
    if (!payload.authenticated || !payload.user || !payload.progress) return;
    const gameState = targetState ?? stateRef.current;
    if (gameState) {
      applyAccountProgress(gameState, payload.progress);
      setAuthState(gameState, {
        isLoggedIn: true,
        userId: payload.user.id,
        login: payload.user.login,
        nickname: payload.user.nickname,
        highScore: payload.user.highScore,
        highestWave: payload.user.highestWave,
      });
    }
    syncRef.current.lastPayload = '';
    syncRef.current.pendingPayload = '';
    syncRef.current.pendingForce = false;
    runSessionIdRef.current = null;
    accountRef.current = payload.user;
    setAccount(payload.user);
  };

  const fetchAccount = async (targetState?: GameState | null) => {
    try {
      const response = await fetch('/api/account', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json() as AccountResponse;
      if (payload.authenticated && payload.user && payload.progress) {
        applySession(payload, targetState);
        return;
      }
    } catch {
      return;
    }

    const gameState = targetState ?? stateRef.current;
    if (gameState) {
      setAuthState(gameState, {
        isLoggedIn: false,
        userId: null,
        login: null,
        nickname: null,
        highScore: 0,
        highestWave: 0,
      });
    }
    runSessionIdRef.current = null;
    syncRef.current.pendingPayload = '';
    syncRef.current.pendingForce = false;
    accountRef.current = null;
    setAccount(null);
  };

  const fetchRanking = async () => {
    try {
      setRankingLoading(true);
      setRankingError(null);
      const response = await fetch('/api/ranking', { cache: 'no-store' });
      const payload = await response.json() as { ranking?: RankingEntry[]; error?: string };
      if (!response.ok) {
        setRankingError(payload.error ?? 'Unable to load ranking.');
        return;
      }
      setRankingEntries(payload.ranking ?? []);
    } catch {
      setRankingError('Unable to load ranking.');
    } finally {
      setRankingLoading(false);
    }
  };

  const startServerRun = async (state: GameState) => {
    if (!accountRef.current) return;

    try {
      const response = await fetch('/api/run/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedMage: state.selectedMage }),
        cache: 'no-store',
      });
      if (!response.ok) return;
      const payload = await response.json() as { runSessionId?: string };
      runSessionIdRef.current = typeof payload.runSessionId === 'string' ? payload.runSessionId : null;
      syncRef.current.lastPayload = '';
    } catch {
      runSessionIdRef.current = null;
    }
  };

  const persistProgress = async (payloadText: string, force = false) => {
    if (!accountRef.current) return;
    if (syncRef.current.inFlight) {
      syncRef.current.pendingPayload = payloadText;
      syncRef.current.pendingForce = syncRef.current.pendingForce || force;
      return;
    }

    syncRef.current.inFlight = true;
    try {
      const response = await fetch('/api/account/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadText,
        cache: 'no-store',
        keepalive: force,
      });

      if (!response.ok) return;

      const payload = await response.json() as { highScore?: number; highestWave?: number };
      syncRef.current.lastPayload = payloadText;
      const { highScore, highestWave } = payload;
      if (typeof highScore === 'number' && typeof highestWave === 'number') {
        setAccount((current): AccountResponse['user'] => {
          if (!current) return current;
          const next: NonNullable<AccountResponse['user']> = { ...current, highScore, highestWave };
          accountRef.current = next;
          if (stateRef.current) {
            setAuthState(stateRef.current, {
              highScore,
              highestWave,
            });
          }
          return next;
        });
      }
    } catch {
      return;
    } finally {
      syncRef.current.inFlight = false;
      const pendingPayload = syncRef.current.pendingPayload;
      const pendingForce = syncRef.current.pendingForce;
      syncRef.current.pendingPayload = '';
      syncRef.current.pendingForce = false;
      if (pendingPayload && pendingPayload !== syncRef.current.lastPayload) {
        void persistProgress(pendingPayload, pendingForce);
      }
    }
  };

  const maybeSyncProgress = (state: GameState, now: number) => {
    if (!accountRef.current) return;

    const payloadText = buildProgressPayload(createRunSnapshot(state, runSessionIdRef.current));
    const previousStatus = syncRef.current.lastStatus;
    const statusChanged = previousStatus !== state.status;
    syncRef.current.lastStatus = state.status;

    const importantStatusChange = statusChanged && (state.status === 'death' || state.status === 'menu' || previousStatus === 'death');
    if (!importantStatusChange && now - syncRef.current.lastSentAt < 2500) return;
    if (!importantStatusChange && payloadText === syncRef.current.lastPayload) return;

    syncRef.current.lastSentAt = now;
    void persistProgress(payloadText, importantStatusChange);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const state = createGameState();
    stateRef.current = state;
    void fetchAccount(state);

    const input = createInput();
    let lastTime = performance.now();
    let frame = 0;

    const updateMouse = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      input.mouse = {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (dialogRef.current) return;
      if (event.repeat) return;
      const key = event.key.toLowerCase();

      if (key === 'a' || key === 'arrowleft') input.left = true;
      if (key === 'd' || key === 'arrowright') input.right = true;
      if (key === 'w' || key === ' ' || key === 'arrowup') {
        if (!input.jumpHeld) input.jumpPressed = true;
        input.jumpHeld = true;
      }

      handleActionKey(state, event.key);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') input.left = false;
      if (key === 'd' || key === 'arrowright') input.right = false;
      if (key === 'w' || key === ' ' || key === 'arrowup') input.jumpHeld = false;
    };

    const onMouseMove = (event: MouseEvent) => updateMouse(event);

    const onMouseDown = (event: MouseEvent) => {
      if (dialogRef.current) return;
      updateMouse(event);
      input.mouseDown = true;
    };

    const onMouseUp = () => {
      input.mouseDown = false;
      if (betweenUiAwaitingReleaseRef.current) {
        betweenUiAwaitingReleaseRef.current = false;
        betweenUiIgnoreNextClickRef.current = true;
      }
    };

    const onClick = (event: MouseEvent) => {
      if (dialogRef.current) return;
      updateMouse(event);
      if ((state.status === 'between' || state.status === 'ascension') && betweenUiIgnoreNextClickRef.current) {
        betweenUiIgnoreNextClickRef.current = false;
        return;
      }
      handlePointerClick(state, input.mouse);
    };

    const onBeforeUnload = () => {
      if (!accountRef.current || !stateRef.current) return;
      const snapshot = snapshotRef.current ?? createRunSnapshot(stateRef.current, runSessionIdRef.current);
      const payload = buildProgressPayload(snapshot, RUN_ACTIVE_STATUSES.has(snapshot.status) ? snapshot.status : 'menu');
      navigator.sendBeacon('/api/account/progress', new Blob([payload], { type: 'application/json' }));
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('beforeunload', onBeforeUnload);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('click', onClick);

    snapshotRef.current = createRunSnapshot(state, runSessionIdRef.current);

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.033);
      lastTime = time;
      const previousSnapshot = snapshotRef.current ?? createRunSnapshot(state, runSessionIdRef.current);

      updateGameState(state, input, dt);

      if (state.status !== lastStatusRef.current) {
        if (state.status === 'between' || state.status === 'ascension') {
          betweenUiAwaitingReleaseRef.current = input.mouseDown;
          betweenUiIgnoreNextClickRef.current = false;
        } else {
          betweenUiAwaitingReleaseRef.current = false;
          betweenUiIgnoreNextClickRef.current = false;
        }
        lastStatusRef.current = state.status;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      renderGame(context, state);
      canvas.style.cursor = isPointerOnInteractiveUi(state) ? 'pointer' : 'default';
      input.jumpPressed = false;

      const overlay = consumeMenuOverlayRequest(state);
      if (overlay === 'logout') {
        void handleLogout();
      } else if (overlay) {
        openDialog(overlay);
      }

      if (accountRef.current) {
        const enteredFreshRun = previousSnapshot.status === 'menu' && state.status === 'playing';
        const returnedToMenuFromRun = RUN_ACTIVE_STATUSES.has(previousSnapshot.status) && state.status === 'menu';
        const restartedAfterDeath = previousSnapshot.status === 'death' && state.status === 'playing';

        if (restartedAfterDeath) {
          const finalPayload = buildProgressPayload(previousSnapshot, 'death');
          runSessionIdRef.current = null;
          syncRef.current.lastPayload = '';
          void (async () => {
            await persistProgress(finalPayload, true);
            await startServerRun(state);
          })();
        } else if (returnedToMenuFromRun) {
          const finalStatus = previousSnapshot.status === 'death' ? 'death' : 'menu';
          const finalPayload = buildProgressPayload(previousSnapshot, finalStatus);
          runSessionIdRef.current = null;
          syncRef.current.lastPayload = '';
          void persistProgress(finalPayload, true);
        } else if (enteredFreshRun && !runSessionIdRef.current) {
          void startServerRun(state);
        }
      }

      maybeSyncProgress(state, time);
      snapshotRef.current = createRunSnapshot(state, runSessionIdRef.current);
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('beforeunload', onBeforeUnload);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('click', onClick);
      canvas.style.cursor = 'default';
    };
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const payload = await response.json() as AccountResponse & { error?: string };
      if (!response.ok || !payload.authenticated) {
        setAuthError(payload.error ?? 'Unable to login.');
        return;
      }

      applySession(payload);
      setLoginForm(defaultLoginForm());
      closeDialog();
    } catch {
      setAuthError('Unable to login.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm),
      });
      const payload = await response.json() as AccountResponse & { error?: string };
      if (!response.ok || !payload.authenticated) {
        setAuthError(payload.error ?? 'Unable to register.');
        return;
      }

      applySession(payload);
      setRegisterForm(defaultRegistrationForm());
      closeDialog();
    } catch {
      setAuthError('Unable to register.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      return;
    }

    const gameState = stateRef.current;
    if (gameState) {
      applyAccountProgress(gameState, createDefaultAccountProgress());
      setAuthState(gameState, {
        isLoggedIn: false,
        userId: null,
        login: null,
        nickname: null,
        highScore: 0,
        highestWave: 0,
      });
    }
    syncRef.current.lastPayload = '';
    syncRef.current.pendingPayload = '';
    syncRef.current.pendingForce = false;
    runSessionIdRef.current = null;
    snapshotRef.current = null;
    accountRef.current = null;
    setAccount(null);
  };

  const filteredRanking = rankingQuery.trim()
    ? rankingEntries.filter((entry) => {
        const query = rankingQuery.trim().toLowerCase();
        return entry.nickname.toLowerCase().includes(query);
      })
    : rankingEntries;

  return (
    <main className="flex h-screen w-screen items-center justify-center overflow-hidden p-2 sm:p-3">
      <div className="relative flex h-[98vh] w-[98vw] items-center justify-center rounded-[30px] border border-white/10 bg-black/28 p-2 shadow-[0_0_80px_rgba(76,29,149,0.32)] backdrop-blur">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="rounded-[24px] border border-indigo-300/15 bg-slate-950"
          style={{
            width: 'min(96vw, calc(96vh * 16 / 9))',
            height: 'min(96vh, calc(96vw * 9 / 16))',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        />

        {dialog === 'login' && (
          <div className={modalOverlayClass}>
            <div className={`${modalCardClass} max-w-md`}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">Login</h2>
                  <p className="mt-1 text-sm text-slate-400">Use your login or email. After 3 wrong attempts, login is blocked for 5 minutes.</p>
                </div>
                <button type="button" onClick={closeDialog} className={modalButtonClass}>Close</button>
              </div>

              <form className="space-y-4" onSubmit={handleLogin}>
                <label className="block text-sm text-slate-300">
                  Login or email
                  <input
                    className={`${inputClass} mt-2`}
                    value={loginForm.identifier}
                    onChange={(event) => setLoginForm((current) => ({ ...current, identifier: event.target.value }))}
                    autoComplete="username"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  Password
                  <input
                    type="password"
                    className={`${inputClass} mt-2`}
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                    autoComplete="current-password"
                  />
                </label>
                {authError && <p className="text-sm text-rose-300">{authError}</p>}
                <button type="submit" disabled={authSubmitting} className={`${buttonClass} w-full border-indigo-300 bg-[rgba(91,33,182,0.92)] text-white hover:border-indigo-100 hover:bg-[rgba(109,40,217,0.94)] disabled:opacity-60`}>
                  {authSubmitting ? 'Logging in...' : 'Login'}
                </button>
              </form>
            </div>
          </div>
        )}

        {dialog === 'register' && (
          <div className={modalOverlayClass}>
            <div className={`${modalCardClass} max-w-md`}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">Registration</h2>
                  <p className="mt-1 text-sm text-slate-400">Create an account to save souls, unlocked mages, staff ownership, and ranking progress.</p>
                </div>
                <button type="button" onClick={closeDialog} className={modalButtonClass}>Close</button>
              </div>

              <form className="space-y-4" onSubmit={handleRegister}>
                <label className="block text-sm text-slate-300">
                  Email
                  <input
                    type="email"
                    className={`${inputClass} mt-2`}
                    value={registerForm.email}
                    onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                    autoComplete="email"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  Login
                  <input
                    className={`${inputClass} mt-2`}
                    value={registerForm.login}
                    onChange={(event) => setRegisterForm((current) => ({ ...current, login: event.target.value }))}
                    autoComplete="username"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  Password
                  <input
                    type="password"
                    className={`${inputClass} mt-2`}
                    value={registerForm.password}
                    onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                    autoComplete="new-password"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  Nickname
                  <input
                    className={`${inputClass} mt-2`}
                    value={registerForm.nickname}
                    onChange={(event) => setRegisterForm((current) => ({ ...current, nickname: event.target.value }))}
                  />
                </label>
                {authError && <p className="text-sm text-rose-300">{authError}</p>}
                <button type="submit" disabled={authSubmitting} className={`${buttonClass} w-full border-indigo-300 bg-[rgba(91,33,182,0.92)] text-white hover:border-indigo-100 hover:bg-[rgba(109,40,217,0.94)] disabled:opacity-60`}>
                  {authSubmitting ? 'Creating account...' : 'Create account'}
                </button>
              </form>
            </div>
          </div>
        )}

        {dialog === 'ranking' && (
          <div className={modalOverlayClass}>
            <div className={`${modalCardClass} max-w-3xl`}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">Ranking</h2>
                  <p className="mt-1 text-sm text-slate-400">Only logged-in accounts are saved. Ranking is sorted by best score, then highest wave.</p>
                </div>
                <button type="button" onClick={closeDialog} className={modalButtonClass}>Close</button>
              </div>

              <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <input
                  className={`${inputClass} flex-1`}
                  placeholder="Search nickname"
                  value={rankingQuery}
                  onChange={(event) => setRankingQuery(event.target.value)}
                />
                <button type="button" onClick={() => void fetchRanking()} className={`${buttonClass} border-slate-500/60 bg-[rgba(15,23,42,0.94)] text-slate-200 hover:border-slate-200/70`}>
                  Refresh
                </button>
              </div>

              {rankingLoading && <p className="text-sm text-slate-300">Loading ranking...</p>}
              {rankingError && <p className="text-sm text-rose-300">{rankingError}</p>}

              <div className="max-h-[55vh] overflow-auto border border-slate-700/70 bg-slate-950/70">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-900/95 text-slate-300">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Nickname</th>
                      <th className="px-4 py-3">Best Score</th>
                      <th className="px-4 py-3">Best Wave</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRanking.map((entry) => (
                      <tr key={`${entry.nickname}-${entry.rank}`} className="border-t border-slate-800/90 text-slate-200">
                        <td className="px-4 py-3">{entry.rank}</td>
                        <td className="px-4 py-3 font-semibold">{entry.nickname}</td>
                        <td className="px-4 py-3">{entry.highScore}</td>
                        <td className="px-4 py-3">{entry.highestWave}</td>
                      </tr>
                    ))}
                    {!rankingLoading && filteredRanking.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No ranking entries found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
