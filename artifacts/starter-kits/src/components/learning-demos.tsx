import { useState, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { forecast, detectRecurring, reconcile } from '@/data/learning-engines.mjs';
import { decimalToMinor } from '@/data/sample-helpers.mjs';
import { runwayFixture, recurringFixture, reconciliationFixture } from '@/data/learning-fixtures';
import { cn } from '@/lib/utils';

const inputCls = 'w-full bg-background border border-input rounded-xl px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring';

/** Parse a major-unit rand string into exact integer cents without float multiplication. */
export function toMinor(v: string, opts: { allowZero?: boolean } = {}): { minor?: number; err?: string } {
  const s = v.trim();
  if (s === '') return { err: 'Required' };
  if (s.startsWith('-')) return { err: 'Cannot be negative' };
  const m = /^(\d+)(?:\.(\d{0,2}))?$/.exec(s);
  if (!m) return { err: 'Enter an amount like 1250.50 (max 2 decimals)' };
  const minor = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(minor)) return { err: 'Amount is too large' };
  if (minor === 0 && !opts.allowZero) return { err: 'Must be more than zero' };
  return { minor };
}

function fmt(minor: number) {
  const neg = minor < 0;
  const a = Math.abs(minor);
  const rands = Math.floor(a / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${neg ? '-' : ''}R ${rands}.${String(a % 100).padStart(2, '0')}`;
}

function Field({ id, label, value, onChange, error, hint, type = 'text' }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string; type?: string }) {
  return (
    <label className="block text-sm" htmlFor={`f-${id}`}>
      <span className="font-medium">{label}</span>
      <input id={`f-${id}`} type={type} inputMode={type === 'text' ? 'decimal' : undefined} value={value} onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error} aria-describedby={error ? `e-${id}` : undefined}
        className={cn(inputCls, 'mt-1', error && 'border-destructive')} data-testid={`input-${id}`} />
      {hint && !error && <span className="text-xs text-muted-foreground mt-1 block">{hint}</span>}
      {error && <span id={`e-${id}`} className="text-xs text-destructive mt-1 block" data-testid={`error-${id}`}>{error}</span>}
    </label>
  );
}

function Footer({ date, onReset, note }: { date: string; onReset: () => void; note: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
      <p className="text-xs text-muted-foreground max-w-prose">Fictional fixture as of <span className="font-mono">{date}</span>. Runs offline in your browser; no bank connection. {note}</p>
      <button type="button" onClick={onReset} className="press inline-flex items-center gap-1.5 text-xs border rounded-xl px-3 py-1.5 hover:bg-secondary" data-testid="button-reset-demo">
        <RotateCcw className="w-3 h-3" /> Reset to fixture
      </button>
    </div>
  );
}

function Pill({ tone, children }: { tone: 'ok' | 'warn' | 'bad' | 'muted'; children: ReactNode }) {
  const t = { ok: 'border-primary/40 text-primary bg-primary/5', warn: 'border-accent text-foreground bg-accent/10', bad: 'border-destructive/50 text-destructive bg-destructive/5', muted: 'border-dashed text-muted-foreground' }[tone];
  return <span className={cn('inline-block text-[10px] uppercase tracking-wide font-semibold border rounded-xl px-1.5 py-0.5 font-mono', t)}>{children}</span>;
}

function EngineError({ msg }: { msg: string }) {
  return <p role="alert" className="text-sm text-destructive" data-testid="text-engine-error">{msg}</p>;
}

function run<T>(fn: () => T): { v?: T; err?: string } {
  try { return { v: fn() }; } catch (e) { return { err: e instanceof Error ? e.message : 'Could not compute.' }; }
}

const majorStr = (minor: number) => (minor / 100).toFixed(2);

/* ---------------- Runway ---------------- */
export function RunwayDemo() {
  const f = runwayFixture;
  const init = {
    start: majorStr(decimalToMinor(f.balance.data.currentBalance)),
    daily: majorStr(decimalToMinor(f.dailySpend)),
    purchase: majorStr(decimalToMinor(f.purchase.amount)),
    date: f.purchase.date,
  };
  const [s, setS] = useState(init);
  const set = (k: keyof typeof init) => (v: string) => setS((p) => ({ ...p, [k]: v }));
  const start = toMinor(s.start, { allowZero: true });
  const daily = toMinor(s.daily, { allowZero: true });
  const purchase = toMinor(s.purchase, { allowZero: true });
  const lastDay = new Date(Date.parse(`${f.startDate}T00:00:00Z`) + 29 * 86400000).toISOString().slice(0, 10);
  const dateErr = !s.date ? 'Required' : s.date < f.startDate || s.date > lastDay ? `Pick a date from ${f.startDate} to ${lastDay}` : undefined;
  const ok = start.minor !== undefined && daily.minor !== undefined && purchase.minor !== undefined && !dateErr;
  const withInputs = (purchaseAmount: number) => ({
    ...f,
    balance: { ...f.balance, data: { ...f.balance.data, currentBalance: start.minor! / 100 } },
    dailySpend: daily.minor! / 100,
    purchase: { amount: purchaseAmount / 100, date: s.date },
  });
  const base = ok ? run(() => forecast(withInputs(0))) : null;
  const scen = ok ? run(() => forecast(withInputs(purchase.minor!))) : null;
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field id="runway-start" label="Starting balance (R)" value={s.start} onChange={set('start')} error={start.err} />
        <Field id="runway-daily" label="Daily spend (R)" value={s.daily} onChange={set('daily')} error={daily.err} />
        <Field id="runway-purchase" label="What-if purchase (R)" value={s.purchase} onChange={set('purchase')} error={purchase.err} hint="Try 5000.00 to see a shortfall; 0 means no purchase" />
        <Field id="runway-date" type="date" label="Purchase date" value={s.date} onChange={set('date')} error={dateErr} />
      </div>
      <div className="text-xs text-muted-foreground">
        Fixed events: {f.events.map((e) => `${e.id} ${e.kind === 'income' ? '+' : '-'}${fmt(decimalToMinor(e.amount))} on ${e.date}`).join('; ')}.
      </div>
      {!ok ? <p className="text-sm text-destructive" data-testid="text-demo-invalid">Fix the highlighted fields to see a forecast.</p>
        : base?.err || scen?.err ? <EngineError msg={(base?.err ?? scen?.err)!} />
        : base?.v && scen?.v && (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              {([['Baseline (no purchase)', base.v], ['With purchase', scen.v]] as const).map(([name, r]) => (
                <div key={name} className="border rounded-xl p-3 bg-background" data-testid={`summary-${name.startsWith('B') ? 'baseline' : 'scenario'}`}>
                  <div className="text-xs text-muted-foreground font-mono">{name}</div>
                  <dl className="mt-1 text-sm space-y-1">
                    <div className="flex justify-between gap-2"><dt>Lowest closing</dt><dd className={cn('font-mono font-semibold', r.lowestMinor < 0 && 'text-destructive')}>{fmt(r.lowestMinor)}</dd></div>
                    <div className="flex justify-between gap-2"><dt>On</dt><dd className="font-mono">{r.lowestDate}</dd></div>
                    <div className="flex justify-between gap-2"><dt>First shortfall</dt><dd>{r.firstShortfall ? <span className="font-mono text-destructive">{r.firstShortfall}</span> : <Pill tone="ok">none</Pill>}</dd></div>
                  </dl>
                </div>
              ))}
            </div>
            <details className="border rounded-xl bg-background">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium" data-testid="toggle-runway-days">Show all 30 days (with purchase)</summary>
              <div className="overflow-x-auto max-h-80 overflow-y-auto" role="region" aria-label="30-day forecast results" tabIndex={0}>
                <table className="w-full text-xs font-mono">
                  <thead className="text-muted-foreground sticky top-0 bg-background"><tr>{['Date', 'Opening', 'Income', 'Bills', 'Spend', 'Purchase', 'Closing'].map((h) => <th key={h} scope="col" className="text-left px-2 py-1 font-semibold">{h}</th>)}</tr></thead>
                  <tbody>
                    {scen.v.days.map((d) => (
                      <tr key={d.date} className={cn('border-t', d.closingMinor < 0 && 'text-destructive')}>
                        <th scope="row" className="text-left px-2 py-1 font-normal whitespace-nowrap">{d.date}</th>
                        <td className="px-2 py-1 whitespace-nowrap">{fmt(d.openingMinor)}</td>
                        <td className="px-2 py-1 whitespace-nowrap">{d.incomeMinor ? fmt(d.incomeMinor) : '-'}</td>
                        <td className="px-2 py-1 whitespace-nowrap">{d.billsMinor ? fmt(d.billsMinor) : '-'}</td>
                        <td className="px-2 py-1 whitespace-nowrap">{fmt(d.dailySpendMinor)}</td>
                        <td className="px-2 py-1 whitespace-nowrap">{d.purchaseMinor ? fmt(d.purchaseMinor) : '-'}</td>
                        <td className="px-2 py-1 whitespace-nowrap font-semibold">{fmt(d.closingMinor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      <Footer date={f.startDate} onReset={() => setS(init)} note="A forecast, not a prediction: real spending varies." />
    </div>
  );
}

/* ---------------- Recurring ---------------- */
export function RecurringDemo() {
  const f = recurringFixture;
  const lastGym = f.transactions.data.transactions.find((t) => t.uuid === 'gym-2')!;
  const init = { gym: majorStr(decimalToMinor(lastGym.amount)), excludePending: false };
  const [s, setS] = useState(init);
  const gym = toMinor(s.gym);
  const res = gym.minor !== undefined ? run(() => detectRecurring({
    ...f,
    transactions: {
      ...f.transactions,
      data: {
        ...f.transactions.data,
        transactions: f.transactions.data.transactions
          .filter((t) => !(s.excludePending && t.status === 'PENDING'))
          .map((t) => (t.uuid === 'gym-2' ? { ...t, amount: gym.minor! / 100 } : t)),
      },
    },
  })) : null;
  const likely = res?.v?.results.filter((r) => r.likely) ?? [];
  const not = res?.v?.results.filter((r) => !r.likely) ?? [];
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3 items-start">
        <Field id="recurring-gym" label={`Last Demo Gym payment, ${lastGym.postingDate} (R)`} value={s.gym} onChange={(v) => setS((p) => ({ ...p, gym: v }))} error={gym.err} hint="Try 650.00 to break the 10% stability rule" />
        <label className="flex items-center gap-2 text-sm sm:mt-7">
          <input type="checkbox" checked={s.excludePending} onChange={(e) => setS((p) => ({ ...p, excludePending: e.target.checked }))} className="w-4 h-4 accent-[hsl(var(--primary))]" data-testid="checkbox-exclude-pending" />
          Remove pending rows before detection
        </label>
      </div>
      {gym.err ? <p className="text-sm text-destructive" data-testid="text-demo-invalid">Fix the highlighted field to run detection.</p>
        : res?.err ? <EngineError msg={res.err} />
        : res?.v && (
          <>
            <p className="text-xs text-muted-foreground" data-testid="text-ignored">{res.v.ignored} row(s) ignored (pending, credits or after {f.asOf}).</p>
            <div className="grid md:grid-cols-2 gap-4">
              {([['Likely recurring', likely, 'ok'], ['Not likely recurring', not, 'muted']] as const).map(([title, list, tone]) => (
                <section key={title} aria-label={title}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title} ({list.length})</h3>
                  {list.length === 0 ? <p className="text-sm text-muted-foreground border border-dashed rounded-xl p-3">None in this scenario.</p> : (
                    <ul className="space-y-2">
                      {list.map((r) => (
                        <li key={r.merchant} className="border rounded-xl p-3 bg-background text-sm" data-testid={`recurring-${r.merchant.replace(/\s+/g, '-').toLowerCase()}`}>
                          <div className="flex justify-between gap-2 flex-wrap"><span className="font-medium">{r.merchant}</span><Pill tone={tone}>{r.observations} seen</Pill></div>
                          <div className="font-mono text-xs mt-1">Typical {fmt(r.typicalMinor)}</div>
                          {r.estimatedNextDate && (
                            <div className="text-xs mt-1">Estimated next: <span className="font-mono">{r.estimatedNextDate}</span>{r.estimatedNextDate < f.asOf && <span className="text-muted-foreground"> (already before {f.asOf})</span>} <span className="text-muted-foreground">- estimate, not an actual bill</span></div>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">{r.reason}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </>
        )}
      <Footer date={f.asOf} onReset={() => setS(init)} note="Detection is a heuristic; merchants are normalised by trimming and case." />
    </div>
  );
}

/* ---------------- Reconciliation ---------------- */
export function ReconciliationDemo() {
  const f = reconciliationFixture;
  const p2 = f.transactions.data.transactions.find((p) => p.uuid === 'pay-2')!;
  const p3 = f.transactions.data.transactions.find((p) => p.uuid === 'pay-3')!;
  const init = { amt: majorStr(decimalToMinor(p2.amount)), ref: p3.description };
  const [s, setS] = useState(init);
  const amt = toMinor(s.amt);
  const refErr = s.ref.trim() === '' ? 'Required' : undefined;
  const ok = amt.minor !== undefined && !refErr;
  const res = ok ? run(() => reconcile({
    ...f,
    transactions: {
      ...f.transactions,
      data: {
        ...f.transactions.data,
        transactions: f.transactions.data.transactions.map((p) =>
          p.uuid === 'pay-2' ? { ...p, amount: amt.minor! / 100 }
            : p.uuid === 'pay-3' ? { ...p, description: s.ref }
              : p),
      },
    },
  })) : null;
  const tone = { paid: 'ok', partial: 'warn', unpaid: 'bad' } as const;
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field id="recon-pay2" label={`Description ${p2.description} amount (R)`} value={s.amt} onChange={(v) => setS((p) => ({ ...p, amt: v }))} error={amt.err} hint="Try 3000.00 to fully pay WEB-102" />
        <label className="block text-sm" htmlFor="f-recon-ref">
          <span className="font-medium">Reference on the unknown payment</span>
          <input id="f-recon-ref" value={s.ref} onChange={(e) => setS((p) => ({ ...p, ref: e.target.value }))} aria-invalid={!!refErr}
            className={cn(inputCls, 'mt-1', refErr && 'border-destructive')} data-testid="input-recon-ref" />
          {refErr ? <span className="text-xs text-destructive mt-1 block" data-testid="error-recon-ref">{refErr}</span>
            : <span className="text-xs text-muted-foreground mt-1 block">Try COPY-103 or SHARED</span>}
        </label>
      </div>
      {!ok ? <p className="text-sm text-destructive" data-testid="text-demo-invalid">Fix the highlighted fields to reconcile.</p>
        : res?.err ? <EngineError msg={res.err} />
        : res?.v && (
          <>
            <div className="overflow-x-auto border rounded-xl bg-background" role="region" aria-label="Invoice reconciliation results" tabIndex={0}>
              <table className="w-full text-sm">
                <caption className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-3 pt-3">Invoices</caption>
                <thead className="text-xs text-muted-foreground"><tr>{['Reference', 'Due', 'Amount', 'Paid', 'Outstanding', 'Status'].map((h) => <th key={h} scope="col" className="text-left px-3 py-2">{h}</th>)}</tr></thead>
                <tbody>
                  {res.v.invoices.map((i) => (
                    <tr key={i.id} className="border-t" data-testid={`invoice-${i.id}`}>
                      <th scope="row" className="text-left px-3 py-2 font-mono font-normal whitespace-nowrap">{i.reference} <span className="text-muted-foreground text-xs">{i.id}</span></th>
                      <td className="px-3 py-2 font-mono whitespace-nowrap">{i.dueDate}</td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap">{fmt(i.amountMinor)}</td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap">{fmt(i.paidMinor)}</td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap">{fmt(i.outstandingMinor)}</td>
                      <td className="px-3 py-2 whitespace-nowrap space-x-1"><Pill tone={tone[i.status]}>{i.status}</Pill>{i.overdue && <Pill tone="bad">overdue</Pill>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <section aria-label="Payments">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Payments</h3>
              <ul className="space-y-2">
                {res.v.payments.map((p) => (
                  <li key={p.id} className={cn('border rounded-xl p-3 bg-background text-sm', p.status === 'ambiguous' && 'border-accent', p.status === 'unmatched' && 'border-dashed')} data-testid={`payment-${p.id}`}>
                    <div className="flex justify-between gap-2 flex-wrap">
                      <span className="font-mono">{p.description} <span className="text-muted-foreground text-xs">{p.date}</span></span>
                      <span className="flex items-center gap-2"><span className="font-mono">{fmt(p.amountMinor)}</span><Pill tone={p.status === 'matched' ? 'ok' : p.status === 'ambiguous' ? 'warn' : 'muted'}>{p.status}</Pill></span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{p.reason}{p.invoiceId ? ` (${p.invoiceId})` : ''}</p>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-2">Ambiguous payments stay unresolved on purpose. A person decides which invoice they belong to.</p>
            </section>
          </>
        )}
      <Footer date={f.asOf} onReset={() => setS(init)} note="Overdue means past due on the as-of date and not fully paid." />
    </div>
  );
}
