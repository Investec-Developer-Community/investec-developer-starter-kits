const repository = 'https://github.com/Investec-Developer-Community/investec-developer-starter-kits';

export const communityLinks = {
  developerDocs: 'https://developer.investec.com',
  repository,
  contributing: `${repository}/blob/main/CONTRIBUTING.md`,
  reportIssue: `${repository}/issues/new/choose`,
  license: `${repository}/blob/main/LICENSE`,
  releases: `${repository}/releases`,
};

export function kitIssueUrl(slug: string) {
  const query = new URLSearchParams({ template: 'bug_report.yml', title: `[kit] ${slug}` });
  return `${repository}/issues/new?${query}`;
}
