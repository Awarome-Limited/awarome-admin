import Link from 'next/link';
import { getAudienceLists } from '../../actions';
import { getPushReach } from '../actions';
import { ScheduleBuilder } from '../_components/schedule-builder';

export default async function NewScheduledPushesPage() {
  const [lists, reach] = await Promise.all([
    getAudienceLists().catch(() => []),
    getPushReach(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px]">
        <Link href="/push-notifications" className="text-muted-foreground transition-colors hover:text-primary">
          Push notifications
        </Link>
        <span className="text-muted-foreground" aria-hidden="true">›</span>
        <Link
          href="/push-notifications/scheduled"
          className="text-muted-foreground transition-colors hover:text-primary"
        >
          Scheduled
        </Link>
        <span className="text-muted-foreground" aria-hidden="true">›</span>
        <span className="font-semibold text-foreground">New</span>
      </nav>

      <div>
        <h1 className="text-[23px] font-bold tracking-tight text-foreground">Schedule pushes</h1>
        <p className="mt-1 max-w-[640px] text-[14px] text-muted-foreground">
          Add pushes one at a time, or upload the CSV template to add many at once. Nothing is
          scheduled until you review the rows and confirm. Times are Lagos time (WAT).
        </p>
      </div>

      <ScheduleBuilder lists={lists.map(({ _id, name }) => ({ _id, name }))} reach={reach} />
    </div>
  );
}
