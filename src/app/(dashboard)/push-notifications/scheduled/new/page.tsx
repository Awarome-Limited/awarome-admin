import { PageHeader, PageStack } from '@/components/page';
import { getAudienceLists } from '../../actions';
import { getPushReach } from '../actions';
import { ScheduleBuilder } from '../_components/schedule-builder';

export default async function NewScheduledPushesPage() {
  const [lists, reach] = await Promise.all([
    getAudienceLists().catch(() => []),
    getPushReach(),
  ]);

  return (
    <PageStack>
      <PageHeader
        back={{ href: '/push-notifications/scheduled', label: 'Scheduled pushes' }}
        title="Schedule pushes"
        subtitle="Add pushes one at a time, or upload the CSV template to add many at once. Nothing is scheduled until you review the rows and confirm."
      />
      <ScheduleBuilder lists={lists.map(({ _id, name }) => ({ _id, name }))} reach={reach} />
    </PageStack>
  );
}
