import type { AdminRider, RiderPosition } from '@/lib/types';

/** The rider's stored GeoJSON point as {lat, long}, or null if there is none. */
export function riderPosition(rider: AdminRider): RiderPosition | null {
  const [long, lat] = rider.location?.coordinates ?? [];
  if (typeof lat !== 'number' || typeof long !== 'number') return null;
  // [0, 0] is a default, not a place a rider has been.
  if (lat === 0 && long === 0) return null;
  return { lat, long, at: rider.lastLocationAt, status: rider.status };
}
