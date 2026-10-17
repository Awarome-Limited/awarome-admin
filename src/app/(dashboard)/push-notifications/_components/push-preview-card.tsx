import type { ReactNode } from 'react';
import { AwaromeMark } from '@/components/awarome-mark';

/** A notification as it lands on a phone's lock screen. */
export function PushPreviewCard({
  title,
  body,
  when = 'now',
}: {
  title: string;
  body: string;
  when?: string;
}) {
  return (
    <div className="flex gap-3 rounded-[16px] bg-white/95 p-3.5 text-[#1A1A1A] shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-[#FFD500]">
        <AwaromeMark className="h-[19px] w-[18px] [&_path]:fill-[#120460]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center justify-between gap-2 text-[11.5px] tracking-[0.04em] text-[#6E6E6E]">
          <span>AWAROME</span>
          <span>{when}</span>
        </div>
        <div className="text-[14px] leading-[1.35] font-semibold break-words">
          {title || <span className="font-normal text-[#6E6E6E]">Your title</span>}
        </div>
        <div className="mt-0.5 text-[13.5px] leading-[1.4] break-words text-[rgba(26,26,26,.75)]">
          {body || <span className="text-[#6E6E6E]">Your message</span>}
        </div>
      </div>
    </div>
  );
}

/** The indigo lock screen the preview sits on. */
export function LockScreen({ children }: { children: ReactNode }) {
  const now = new Date();
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);
  return (
    <div className="flex flex-col gap-[18px] rounded-[24px] bg-[#120460] px-[18px] pt-7 pb-10">
      <div className="flex flex-col gap-0.5 text-center text-white">
        <span className="text-[52px] leading-none font-light tracking-[-0.03em] tabular-nums" suppressHydrationWarning>
          {time}
        </span>
        <span className="text-[13px] opacity-75" suppressHydrationWarning>
          {date}
        </span>
      </div>
      {children}
    </div>
  );
}
