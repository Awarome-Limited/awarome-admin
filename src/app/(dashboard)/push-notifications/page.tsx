import { broadcastPushNotification } from './actions';
import { ComposeForm } from './_components/compose-form';

export default async function PushNotificationsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[23px] font-bold tracking-tight text-foreground">
          Push notifications
        </h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Broadcast a promotional push notification to your users
        </p>
      </div>

      <div className="max-w-2xl rounded-[14px] border border-border bg-card p-[22px_24px] shadow-[var(--shadow-card)]">
        <div className="mb-5 text-[15px] font-semibold text-foreground">Compose</div>
        <ComposeForm action={broadcastPushNotification} />
      </div>
    </div>
  );
}
