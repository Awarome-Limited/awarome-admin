import { getAudienceLists } from './actions';
import { PushNotificationsClient } from './_components/push-notifications-client';

export default async function PushNotificationsPage() {
  const audienceLists = await getAudienceLists().catch(() => []);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[23px] font-bold tracking-tight text-foreground">
          Push notifications
        </h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Broadcast a message to everyone, or target a saved audience list.
        </p>
      </div>

      <PushNotificationsClient initialLists={audienceLists} />
    </div>
  );
}
