import { parseAsString, parseAsBoolean, parseAsArrayOf, useQueryStates } from 'nuqs';

export function useTransactionFilters() {
  const [filters, setFilters] = useQueryStates({
    search: parseAsString.withDefault(''),
    categories: parseAsArrayOf(parseAsString).withDefault([]),
    dateFrom: parseAsString,
    dateTo: parseAsString,
    reviewed: parseAsBoolean,
  });

  const clearFilters = () => {
    void setFilters({
      search: '',
      categories: [],
      dateFrom: null,
      dateTo: null,
      reviewed: null,
    });
  };

  const hasActiveFilters =
    filters.search !== '' ||
    filters.categories.length > 0 ||
    filters.dateFrom !== null ||
    filters.dateTo !== null ||
    filters.reviewed !== null;

  return {
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,
  };
}
