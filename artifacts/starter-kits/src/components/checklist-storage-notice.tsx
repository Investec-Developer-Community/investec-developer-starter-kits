import type { ChecklistPersistence } from '@/lib/checklist-store';

export function ChecklistStorageNotice({ persistence, onRetry }: {
  persistence: ChecklistPersistence;
  onRetry: () => void;
}) {
  if (persistence === 'available') return null;

  return (
    <div role="status" className="rounded-xl border border-accent bg-accent/10 p-3 text-sm" data-testid="storage-warning">
      {persistence === 'invalid' ? (
        <p>Some saved checklist data could not be read. Changing a checklist replaces the unreadable data.</p>
      ) : (
        <>
          <p>Browser storage is unavailable. Checklist changes are kept in this tab only and will be lost on reload or closing it.</p>
          <button type="button" onClick={onRetry} className="mt-2 font-semibold underline underline-offset-4">Retry browser storage</button>
        </>
      )}
    </div>
  );
}
