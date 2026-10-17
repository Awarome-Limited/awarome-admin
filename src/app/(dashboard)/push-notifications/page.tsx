import { PageHeader, PageStack } from '@/components/page';
import { getAudienceLists } from './actions';
import { PushNotificationsClient } from './_components/push-notifications-client';
import { PushTabs } from './_components/push-tabs';

export default async function PushNotificationsPage() {
  const audienceLists = await getAudienceLists().catch(() => []);

  return (
    <PageStack>
      <PageHeader
        title="Push notifications"
        subtitle="Broadcast a message to everyone, or target a saved audience list."
        actions={<PushTabs active="send" />}
      />
      <PushNotificationsClient initialLists={audienceLists} />
    </PageStack>
  );
}
