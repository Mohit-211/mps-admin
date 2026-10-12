import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useDebouncedValue } from "./useDebouncedValue";

/**
 * List filters kept in the URL (?status=…&page=…), so a filtered view can be linked to and survives a reload.
 * `update` sets or clears keys (empty = cleared) and resets the page unless told not to.
 */
export function useUrlState() {
  const [params, setParams] = useSearchParams();

  const update = useCallback(
    (changes: Record<string, string | null | undefined>, resetPage = true) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          if (resetPage) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const get = (key: string) => params.get(key) ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const setPage = (p: number) => update({ page: p > 1 ? String(p) : null }, false);

  return { params, get, update, page, setPage };
}

/** A search box synced to ?q= after a short pause. Returns the box value and the debounced query. */
export function useUrlSearch(key = "q") {
  const { params, update } = useUrlState();
  const [search, setSearch] = useState(params.get(key) ?? "");
  const q = useDebouncedValue(search.trim(), 350);

  useEffect(() => {
    if ((params.get(key) ?? "") !== q) update({ [key]: q || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return { search, setSearch, q };
}
