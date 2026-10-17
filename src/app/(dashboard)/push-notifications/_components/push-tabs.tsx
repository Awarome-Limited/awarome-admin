import { SegmentedLinks } from '@/components/segmented';

const TABS = [
  { key: 'send', label: 'Send now', href: '/push-notifications' },
  { key: 'scheduled', label: 'Scheduled', href: '/push-notifications/scheduled' },
] as const;

export function PushTabs({ active }: { active: (typeof TABS)[number]['key'] }) {
  return <SegmentedLinks active={active} items={TABS.map((tab) => ({ ...tab }))} />;
}
