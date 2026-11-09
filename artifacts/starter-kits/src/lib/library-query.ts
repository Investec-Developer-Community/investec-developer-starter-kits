export type LibrarySort = 'name' | 'difficulty' | 'time' | 'added';

export type LibraryFilters = {
  q: string;
  cat: string;
  lang: string;
  diff: string;
  sort: LibrarySort;
};

export const defaultLibraryFilters: LibraryFilters = {
  q: '',
  cat: 'All',
  lang: 'All',
  diff: 'All',
  sort: 'name',
};

const filterKeys = ['q', 'cat', 'lang', 'diff', 'sort'] as const;
const sortOptions: readonly LibrarySort[] = ['name', 'difficulty', 'time', 'added'];

export function readLibraryFilters(
  search: string,
  categories: readonly string[],
  languages: readonly string[],
): LibraryFilters {
  const params = new URLSearchParams(search);
  const category = params.get('cat');
  const language = params.get('lang');
  const difficulty = params.get('diff');
  const sort = params.get('sort');

  return {
    q: params.get('q') ?? defaultLibraryFilters.q,
    cat: category && categories.includes(category) ? category : defaultLibraryFilters.cat,
    lang: language && languages.includes(language) ? language : defaultLibraryFilters.lang,
    diff: difficulty && ['All', 'Beginner', 'Intermediate', 'Advanced'].includes(difficulty)
      ? difficulty
      : defaultLibraryFilters.diff,
    sort: sortOptions.find((option) => option === sort) ?? defaultLibraryFilters.sort,
  };
}

export function writeLibraryFilters(search: string, filters: LibraryFilters): string {
  const params = new URLSearchParams(search);
  filterKeys.forEach((key) => params.delete(key));

  if (filters.q) params.set('q', filters.q);
  if (filters.cat !== defaultLibraryFilters.cat) params.set('cat', filters.cat);
  if (filters.lang !== defaultLibraryFilters.lang) params.set('lang', filters.lang);
  if (filters.diff !== defaultLibraryFilters.diff) params.set('diff', filters.diff);
  if (filters.sort !== defaultLibraryFilters.sort) params.set('sort', filters.sort);

  return params.toString();
}

export function buildLibraryUrl(
  pathname: string,
  search: string,
  hash: string,
  filters: LibraryFilters,
): string {
  const query = writeLibraryFilters(search, filters);
  return `${pathname}${query ? `?${query}` : ''}${hash}`;
}
