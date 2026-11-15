const SEARCH_HISTORY_KEY = "webubble.recent-searches.v1";
const MAX_RECENT_SEARCHES = 5;

export function getRecentSearches(storage: Pick<Storage, "getItem" | "removeItem">): string[] {
  const saved = storage.getItem(SEARCH_HISTORY_KEY);
  if (!saved) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    storage.removeItem(SEARCH_HISTORY_KEY);
    return [];
  }

  if (!Array.isArray(parsed)) {
    storage.removeItem(SEARCH_HISTORY_KEY);
    return [];
  }

  return parsed
    .filter((query): query is string => typeof query === "string")
    .map((query) => query.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, MAX_RECENT_SEARCHES);
}

export function recordSearch(query: string, storage: Pick<Storage, "getItem" | "setItem" | "removeItem">): void {
  const normalized = query.trim().slice(0, 80);
  if (!normalized) return;

  const searches = getRecentSearches(storage);
  const updated = [
    normalized,
    ...searches.filter((previous) => previous.toLocaleLowerCase() !== normalized.toLocaleLowerCase()),
  ].slice(0, MAX_RECENT_SEARCHES);
  storage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
}

export function clearRecentSearches(storage: Pick<Storage, "removeItem">): void {
  storage.removeItem(SEARCH_HISTORY_KEY);
}
