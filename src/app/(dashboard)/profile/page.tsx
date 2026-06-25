import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { AvatarInitials } from '@/components/avatar-initials';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DetailRow } from '@/components/detail-row';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const { profile } = session;
  const fullName = `${profile.firstName} ${profile.lastName}`;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3.5">
        <AvatarInitials name={fullName} size="lg" />
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">{fullName}</h1>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <DetailRow label="Name" value={fullName} />
          <DetailRow label="Email" value={profile.email} />
          <DetailRow
            label="Role"
            value={<Badge variant="outline">{profile.role.replace('_', ' ')}</Badge>}
          />
          <DetailRow
            label="Permissions"
            value={
              profile.permissions.includes('*') ? (
                <span className="text-muted-foreground">Full access (super admin)</span>
              ) : (
                <span className="text-muted-foreground">
                  {profile.permissions.length} grant{profile.permissions.length !== 1 ? 's' : ''}
                </span>
              )
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
