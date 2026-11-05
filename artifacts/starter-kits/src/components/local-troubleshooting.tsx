import type { Kit } from '@/data/kits';
import { starterInstructions } from '@/lib/starter-bundle';

function Command({ children }: { children: string }) {
  return <pre className="mt-2 overflow-x-auto rounded-lg bg-secondary p-3 text-xs" tabIndex={0}><code>{children}</code></pre>;
}

export function LocalTroubleshooting({ kit }: { kit: Kit }) {
  const { command } = starterInstructions(kit);
  return (
    <section className="mt-6 rounded-xl border bg-card p-4 text-sm [overflow-wrap:anywhere]" aria-label="Local troubleshooting" data-testid="section-local-troubleshooting">
      <h3 className="font-semibold text-lg">Local run not working?</h3>
      <p className="mt-1 text-muted-foreground">Check setup first. These starters need Node 18+ and two local files, not npm install, credentials or a bank connection.</p>
      <div className="mt-3 divide-y">
        <details className="py-3">
          <summary className="cursor-pointer font-semibold">“node” not found or not recognised</summary>
          <p className="mt-2">Install a current LTS version from <a href="https://nodejs.org/en/download" target="_blank" rel="noreferrer" className="underline">nodejs.org</a>, then close and reopen your terminal. If the version is below 18, upgrade first. Check again:</p>
          <Command>node --version</Command>
          <p className="mt-2">If Node is still not recognised, reopen the installer and ensure Node is added to PATH, then reopen the terminal.</p>
        </details>
        <details className="py-3">
          <summary className="cursor-pointer font-semibold">Cannot find module / wrong folder</summary>
          <p className="mt-2">Extract the ZIP first. Open the folder containing <code className="break-all">{kit.scriptFile}</code> and <code className="break-all">{kit.dataFile}</code>, not its parent or the ZIP itself. In your terminal, replace the quoted path below with that folder’s full path (keep the quotes):</p>
          <Command>{'cd "FULL_PATH_TO_EXTRACTED_FOLDER"\nnode -p "process.cwd()"\nnode -p "require(\'node:fs\').readdirSync(\'.\').join(\'\\n\')"'}</Command>
          <p className="mt-2">The last two commands show your current folder and its files. Both filenames above must appear. Then retry:</p>
          <Command>{command}</Command>
        </details>
        <details className="py-3">
          <summary className="cursor-pointer font-semibold">ENOENT / missing mock JSON</summary>
          <p className="mt-2">Download the mock JSON using the starter-file button above, or extract a fresh bundle into a separate folder to preserve your edits. Put it beside the script with the exact name <code className="break-all">{kit.dataFile}</code> (no “(1)” or extra “.txt”). Check that it exists:</p>
          <Command>{`node -p "require('node:fs').existsSync('${kit.dataFile}')"`}</Command>
          <p className="mt-2">Expect <code>true</code>. If it says <code>false</code>, check the filename and folder. For a JSON syntax error after editing, keep a backup and use the original mock JSON, then rerun:</p>
          <Command>{command}</Command>
        </details>
        <details className="py-3">
          <summary className="cursor-pointer font-semibold">INVALID / validation failure: is this expected?</summary>
          <p className="mt-2">Payment Pinger’s last mock row is intentionally invalid: it prints <code>INVALID</code> and exits with code <code>1</code> after previewing the valid rows. That demonstrates rejection, not a broken installation. Card-to-Sheet Sync also skips declined or invalid rows with reasons. Neither needs “fixing” to complete the demo.</p>
          <p className="mt-2">If you deliberately tried an out-of-range Swipe ’n Save percentage, restore its documented run command. For any kit, compare with “Expected output” above. A missing file or Node error is a setup mistake, not an expected validation result.</p>
          <p className="mt-2">For {kit.name}, rerun the original mock data with:</p>
          <Command>{command}</Command>
          <p className="mt-2">If an unexpected validation error remains, read the reported field or row; use a freshly extracted bundle in a separate folder to rule out local edits. Never substitute real banking data.</p>
        </details>
      </div>
    </section>
  );
}
