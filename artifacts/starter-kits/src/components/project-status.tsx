import { PROJECT_STATUS_TEXT } from '../data/project-status.ts';

export function ProjectStatus() {
  return (
    <aside
      aria-label="Project status"
      className="border-t bg-white text-muted-foreground"
      data-testid="project-status"
    >
      <div className="max-w-6xl mx-auto px-4 py-8 text-xs leading-relaxed">
        {PROJECT_STATUS_TEXT}
      </div>
    </aside>
  );
}
