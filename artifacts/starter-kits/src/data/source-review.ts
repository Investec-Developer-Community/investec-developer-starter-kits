/** Maintainer-approved metadata, never updated by the network checker. */
export interface SourceReview {
  checkedOn: string | null;
  repositoryUrl: string;
  readmeUrl: string;
  licenceUrl: string;
  /** SHA-256 of the normalized licence response, approved by a human. */
  licenceSha256: string | null;
}

export const SOURCE_REVIEW_MAX_AGE_DAYS = 90;

export function sourceReviewStatus(checkedOn: string | null, now = new Date()): string {
  if (!checkedOn) return 'Source review not yet recorded';
  const date = new Date(`${checkedOn}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkedOn) || !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== checkedOn || date.getTime() > now.getTime()) {
    return 'Source review date needs correction';
  }
  return now.getTime() - date.getTime() > SOURCE_REVIEW_MAX_AGE_DAYS * 86_400_000
    ? `Source review overdue · last checked ${checkedOn}`
    : `Sources checked ${checkedOn}`;
}
