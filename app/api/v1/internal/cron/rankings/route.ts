import type { NextRequest } from 'next/server';
import { authorizeCronJob } from '@/lib/api/cron-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ApiError } from '@/lib/api/errors';
import { getRequestId, handleRouteError, jsonSuccess } from '@/lib/api/response';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const { bucket, lockAcquired } = await authorizeCronJob(request, 'rankings', {
      lockTtlSeconds: 3600,
    });

    if (!lockAcquired) {
      return jsonSuccess({ skipped: true, reason: 'concurrent_cron', bucket, request_id: requestId });
    }

    const admin = createAdminClient();
    const { data: banks, error: banksError } = await admin
      .from('banks')
      .select('id')
      .eq('is_active', true);

    if (banksError) {
      throw new ApiError(500, 'internal_error', `Failed to load active banks: ${banksError.message}`);
    }

    let refreshed = 0;
    const bankErrors: { bank_id: string; message: string }[] = [];

    for (const bank of banks ?? []) {
      const { error } = await admin.rpc('refresh_bank_score_snapshot', { p_bank_id: bank.id });
      if (error) {
        bankErrors.push({ bank_id: bank.id, message: error.message });
      } else {
        refreshed += 1;
      }
    }

    if (banks && banks.length > 0 && refreshed === 0) {
      throw new ApiError(500, 'internal_error', 'All bank score snapshots failed to refresh');
    }

    const { error: mvError } = await admin.rpc('refresh_leaderboard_mv');

    return jsonSuccess({
      bucket,
      refreshed,
      bank_errors: bankErrors,
      leaderboard_refreshed: !mvError,
      leaderboard_error: mvError?.message ?? null,
      request_id: requestId,
    });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export const GET = POST;
