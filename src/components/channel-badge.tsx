import { Badge } from '@/components/ui/badge';
import { Channel, CHANNEL_LABELS } from '@/lib/types';

/**
 * Which surface a job came from.
 *
 * API traffic is the one worth spotting at a glance — those jobs belong to a
 * partner rather than a customer, and behave differently (no app user, often
 * no handover PIN), so it carries the accent while the app surfaces stay
 * quiet.
 */
export function ChannelBadge({ channel }: { channel?: Channel }) {
  // Anything recorded before channels existed came from the app.
  const resolved: Channel = channel ?? 'mobile';

  return (
    <Badge variant={resolved === 'api' ? 'info' : 'secondary'}>
      {CHANNEL_LABELS[resolved] ?? resolved}
    </Badge>
  );
}
