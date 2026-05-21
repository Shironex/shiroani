import { createMemoizedSelector } from '@/stores/utils/createMemoizedSelector';

/**
 * A comparator returning a negative/zero/positive number for ascending order.
 * The factory negates the result for descending order, so comparators only
 * ever describe the ascending relationship.
 */
export type Comparator<TItem> = (a: TItem, b: TItem) => number;

/**
 * Configuration for {@link createFilteredListSelector}. Each stage is optional
 * so the same factory covers a filter-only list (feed) and a
 * filter + search + sort list (library, diary).
 */
interface FilteredListConfig<TItem, TState> {
  /** Pull the source list out of the selector state. */
  selectItems: (state: TState) => TItem[];
  /**
   * Per-item predicate derived from the current filter state. Return `null` to
   * skip filtering entirely (e.g. an "all" filter), which keeps the source
   * array reference intact for referential stability.
   */
  matchesFilter?: (state: TState) => ((item: TItem) => boolean) | null;
  /**
   * Per-item search predicate derived from the current state. Return `null` to
   * skip the search stage (e.g. an empty/whitespace query).
   */
  matchesSearch?: (state: TState) => ((item: TItem) => boolean) | null;
  /**
   * Comparator for the active sort. Return `null` to skip sorting, which keeps
   * the (possibly already filtered) array reference intact. When a comparator
   * is returned the list is copied before sorting so the source is never
   * mutated.
   */
  comparator?: (state: TState) => Comparator<TItem> | null;
}

/**
 * Build a memoized list selector that runs the shared
 * `filter → search → sort` pipeline used by the library, diary, and feed
 * stores.
 *
 * The result is wrapped in {@link createMemoizedSelector} so callers receive a
 * stable reference whenever the output is shallowly equal to the previous one —
 * preserving the render-performance contract the individual selectors relied
 * on. Each stage that is skipped (no filter, no search, no sort) leaves the
 * array reference untouched, matching the hand-written selectors exactly.
 */
export function createFilteredListSelector<TItem, TState>(
  config: FilteredListConfig<TItem, TState>
): (state: TState) => TItem[] {
  const { selectItems, matchesFilter, matchesSearch, comparator } = config;

  return createMemoizedSelector((state: TState): TItem[] => {
    let result = selectItems(state);

    const filterPredicate = matchesFilter?.(state);
    if (filterPredicate) {
      result = result.filter(filterPredicate);
    }

    const searchPredicate = matchesSearch?.(state);
    if (searchPredicate) {
      result = result.filter(searchPredicate);
    }

    const compare = comparator?.(state);
    if (compare) {
      result = [...result].sort(compare);
    }

    return result;
  });
}
