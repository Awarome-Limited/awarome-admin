'use client';

import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { ExternalLinkIcon, MapPinOffIcon, RefreshCwIcon } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RiderPosition } from '@/lib/types';

/** The rider app reports about every 20 s while it is open; poll to match. */
const POLL_MS = 20_000;
/** Past this, the dot is where the rider was, not where they are. */
const STALE_MS = 10 * 60_000;

// Free OpenStreetMap tiles: no key and no bill. Their usage policy asks for
// the attribution below and light use, which an ops screen easily is.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

function ago(at: string | undefined, now: number) {
  if (!at) return 'at an unknown time';
  const seconds = Math.max(0, Math.round((now - new Date(at).getTime()) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return new Date(at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function markerHtml(stale: boolean) {
  const color = stale ? 'var(--muted-foreground)' : 'var(--primary)';
  return `<span class="rider-dot${stale ? '' : ' rider-dot-live'}" style="--dot:${color}"></span>`;
}

/**
 * Where the rider app last said the rider is, on a free OpenStreetMap map,
 * refreshed while the page is open. The app only reports while it is
 * running, so the age of the fix is always shown beside it.
 */
export function RiderLocationMap({
  initial,
  load,
}: {
  initial: RiderPosition | null;
  load: () => Promise<RiderPosition | null>;
}) {
  const [position, setPosition] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [isRefreshing, startRefresh] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);

  const stale = !position?.at || now - new Date(position.at).getTime() > STALE_MS;

  const refresh = useCallback(() => {
    startRefresh(async () => {
      const next = await load();
      if (next) setPosition(next);
      setNow(Date.now());
    });
  }, [load]);

  // Poll only while someone is looking at the tab.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const timer = setInterval(tick, POLL_MS);
    const clock = setInterval(() => setNow(Date.now()), 15_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      clearInterval(clock);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [refresh]);

  const hasPosition = !!position;

  // Leaflet touches `window`, so it is loaded in the browser only.
  useEffect(() => {
    if (!hasPosition || !containerRef.current || mapRef.current) return;
    let cancelled = false;
    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current || !position) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
        [position.lat, position.long],
        15
      );
      L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
      markerRef.current = L.marker([position.lat, position.long], {
        icon: L.divIcon({ className: '', html: markerHtml(stale), iconSize: [22, 22], iconAnchor: [11, 11] }),
        keyboard: false,
      }).addTo(map);
      mapRef.current = map;
    });
    return () => {
      cancelled = true;
    };
    // Built once; later fixes move the marker in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPosition]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!L || !map || !marker || !position) return;
    marker.setLatLng([position.lat, position.long]);
    marker.setIcon(L.divIcon({ className: '', html: markerHtml(stale), iconSize: [22, 22], iconAnchor: [11, 11] }));
    if (!map.getBounds().pad(-0.2).contains([position.lat, position.long])) {
      map.panTo([position.lat, position.long]);
    }
  }, [position, stale]);

  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
    },
    []
  );

  if (!position) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[12px] border border-dashed border-border px-4 py-10 text-center">
        <MapPinOffIcon className="size-6 text-muted-foreground" />
        <p className="text-[13px] font-semibold text-foreground">No location yet</p>
        <p className="max-w-sm text-[12.5px] text-muted-foreground">
          The rider app hasn’t reported a position. It does once they open the app with location turned on.
        </p>
        <Button size="sm" variant="outline" onClick={refresh} disabled={isRefreshing}>
          <RefreshCwIcon data-icon="inline-start" className={cn(isRefreshing && 'animate-spin')} />
          Check again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[13px]">
          <span
            className={cn(
              'size-2 rounded-full',
              stale ? 'bg-muted-foreground/60' : 'animate-pulse bg-positive'
            )}
          />
          <span className="text-foreground-secondary">
            Last reported <span className="font-semibold text-foreground">{ago(position.at, now)}</span>
          </span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={refresh} disabled={isRefreshing}>
            <RefreshCwIcon data-icon="inline-start" className={cn(isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${position.lat},${position.long}`}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ size: 'sm', variant: 'outline' })}
          >
            <ExternalLinkIcon data-icon="inline-start" />
            Open in Google Maps
          </a>
        </div>
      </div>

      {stale && (
        <p className="rounded-[10px] bg-warning-bg px-3 py-2 text-[12.5px] text-foreground">
          This may not be where they are now. The app only reports while it’s open
          {position.status && position.status !== 'online' ? `, and they’re ${position.status}` : ''}.
        </p>
      )}

      <div
        ref={containerRef}
        className="rider-map isolate h-[320px] w-full overflow-hidden rounded-[12px] border border-border bg-muted"
        aria-label="Rider location map"
      />
    </div>
  );
}
