import 'server-only';
import { cookies } from 'next/headers';
import { StaffProfile } from '@/lib/permissions';

export const TOKEN_COOKIE = 'awarome_admin_token';
const PROFILE_COOKIE = 'awarome_admin_profile';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
};

export interface Session {
  token: string;
  profile: StaffProfile;
}

export async function createSession(token: string, profile: StaffProfile) {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE, token, cookieOptions);
  cookieStore.set(PROFILE_COOKIE, JSON.stringify(profile), cookieOptions);
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  const profileRaw = cookieStore.get(PROFILE_COOKIE)?.value;

  if (!token || !profileRaw) {
    return null;
  }

  try {
    return { token, profile: JSON.parse(profileRaw) as StaffProfile };
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE);
  cookieStore.delete(PROFILE_COOKIE);
}
