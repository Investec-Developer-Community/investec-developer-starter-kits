import { useMemo, useReducer, useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { computeTransferPreview, decidePurchase, interestDefaultPending, interestFixture, merchantCategories, spendTransactions, zar } from '@/data/kits';
import { filterSpendRows, postedDebitTotalsMinor } from '@/data/spend-explorer-engine.mjs';
import { decimalToMinor } from '@/data/sample-helpers.mjs';
import { cn } from '@/lib/utils';

const inputCls = 'w-full bg-background border border-input rounded-xl px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring';

function NumField({ label, value, onChange, error, id }: { label: string; value: string; onChange: (v: string) => void; error?: string; id: string }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={error ? `error-${id}` : undefined} className={cn(inputCls, 'mt-1', error && 'border-destructive')} data-testid={`input-${id}`} />
      {error && <span id={`error-${id}`} className="text-xs text-destructive mt-1 block" data-testid={`error-${id}`}>{error}</span>}
    </label>
  );
}

function parse(v: string): { n?: number; err?: string } {
  if (v.trim() === '') return { err: 'Required' };
  const n = Number(v.replace(/\s/g, ''));
  if (!Number.isFinite(n)) return { err: 'Enter a number' };
  if (n < 0) return { err: 'Cannot be negative' };
  return { n };
}

function parseTransferAmount(value: string): { n?: number; err?: string } {
  const parsed = parse(value);
  if (parsed.n === undefined) return parsed;
  try {
    decimalToMinor(parsed.n);
  } catch (error) {
    if (error instanceof RangeError) return { err: 'Amount is outside the supported range' };
    throw error;
  }
  return parsed;
}

function Acct({ name, before, after }: { name: string; before: number; after: number }) {
  const changed = before !== after;
  return (
    <div className="border rounded-xl p-3 bg-background">
      <div className="text-xs text-muted-foreground font-mono">{name}</div>
      <div className="flex items-center gap-2 mt-1 font-mono text-sm flex-wrap">
        <span>{zar(before)}</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
        <span key={after} className={cn('rise font-semibold', changed && 'text-primary')}>{zar(after)}</span>
      </div>
    </div>
  );
}

export function InterestDemo() {
  const [bal, setBal] = useState(String(interestFixture.balances['demo-transactional'].data.currentBalance));
  const [pend, setPend] = useState(String(interestDefaultPending));
  const [res, setRes] = useState(String(interestFixture.reserve));
  const loan = interestFixture.balances['demo-loan'].data.currentBalance;
  const b = parseTransferAmount(bal), p = parseTransferAmount(pend), r = parseTransferAmount(res);
  const ok = b.n !== undefined && p.n !== undefined && r.n !== undefined;
  const preview = ok ? computeTransferPreview(b.n!, p.n!, r.n!, loan) : undefined;
  const amt = preview?.transferable ?? 0;
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <NumField id="balance" label="Balance (R)" value={bal} onChange={setBal} error={b.err} />
        <NumField id="pending" label="Pending (R)" value={pend} onChange={setPend} error={p.err} />
        <NumField id="reserve" label="Reserve (R)" value={res} onChange={setRes} error={r.err} />
      </div>
      <div className="font-mono text-xs text-muted-foreground">transferable = max(0, balance - pending - reserve)</div>
      {ok ? (
        <>
          <div className="flex items-baseline gap-3">
            <span className="text-sm">Transferable</span>
            <span key={amt} className="rise text-3xl font-semibold text-primary font-mono" data-testid="text-transferable">{zar(amt)}</span>
          </div>
          {amt === 0 && <p className="text-sm text-muted-foreground">Nothing to move: pending and reserve cover the whole balance.</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            <Acct name="Transactional account (mock)" before={b.n!} after={preview!.sourceAfter} />
            <Acct name="Home loan (mock)" before={loan} after={preview!.targetAfter} />
          </div>
          <p className="text-xs text-muted-foreground">Preview only. No transfer happens, here or anywhere.</p>
        </>
      ) : (
        <p className="text-sm text-destructive" data-testid="text-demo-invalid">Fix the highlighted fields to see a result.</p>
      )}
    </div>
  );
}

export function SpendDemo() {
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const cats = useMemo(() => Array.from(new Set(spendTransactions.map((t) => t.category))), []);
  const rows = filterSpendRows(spendTransactions, { category: cat, search: q });
  const totals = postedDebitTotalsMinor(rows);
  const max = totals[0]?.[1] ?? 1;
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={inputCls} aria-label="Category" data-testid="select-demo-category">
          <option value="all">All categories</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search description" className={inputCls} aria-label="Search description" data-testid="input-demo-search" />
      </div>
      <div className="grid md:grid-cols-[1fr_240px] gap-4">
        <div className="border rounded-xl bg-background divide-y max-h-80 overflow-auto" role="region" aria-label="Matching transactions" tabIndex={0}>
          {rows.length === 0 && <div className="p-4 text-sm text-muted-foreground">No fictional transactions match.</div>}
          {rows.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm" data-testid={`row-tx-${t.id}`}>
              <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">{t.date.slice(5)}</span>
              <span className="flex-1 truncate">{t.description}</span>
              {t.status === 'PENDING' && <span className="font-semibold text-[10px] uppercase tracking-wide border border-dashed border-slate-300 px-1 rounded-xl text-muted-foreground">pending</span>}
              <span className="font-mono">{zar(t.amountMinor / 100)}</span>
            </div>
          ))}
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">{rows.length} matching transactions</p>
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Posted totals</div>
          {totals.length === 0 && <div className="text-sm text-muted-foreground">No posted rows.</div>}
          {totals.map(([c, v]) => (
            <div key={c} data-testid={`total-${c}`}>
              <div className="flex justify-between text-sm"><span>{c}</span><span className="font-mono">{zar(v / 100)}</span></div>
              <div className="h-1 bg-secondary rounded overflow-hidden"><div className="h-full bg-accent origin-left transition-transform duration-500" style={{ transform: `scaleX(${v / max})` }} /></div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground pt-2">Pending rows are shown but excluded, matching the script.</p>
        </div>
      </div>
    </div>
  );
}

type CardSimulation =
  | { status: 'idle' }
  | { status: 'stale' }
  | { status: 'decided'; decision: ReturnType<typeof decidePurchase>; revision: number };

type CardSimulationAction =
  | { type: 'inputs-changed' }
  | { type: 'simulate'; decision: ReturnType<typeof decidePurchase> };

function cardSimulationReducer(state: CardSimulation, action: CardSimulationAction): CardSimulation {
  switch (action.type) {
    case 'inputs-changed':
      return state.status === 'idle' ? state : { status: 'stale' };
    case 'simulate':
      return {
        status: 'decided',
        decision: action.decision,
        revision: state.status === 'decided' ? state.revision + 1 : 1,
      };
  }
}

export function CardDemo() {
  const [limit, setLimit] = useState('1500');
  const [blocked, setBlocked] = useState<string[]>(['Gambling']);
  const [amount, setAmount] = useState('899');
  const [mcat, setMcat] = useState('Online retail');
  const [simulation, dispatch] = useReducer(cardSimulationReducer, { status: 'idle' });
  const l = parse(limit);
  const invalidate = () => dispatch({ type: 'inputs-changed' });
  const simulate = () => {
    if (l.n === undefined) return;
    const decision = decidePurchase({ amount: Number(amount), merchantCategory: mcat }, { spendLimit: l.n, blockedCategories: blocked });
    dispatch({ type: 'simulate', decision });
  };
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rules</div>
          <NumField id="limit" label="Spend limit (R)" value={limit} onChange={(value) => { setLimit(value); invalidate(); }} error={l.err} />
          <div className="text-sm font-medium">Restricted merchant categories</div>
          <div className="flex flex-wrap gap-1.5">
            {merchantCategories.map((c) => {
              const on = blocked.includes(c);
              return (
                <button key={c} type="button" aria-pressed={on} onClick={() => { setBlocked(current => current.includes(c) ? current.filter(x => x !== c) : [...current, c]); invalidate(); }}
                  className={cn('press text-xs px-2 py-1 rounded-xl border font-mono', on ? 'bg-destructive text-destructive-foreground border-destructive' : 'hover:bg-secondary')}
                  data-testid={`toggle-block-${c}`}>{c}</button>
              );
            })}
          </div>
        </div>
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mock purchase</div>
          <NumField id="amount" label="Amount (R)" value={amount} onChange={(value) => { setAmount(value); invalidate(); }} />
          <label className="block text-sm"><span className="font-medium">Merchant category</span>
            <select value={mcat} onChange={(e) => { setMcat(e.target.value); invalidate(); }} className={cn(inputCls, 'mt-1')} data-testid="select-merchant">
              {merchantCategories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <button type="button" onClick={simulate} disabled={l.n === undefined} className="press w-full bg-primary text-primary-foreground rounded-xl py-2 font-semibold disabled:opacity-50" data-testid="button-simulate">
            Simulate mock purchase
          </button>
        </div>
      </div>
      <div role="status" aria-live="polite" aria-atomic="true" className={simulation.status === 'idle' ? 'sr-only' : undefined}>
        {simulation.status === 'stale' && <p className="text-sm text-muted-foreground" data-testid="status-decision-stale">Rules or purchase changed. Run the simulation again.</p>}
        {simulation.status === 'decided' && (
          <div key={simulation.revision} className={cn('rise flex items-center gap-3 rounded-xl p-4 border-2', simulation.decision.approved ? 'border-primary bg-primary/5' : 'border-destructive bg-destructive/5')} data-testid="status-decision">
            <span className={cn('grid place-items-center w-9 h-9 rounded-full', simulation.decision.approved ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground')}>
              {simulation.decision.approved ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </span>
            <div>
              <div className="font-semibold font-mono">{simulation.decision.approved ? 'APPROVE' : 'DECLINE'}</div>
              <div className="text-sm text-muted-foreground">{simulation.decision.reason}. Simulated; no card involved.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
