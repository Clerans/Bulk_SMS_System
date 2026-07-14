import { useState, useMemo } from "react";

interface UsePaginationProps {
  totalItems: number;
  pageSize: number;
  initialPage?: number;
}

export function usePagination({ totalItems, pageSize, initialPage = 1 }: UsePaginationProps) {
  const [page, setPage] = useState(initialPage);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalItems / pageSize)), [totalItems, pageSize]);

  // Adjust page if total items change and current page is out of bounds
  const currentPage = Math.min(page, totalPages);

  const rangeStart = (currentPage - 1) * pageSize;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);

  const nextPage = () => setPage((p) => Math.min(totalPages, p + 1));
  const prevPage = () => setPage((p) => Math.max(1, p - 1));

  return {
    page: currentPage,
    totalPages,
    rangeStart,
    rangeEnd,
    nextPage,
    prevPage,
    setPage,
  };
}
