'use server';

import { redirect } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api-client';
import { createSession, deleteSession } from '@/lib/session';
import { StaffRole } from '@/lib/permissions';

export interface LoginState {
  error?: string;
}

interface StaffLoginResponse {
  data: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: StaffRole;
    permissions: string[];
    accessToken: string;
  };
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email')?.toString().trim();
  const password = formData.get('password')?.toString();

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  try {
    const result = await apiFetch<StaffLoginResponse>('/auth/staff/login', {
      method: 'POST',
      body: { email, password },
    });

    const { accessToken, ...profile } = result.data;
    await createSession(accessToken, {
      id: profile._id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: profile.role,
      permissions: profile.permissions,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    return { error: 'Something went wrong. Please try again.' };
  }

  redirect('/');
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}
