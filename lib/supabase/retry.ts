import 'server-only';

interface ReadRetryOptions {
  /** Total attempts, including the first. */
  attempts?: number;
  /** Base delay before the first retry; doubles each subsequent attempt. */
  baseDelayMs?: number;
  /** Return false to stop retrying a given error (e.g. deterministic app errors). */
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Runs a server-side Supabase read, retrying a couple of times on failure.
 *
 * Idempotent reads occasionally fail with a fetch-level network blip
 * (`TypeError: fetch failed`) between the server and PostgREST/Auth. Those are
 * the "brief connection hiccup" the case error page apologizes for — a single
 * quick retry almost always clears them, so a one-off blip never has to surface
 * as an error screen. Deterministic failures (see `shouldRetry`) are re-thrown
 * immediately instead of being retried.
 */
export async function withReadRetry<T>(
  read: () => Promise<T>,
  { attempts = 3, baseDelayMs = 120, shouldRetry = () => true }: ReadRetryOptions = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await read();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts - 1 || !shouldRetry(error)) break;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** attempt));
    }
  }
  throw lastError;
}
