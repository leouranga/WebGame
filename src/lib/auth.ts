import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE_NAME = 'space-mage-session';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  userId: string;
  login: string;
  nickname: string;
};

const getSessionSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not configured.');
  return new TextEncoder().encode(secret);
};

export const createSessionToken = async (payload: SessionUser) => new SignJWT(payload)
  .setProtectedHeader({ alg: 'HS256' })
  .setSubject(payload.userId)
  .setIssuedAt()
  .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
  .sign(getSessionSecret());

export const verifySessionToken = async (token: string) => {
  const { payload } = await jwtVerify(token, getSessionSecret());
  if (typeof payload.sub !== 'string' || typeof payload.login !== 'string' || typeof payload.nickname !== 'string') return null;

  return {
    userId: payload.sub,
    login: payload.login,
    nickname: payload.nickname,
  } satisfies SessionUser;
};

export const readSessionFromCookies = async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    return await verifySessionToken(raw);
  } catch {
    return null;
  }
};

export const setSessionCookie = async (session: SessionUser) => {
  const cookieStore = await cookies();
  const token = await createSessionToken(session);
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });
};

export const clearSessionCookie = async () => {
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
};
