import { redirect } from 'next/navigation';

// Analytics is the dashboard now; old links and bookmarks keep their range.
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  ).toString();
  redirect(query ? `/?${query}` : '/');
}
