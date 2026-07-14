import { useState, useMemo } from "react";

interface UseSearchProps<T> {
  data: T[];
  searchFields: (keyof T)[];
  initialQuery?: string;
}

export function useSearch<T>({ data, searchFields, initialQuery = "" }: UseSearchProps<T>) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return data;

    return data.filter((item) =>
      searchFields.some((field) => {
        const val = item[field];
        if (val === undefined || val === null) return false;
        return String(val).toLowerCase().includes(query);
      })
    );
  }, [data, searchFields, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    filteredData,
  };
}
