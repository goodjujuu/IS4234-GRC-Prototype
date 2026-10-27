import Icon from '@/components/Icon';
import { LAYER_STYLES, MODULE_LAYER } from '@/components/nav';
import { MODULES } from '@/lib/format';

// Shared presentational components (usable from server and client components).

export function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function PageHeader({ module, eyebrow, title, description, actions }) {
  const layer = module ? MODULE_LAYER[module] : 'overview';
  const style = LAYER_STYLES[layer];
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium">
          {module && (
            <span className={cx('rounded-md px-2 py-0.5 font-semibold ring-1 ring-inset', style.soft, style.ring)}>{module}</span>
          )}
          <span className={style.text}>{eyebrow || (module ? `${MODULES[module].layer} · ${MODULES[module].name}` : 'Overview')}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children, padded = true, ...rest }) {
  return (
    <div className={cx('rounded-2xl border border-slate-200/80 bg-white shadow-card', padded && 'p-5', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon, actions, className }) {
  return (
    <div className={cx('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Icon name={icon} className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] leading-snug text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

const BADGE_TONES = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  dark: 'bg-slate-900 text-white ring-slate-900',
};

export function Badge({ tone = 'neutral', children, dot = false, className }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
        BADGE_TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

export function ModuleBadge({ module }) {
  const style = LAYER_STYLES[MODULE_LAYER[module]] || LAYER_STYLES.overview;
  return (
    <span className={cx('rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset', style.soft, style.ring)}>{module}</span>
  );
}

export const SEVERITY_TONE = { HIGH: 'red', MEDIUM: 'amber', LOW: 'neutral' };

const BUTTON_VARIANTS = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm',
  secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-500 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm',
  accent: 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
};

export function Button({ variant = 'primary', size = 'md', icon, children, className, type = 'button', ...rest }) {
  const sizes = size === 'sm' ? 'h-8 px-3 text-[13px] gap-1.5' : 'h-10 px-4 text-sm gap-2';
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        sizes,
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
      {children}
    </button>
  );
}

const STAT_TONES = {
  neutral: 'text-slate-900',
  red: 'text-red-600',
  amber: 'text-amber-600',
  green: 'text-emerald-600',
  violet: 'text-violet-600',
};

export function StatCard({ label, value, hint, tone = 'neutral', icon, footer }) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        {icon && <Icon name={icon} className="h-4 w-4 text-slate-400" />}
      </div>
      <p className={cx('mt-2 text-[28px] font-semibold tabular-nums tracking-tight', STAT_TONES[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs leading-snug text-slate-500">{hint}</p>}
      {footer && <div className="mt-3 border-t border-slate-100 pt-3">{footer}</div>}
    </Card>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-slate-700">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500';

export function Callout({ tone = 'neutral', icon, title, children, className }) {
  const tones = {
    neutral: 'bg-slate-50 text-slate-700 ring-slate-200',
    red: 'bg-red-50 text-red-900 ring-red-200',
    amber: 'bg-amber-50 text-amber-900 ring-amber-200',
    green: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
    blue: 'bg-sky-50 text-sky-900 ring-sky-200',
    violet: 'bg-violet-50 text-violet-900 ring-violet-200',
  };
  return (
    <div className={cx('animate-fade-up flex gap-3 rounded-xl p-3.5 text-sm ring-1 ring-inset', tones[tone], className)}>
      {icon && <Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="min-w-0 leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>
      </div>
    </div>
  );
}

// The "staff system" window used on the banker-facing side of a page.
export function SystemWindow({ title, subtitle, right, children, className }) {
  return (
    <div className={cx('overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card', className)}>
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 bg-slate-50/80 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          </span>
          <span className="truncate text-[13px] font-semibold text-slate-700">{title}</span>
          {subtitle && <span className="hidden truncate text-xs text-slate-400 sm:inline">{subtitle}</span>}
        </div>
        {right && <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">{right}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// Presenter-only controls box (clearly separated from banker and customer UIs).
export function PresenterPanel({ children, className }) {
  return (
    <div className={cx('rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/40 p-4', className)}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white">
          <Icon name="play" className="h-3 w-3" />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-indigo-900">Presenter controls</p>
          <p className="text-[11px] text-indigo-700/80">Demo only — not part of any user’s screen.</p>
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function PresenterButton({ children, hint, icon = 'forward', ...rest }) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-left text-[13px] font-medium text-slate-700 ring-1 ring-inset ring-indigo-200 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
      {...rest}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon name={icon} className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
        <span className="truncate">{children}</span>
      </span>
      {hint && <span className="truncate text-[11px] font-normal text-slate-400">{hint}</span>}
    </button>
  );
}

export function SectionLabel({ children, className }) {
  return <p className={cx('mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400', className)}>{children}</p>;
}

export function EmptyState({ icon = 'inbox', title, children }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
      {children && <p className="mt-1 max-w-sm text-[13px] text-slate-500">{children}</p>}
    </div>
  );
}

export function Spinner({ className = 'border-slate-400' }) {
  return <span className={cx('inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-t-transparent', className)} />;
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cx(
            'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition',
            value === t.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={cx('rounded-full px-1.5 text-[11px]', value === t.value ? 'bg-slate-100' : 'bg-slate-200/70')}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name, className }) {
  const initials = (name || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      className={cx(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-[11px] font-semibold text-slate-700',
        className,
      )}
    >
      {initials}
    </span>
  );
}
