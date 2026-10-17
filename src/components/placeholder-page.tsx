import { EmptyState, PageHeader, PageStack } from '@/components/page';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <PageStack>
      <PageHeader title={title} />
      <section className="rounded-[10px] border border-border bg-card">
        <EmptyState
          title="Coming soon"
          body="This module ships in a later phase of the admin tool build-out."
        />
      </section>
    </PageStack>
  );
}
