import type { ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, ChevronRight } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/**
 * Page-pattern building blocks from DESIGN.md §4–5. Every screen is built from
 * these so list, detail, settings and compose pages read the same way.
 */

/** "← All riders". Sits above a detail page's identity row. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1.5 text-[13.5px] font-medium text-foreground-secondary transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      {label}
    </Link>
  );
}

/** Title + one plain sentence on the left, the page's one primary action on the right. */
export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col gap-4">
      {back && <BackLink {...back} />}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle max-w-[72ch]">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
    </div>
  );
}

/** The vertical rhythm of a page: 28px between sections. */
export function PageStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-7', className)}>{children}</div>;
}

/** Table card: toolbar inside the card, rows edge to edge, footer under a hairline. */
export function ListCard({
  toolbar,
  title,
  description,
  aside,
  footer,
  children,
  className,
}: {
  toolbar?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('overflow-hidden rounded-[10px] border border-border bg-card', className)}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-[18px]">
          <div className="min-w-0">
            <h3 className="text-[17px] leading-tight font-bold">{title}</h3>
            {description && (
              <p className="mt-1 text-[13.5px] text-foreground-secondary">{description}</p>
            )}
          </div>
          {aside}
        </div>
      )}
      {toolbar && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3.5">
          {toolbar}
        </div>
      )}
      <div className="overflow-x-auto">{children}</div>
      {footer && <div className="border-t border-border px-6 py-3.5">{footer}</div>}
    </section>
  );
}

/** Pushes the search (or anything after it) to the right end of a toolbar. */
export function ToolbarEnd({ children }: { children: ReactNode }) {
  return <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">{children}</div>;
}

/** Centred Bricolage title plus one line saying what to do. */
export function EmptyState({ title, body }: { title: string; body?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="font-heading text-[18px] font-bold tracking-[-0.03em]">{title}</span>
      {body && <span className="max-w-[48ch] text-[14px] text-foreground-secondary">{body}</span>}
    </div>
  );
}

/** EmptyState inside a table body. */
export function EmptyRow({ colSpan, title, body }: { colSpan: number; title: string; body?: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="p-0">
        <EmptyState title={title} body={body} />
      </TableCell>
    </TableRow>
  );
}

/**
 * Makes a whole table row open a detail page. Put it in the first cell; the
 * row needs `className="relative"`. Other links/buttons in the row need
 * `relative z-10` to stay clickable.
 */
export function RowLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn('font-medium text-foreground after:absolute after:inset-0', className)}>
      {children}
    </Link>
  );
}

/** The chevron in the last column of a row that opens a detail page. */
export function RowChevron() {
  return <ChevronRight className="ml-auto size-4 text-muted-foreground" />;
}

/** Orange bar naming the entity and its consequence, with a text action on the right. */
export function InlineNotice({
  children,
  action,
  tone = 'warning',
}: {
  children: ReactNode;
  action?: ReactNode;
  tone?: 'warning' | 'info';
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-[8px] px-4 py-3 text-[13.5px] text-foreground',
        tone === 'warning' ? 'bg-warning-bg' : 'bg-brand-tint'
      )}
    >
      <AlertTriangle
        className={cn('size-4 shrink-0', tone === 'warning' ? 'text-warning' : 'text-primary')}
      />
      <span className="min-w-0 flex-1">{children}</span>
      {action && <span className="font-medium text-primary">{action}</span>}
    </div>
  );
}

/** A card with a Bricolage title, an optional plain-language description and a right-side slot. */
export function Panel({
  title,
  description,
  aside,
  children,
  flush = false,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  /** Children run edge to edge (tables) instead of sitting in the padding. */
  flush?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-[10px] border border-border bg-card',
        !flush && 'gap-[18px] px-6 py-[22px]',
        className
      )}
    >
      {(title || aside) && (
        <div
          className={cn(
            'flex flex-wrap items-start justify-between gap-x-4 gap-y-2',
            flush && 'border-b border-border px-6 py-[18px]'
          )}
        >
          <div className="min-w-0">
            {title && <h3 className="text-[17px] leading-tight font-bold">{title}</h3>}
            {description && (
              <p className="mt-1 max-w-[640px] text-[13.5px] leading-[1.55] text-foreground-secondary">
                {description}
              </p>
            )}
          </div>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export interface Fact {
  label: string;
  value: ReactNode;
}

/** Profile facts: label above value, one per row. */
export function FactList({ facts, columns = 1 }: { facts: Fact[]; columns?: 1 | 2 }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', columns === 2 && 'sm:grid-cols-2')}>
      {facts.map((fact) => (
        <div key={fact.label} className="flex min-w-0 flex-col gap-[3px]">
          <dt className="text-[12.5px] text-muted-foreground">{fact.label}</dt>
          <dd className="text-[14px] break-words tabular-nums">{fact.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Detail-page identity row: avatar (optional), Bricolage name, status pill
 * and the key facts in a meta line; actions on the right.
 */
export function DetailHeader({
  back,
  avatar,
  title,
  status,
  meta,
  actions,
}: {
  back?: { href: string; label: string };
  avatar?: ReactNode;
  title: ReactNode;
  status?: ReactNode;
  meta?: ReactNode[];
  actions?: ReactNode;
}) {
  const metaItems = (meta ?? []).filter((m) => m !== null && m !== undefined && m !== false && m !== '');
  return (
    <div className="flex flex-col gap-5">
      {back && <BackLink {...back} />}
      <div className="flex flex-wrap items-center gap-5">
        {avatar}
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="font-heading text-[28px] leading-[1.05] font-bold tracking-[-0.04em] break-words lg:text-[34px]">
            {title}
          </h1>
          {(status || metaItems.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 text-[13.5px] text-foreground-secondary">
              {status}
              {metaItems.map((item, i) => (
                <span key={i} className="flex items-center gap-2">
                  {(i > 0 || status) && <span aria-hidden>·</span>}
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5 sm:ml-auto">{actions}</div>}
      </div>
    </div>
  );
}

export interface StatCardData {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  /** Progress against a limit, 0–1. Over 1 renders in red. */
  progress?: number;
}

/** Four stat cards for an entity's numbers (detail pages). */
export function StatCards({ stats }: { stats: StatCardData[] }) {
  return (
    <section className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex min-w-0 flex-col gap-2 rounded-[10px] border border-border bg-card px-5 py-[18px]"
        >
          <span className="text-[13px] text-muted-foreground">{stat.label}</span>
          <span className="stat-value truncate text-[28px] leading-none">{stat.value}</span>
          {stat.progress !== undefined && (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full', stat.progress > 1 ? 'bg-destructive' : 'bg-warning')}
                style={{ width: `${Math.min(stat.progress, 1) * 100}%` }}
              />
            </div>
          )}
          {stat.meta && <span className="text-[12.5px] text-muted-foreground">{stat.meta}</span>}
        </div>
      ))}
    </section>
  );
}

/** Settings page: a column of concern cards, and a sticky 320px consequence panel. */
export function SettingsLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  if (!aside) return <div className="flex min-w-0 flex-col gap-4">{children}</div>;
  return (
    <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
      <aside className="flex flex-col gap-4 lg:sticky lg:top-6">{aside}</aside>
    </section>
  );
}

/** Fields laid out `auto-fit, minmax(180px, 1fr)`. */
export function FieldGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-4 gap-y-[18px]', className)}>
      {children}
    </div>
  );
}

/** Label above, input below, help text under it. */
export function Field({
  label,
  help,
  children,
  htmlFor,
}: {
  label: ReactNode;
  help?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={htmlFor} className="text-[13.5px] font-medium">
        {label}
      </label>
      {children}
      {help && <span className="text-[12.5px] text-muted-foreground">{help}</span>}
    </div>
  );
}

/** Label-value rows for consequence panels and summaries. */
export function SummaryRows({ rows }: { rows: { label: ReactNode; value: ReactNode; tone?: 'warning' | 'muted' }[] }) {
  return (
    <div className="flex flex-col gap-2 text-[13.5px]">
      {rows.map((row, i) => (
        <div
          key={i}
          className={cn(
            'flex items-baseline justify-between gap-4',
            row.tone === 'warning' ? 'text-warning' : 'text-foreground-secondary'
          )}
        >
          <span>{row.label}</span>
          <span className="font-medium text-foreground tabular-nums">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
