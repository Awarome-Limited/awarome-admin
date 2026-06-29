import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ApiError } from '@/lib/api-client';
import { ApiErrorCard } from '@/components/api-error-card';
import { ConfirmActionButton } from '@/components/confirm-action-button';
import { AvatarInitials } from '@/components/avatar-initials';
import { formatDate } from '@/lib/format';
import {
  getAudienceList,
  updateAudienceListName,
  replaceAudienceListPhones,
  deleteAudienceList,
} from '../../actions';
import { RenameForm } from './_components/rename-form';
import { ReplaceCSVForm } from './_components/replace-csv-form';

export default async function AudienceListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let list: Awaited<ReturnType<typeof getAudienceList>>;
  try {
    list = await getAudienceList(id);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  async function handleRename(name: string) {
    'use server';
    await updateAudienceListName(id, name);
  }

  async function handleReplacePhones(formData: FormData) {
    'use server';
    await replaceAudienceListPhones(id, formData);
  }

  async function handleDelete() {
    'use server';
    await deleteAudienceList(id);
    redirect('/push-notifications');
  }

  const matchRate =
    list.totalPhones > 0
      ? Math.round((list.matchedCount / list.totalPhones) * 100)
      : 0;

  const stats = [
    {
      label: 'Numbers uploaded',
      value: list.totalPhones.toLocaleString(),
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6 6l.94-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z" />
        </svg>
      ),
    },
    {
      label: 'Matched users',
      value: list.matchedCount.toLocaleString(),
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Match rate',
      value: `${matchRate}%`,
      bar: matchRate,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="M22 4L12 14.01l-3-3" />
        </svg>
      ),
    },
    {
      label: 'Created',
      value: list.createdAt ? formatDate(list.createdAt) : '—',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px]">
        <Link
          href="/push-notifications"
          className="text-muted-foreground transition-colors hover:text-primary"
        >
          Push notifications
        </Link>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span className="font-semibold text-foreground">{list.name}</span>
      </div>

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-brand-tint text-primary">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[23px] font-bold tracking-tight text-foreground">
                {list.name}
              </h1>
              <span className="inline-flex items-center rounded-full bg-brand-tint2 px-2.5 py-[3px] text-[12px] font-semibold text-primary">
                Audience list
              </span>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
              <span className="font-mono text-[12px]">{id}</span>
              <span>·</span>
              <span>Created {list.createdAt ? formatDate(list.createdAt) : '—'}</span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <Link
            href="/push-notifications"
            className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-[10px] border border-border-strong bg-card px-3.5 py-[9px] text-[13px] font-semibold text-foreground-secondary transition-colors hover:bg-muted"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
            Send push
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col gap-[9px] rounded-[14px] border border-border bg-card p-[16px_18px] shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-medium text-muted-foreground">{s.label}</span>
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-brand-tint text-primary">
                {s.icon}
              </span>
            </div>
            <span className="tabular-nums text-[25px] font-bold tracking-tight text-primary">
              {s.value}
            </span>
            {s.bar !== undefined && (
              <div className="mt-[1px] h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${s.bar}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main 2-column grid */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Matched users table */}
        <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex items-center gap-[9px]">
              <span className="text-[15px] font-semibold text-foreground">Matched users</span>
              <span className="rounded-full bg-muted px-[9px] py-0.5 text-[12px] font-semibold tabular-nums text-foreground-secondary">
                {list.matchedCount.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-5 py-[11px] text-left text-[11px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
                    Customer
                  </th>
                  <th className="px-5 py-[11px] text-left text-[11px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
                    Phone
                  </th>
                  <th className="px-5 py-[11px] text-left text-[11px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.users.map((user) => {
                  const fullName =
                    [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';
                  return (
                    <tr
                      key={user._id}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <td className="border-t border-border px-5 py-3">
                        <Link
                          href={`/users/${user._id}`}
                          className="flex items-center gap-[11px] group"
                        >
                          <AvatarInitials name={fullName} size="sm" />
                          <div className="min-w-0">
                            <div className="text-[13.5px] font-semibold text-foreground group-hover:underline whitespace-nowrap">
                              {fullName}
                            </div>
                            <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-muted-foreground">
                              {user.email || '—'}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="border-t border-border px-5 py-3 font-mono text-[12.5px] text-foreground-secondary whitespace-nowrap">
                        {user.phone || '—'}
                      </td>
                      <td className="border-t border-border px-5 py-3 text-[12.5px] tabular-nums text-muted-foreground whitespace-nowrap">
                        {(user as any).createdAt ? formatDate((user as any).createdAt) : '—'}
                      </td>
                    </tr>
                  );
                })}
                {list.users.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-10 text-center text-[13px] text-muted-foreground"
                    >
                      No matched users.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Rename */}
          <div className="rounded-[14px] border border-border bg-card p-[18px_20px] shadow-[var(--shadow-card)]">
            <div className="text-[15px] font-semibold text-foreground">Rename list</div>
            <div className="mb-3.5 mt-1 text-[12.5px] leading-[1.5] text-muted-foreground">
              Update the display name shown across campaigns.
            </div>
            <RenameForm currentName={list.name} action={handleRename} />
          </div>

          {/* Replace phone list */}
          <div className="rounded-[14px] border border-border bg-card p-[18px_20px] shadow-[var(--shadow-card)]">
            <div className="text-[15px] font-semibold text-foreground">Replace phone list</div>
            <div className="mb-3.5 mt-1 text-[12.5px] leading-[1.5] text-muted-foreground">
              Upload a new CSV to replace the current numbers. Matched users are recalculated
              automatically.
            </div>
            <ReplaceCSVForm action={handleReplacePhones} />
          </div>

          {/* Danger zone */}
          <div className="rounded-[14px] border border-destructive/20 bg-card p-[18px_20px] shadow-[var(--shadow-card)]">
            <div className="mb-1 text-[15px] font-semibold text-foreground">Danger zone</div>
            <div className="mb-3.5 text-[12.5px] leading-[1.5] text-muted-foreground">
              Permanently delete this audience list. This cannot be undone.
            </div>
            <ConfirmActionButton
              label="Delete audience list"
              title="Delete this audience list?"
              description="This permanently removes the list. Any scheduled notifications targeting it will no longer have a valid audience."
              action={handleDelete}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
