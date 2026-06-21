import 'server-only';

import type { NextRequest } from 'next/server';
import { ApiError } from '@/lib/api/errors';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/supabase/database.types';

export type OperatorRole = Extract<
  Database['public']['Enums']['user_role'],
  'operator' | 'admin'
>;

export type OperatorContext = {
  userId: string;
  role: OperatorRole;
  email?: string;
};

const OPERATOR_ROLES: OperatorRole[] = ['operator', 'admin'];

/**
 * Validate Supabase JWT and require operator or admin profile role.
 */
export async function requireOperator(request: NextRequest): Promise<OperatorContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ApiError(401, 'unauthorized', 'Operator authentication required');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, email')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new ApiError(403, 'forbidden', 'Operator profile not found');
  }

  if (!OPERATOR_ROLES.includes(profile.role as OperatorRole)) {
    throw new ApiError(403, 'forbidden', 'Operator JWT required');
  }

  return {
    userId: user.id,
    role: profile.role as OperatorRole,
    email: profile.email ?? undefined,
  };
}