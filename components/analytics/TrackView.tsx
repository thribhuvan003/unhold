'use client';

import { useEffect } from 'react';
import { track, type FunnelEvent } from '@/lib/analytics/events';

/**
 * Fires a single funnel event once on mount, then renders nothing. Lets a
 * server component (e.g. the home page) record a view/step event without
 * becoming a client component itself.
 */
export function TrackView({ event }: { event: FunnelEvent }) {
  useEffect(() => {
    track(event);
  }, [event]);

  return null;
}
