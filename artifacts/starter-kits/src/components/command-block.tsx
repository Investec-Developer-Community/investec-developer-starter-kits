import { useId, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CommandBlock({ code, testId }: { code: string; testId?: string }) {
  // Key the state to the command so navigation cannot retain stale feedback.
  return <CommandContent key={code} code={code} testId={testId} />;
}

function CommandContent({ code, testId }: { code: string; testId?: string }) {
  const id = useId();
  const pending = useRef(false);
  const [status, setStatus] = useState<'idle' | 'copying' | 'success' | 'error'>('idle');
  const copy = async () => {
    if (pending.current) return;
    pending.current = true;
    setStatus('copying');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code);
      setStatus('success');
    } catch {
      setStatus('error');
    } finally {
      pending.current = false;
    }
  };
  return (
    <div className="mt-2 min-w-0 max-w-full" data-testid="command-block">
      <div className="flex min-w-0 items-center rounded-xl bg-[#0f172a] text-slate-100">
        <pre tabIndex={0} aria-label="Command" className="min-w-0 flex-1 overflow-x-auto whitespace-pre px-3 py-2 font-mono text-xs">
          <code data-testid={testId}><span aria-hidden="true" className="text-sky-300 select-none">$ </span>{code}</code>
        </pre>
        <button type="button" onClick={copy} aria-disabled={status === 'copying'} aria-label="Copy command" aria-describedby={`${id}-status`} className="press shrink-0 p-3 hover:bg-white/10 rounded-xl" data-testid="button-copy-command">
          {status === 'success' ? <Check aria-hidden="true" className="w-4 h-4" /> : <Copy aria-hidden="true" className="w-4 h-4" />}
        </button>
      </div>
      <p id={`${id}-status`} role="status" aria-live="polite" aria-atomic="true" className="text-xs mt-1">
        {status === 'copying' && 'Copying command…'}
        {status === 'success' && 'Command copied.'}
        {status === 'error' && 'Could not copy automatically. Select the command below and press Ctrl+C (Windows/Linux) or Command+C (Mac), or use your device’s Copy menu.'}
      </p>
      {status === 'error' && (
        <div className="mt-2">
          <label htmlFor={`${id}-manual`} className="text-xs font-semibold">Command for manual copy</label>
          <textarea id={`${id}-manual`} readOnly value={code} rows={Math.min(6, code.split('\n').length + 1)} wrap="off" onFocus={event => event.currentTarget.select()} className="mt-1 block w-full min-w-0 max-w-full overflow-x-auto rounded-lg border bg-background p-2 font-mono text-xs" />
        </div>
      )}
    </div>
  );
}
