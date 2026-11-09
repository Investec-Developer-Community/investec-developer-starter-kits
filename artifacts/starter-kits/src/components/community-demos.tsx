import { useState } from 'react';
import { BellRing, Download, Mail, PiggyBank, Plus, TriangleAlert } from 'lucide-react';
import { previewPing } from '@/data/payment-pinger-engine.mjs';
import { buildSheetRows, csvCell, rowsToCsv } from '@/data/card-to-sheet-sync-engine.mjs';
import { simulateSwipe } from '@/data/swipe-n-save-engine.mjs';
import { pingerTxns, sheetTxns, swipeTxns } from '@/data/community-kits';
import { useTextDownload } from '@/hooks/use-text-download';
import { zar } from '@/data/kits';
import { cn } from '@/lib/utils';

const inputCls = 'w-full bg-background border border-input rounded-xl px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring';
const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(/\s/g, '')));

function Field({ label, value, onChange, id }: { label: string; value: string; onChange: (v: string) => void; id: string }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, 'mt-1')} data-testid={`input-${id}`} />
    </label>
  );
}

function Errors({ errors }: { errors: string[] }) {
  return (
    <ul className="text-sm text-destructive space-y-1" data-testid="text-demo-invalid">
      {errors.map((e) => <li key={e}>{e}</li>)}
    </ul>
  );
}

export function PingerDemo() {
  const [f, setF] = useState({ merchant: 'Blue Bottle Coffee', amount: '6.50', currency: 'USD', city: 'Oakland', cardLast4: '4821' });
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const p = previewPing({ ...f, amount: num(f.amount) });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {pingerTxns.map((t, i) => (
          <button key={i} type="button" onClick={() => setF({ merchant: t.merchant, amount: String(t.amount), currency: t.currency, city: t.city ?? '', cardLast4: t.cardLast4 })}
            className="press text-xs px-2 py-1 rounded-xl border font-mono hover:bg-secondary" data-testid={`button-preset-${i}`}>
            {t.merchant || 'invalid row'}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2"><Field id="merchant" label="Merchant" value={f.merchant} onChange={set('merchant')} /></div>
        <Field id="amount" label="Amount" value={f.amount} onChange={set('amount')} />
        <Field id="currency" label="Currency (ISO)" value={f.currency} onChange={set('currency')} />
        <Field id="city" label="City" value={f.city} onChange={set('city')} />
        <Field id="last4" label="Card last 4" value={f.cardLast4} onChange={set('cardLast4')} />
      </div>
      {p.ok ? (
        <div className="space-y-3">
          <div key={p.message} className="rise max-w-md rounded-2xl rounded-bl-sm bg-secondary p-3" data-testid="text-ping-preview">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><BellRing className="w-3.5 h-3.5" />Telegram-style preview</div>
            <div className="text-sm">{p.message}</div>
          </div>
          {p.alert && (
            <div key={p.alert} className="rise flex gap-3 border-2 border-accent bg-accent/10 rounded-xl p-3" data-testid="text-ping-alert">
              <Mail className="w-5 h-5 text-accent shrink-0" />
              <div className="text-sm"><div className="font-semibold">Email alert preview</div>{p.alert}</div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Preview only. No Telegram message, email or Canarytoken request is made.</p>
        </div>
      ) : <Errors errors={p.errors} />}
    </div>
  );
}

export function SheetDemo() {
  const [txns, setTxns] = useState<Record<string, unknown>[]>(sheetTxns);
  const [d, setD] = useState({ date: '2025-04-05', merchant: '+cmd|calc', amount: '42', status: 'approved' });
  const downloadText = useTextDownload();
  const { rows, skipped } = buildSheetRows(txns);
  const add = () => setTxns([...txns, { date: d.date, merchant: d.merchant, category: 'Added', amount: num(d.amount), currency: 'ZAR', status: d.status }]);
  return (
    <div className="space-y-4">
      <div className="border rounded-xl bg-background overflow-x-auto" role="region" aria-label="Spreadsheet preview" tabIndex={0}>
        <table className="w-full text-sm">
          <thead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-left">
            <tr><th className="p-2">Date</th><th className="p-2">Merchant (CSV cell)</th><th className="p-2 text-right">Amount</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && <tr><td colSpan={3} className="p-3 text-muted-foreground">No approved rows.</td></tr>}
            {rows.map((r, i) => (
              <tr key={i} data-testid={`row-sheet-${i}`}>
                <td className="p-2 font-mono text-xs">{r.date}</td>
                <td className="p-2 font-mono text-xs break-all">{csvCell(r.merchant)}</td>
                <td className="p-2 font-mono text-right">{r.currency} {r.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {skipped.length > 0 && (
        <ul className="space-y-1 text-xs" data-testid="list-skipped">
          {skipped.map((s) => <li key={s.index} className="flex gap-2"><TriangleAlert className="w-3.5 h-3.5 text-accent shrink-0" />Row #{s.index} skipped: {s.reason}</li>)}
        </ul>
      )}
      <div className="grid sm:grid-cols-[1fr_2fr_1fr_1fr_auto] gap-2 items-end">
        <Field id="sheet-date" label="Date" value={d.date} onChange={(v) => setD({ ...d, date: v })} />
        <Field id="sheet-merchant" label="Merchant" value={d.merchant} onChange={(v) => setD({ ...d, merchant: v })} />
        <Field id="sheet-amount" label="Amount" value={d.amount} onChange={(v) => setD({ ...d, amount: v })} />
        <label className="block text-sm"><span className="font-medium">Status</span>
          <select value={d.status} onChange={(e) => setD({ ...d, status: e.target.value })} className={cn(inputCls, 'mt-1')} data-testid="select-sheet-status">
            <option value="approved">approved</option><option value="declined">declined</option>
          </select>
        </label>
        <button type="button" onClick={add} className="press border rounded-xl px-3 py-2 text-sm hover:bg-secondary flex items-center gap-1" data-testid="button-add-row"><Plus className="w-4 h-4" />Add</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={rows.length === 0} onClick={() => downloadText('card-to-sheet-sync.csv', rowsToCsv(rows), 'text/csv')}
          className="press bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50" data-testid="button-export-csv">
          <Download className="w-4 h-4" />Export safe CSV ({rows.length})
        </button>
        <button type="button" onClick={() => setTxns(sheetTxns)} className="press border rounded-xl px-3 py-2 text-sm hover:bg-secondary" data-testid="button-reset-rows">Reset rows</button>
      </div>
      <p className="text-xs text-muted-foreground">Formula-like cells get a leading apostrophe; commas, quotes and newlines are quoted. Nothing is sent to Make or Sheets.</p>
    </div>
  );
}

export function SwipeDemo() {
  const [pct, setPct] = useState('10');
  const n = num(pct);
  const sim = simulateSwipe(swipeTxns, n);
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-[200px_1fr] gap-4 items-end">
        <Field id="percent" label="Save percent (1-10000)" value={pct} onChange={setPct} />
        {sim.ok && (
          <div className="flex items-baseline gap-3">
            <PiggyBank className="w-5 h-5 text-primary self-center" />
            <span className="text-sm">Would-be savings</span>
            <span key={sim.total} className="rise text-3xl font-semibold text-primary font-mono" data-testid="text-swipe-total">{zar(sim.total)}</span>
          </div>
        )}
      </div>
      {sim.ok ? (
        <div className="border rounded-xl bg-background divide-y">
          {sim.results.map(({ txn, result }, i) => (
            <div key={i} className={cn('flex items-center gap-3 px-3 py-2 text-sm', result.excluded && 'text-muted-foreground')} data-testid={`row-swipe-${i}`}>
              <span className="font-mono text-xs w-12 shrink-0">{String(txn.mcc)}</span>
              <span className="flex-1 truncate">{String(txn.merchant)}</span>
              <span className="font-mono text-xs hidden sm:inline">{zar(Number(txn.amount))}</span>
              {result.excluded
                ? <span className="font-semibold text-[10px] uppercase tracking-wide border border-dashed border-slate-300 px-1 rounded-xl">ATM excluded</span>
                : <span className="font-mono font-semibold text-primary w-28 text-right">+{zar(result.saving)}</span>}
            </div>
          ))}
        </div>
      ) : <Errors errors={[sim.error ?? 'Invalid input']} />}
      <p className="text-xs text-muted-foreground">Simulation only. No credentials, no OAuth, no transfer.</p>
    </div>
  );
}
