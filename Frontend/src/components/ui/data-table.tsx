import React, { useState, useMemo } from "react";
import {
  Search,
  Download,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/cn";

export interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
}

export interface FilterDef {
  key: string;
  label: string;
  options: { label: string; value: string }[];
}

export interface RowActionDef<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  filters?: FilterDef[];
  rowActions?: RowActionDef<T>[];
  exportFilename?: string;
  defaultSort?: { key: keyof T | string; direction: "asc" | "desc" };
  pageSize?: number;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchPlaceholder = "Search...",
  searchKeys = [],
  filters = [],
  rowActions = [],
  exportFilename = "export",
  defaultSort,
  pageSize = 10,
}: DataTableProps<T>) {
  // States
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof T | string; direction: "asc" | "desc" } | null>(
    defaultSort || null
  );
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const config: Record<string, boolean> = {};
    columns.forEach((col) => {
      config[String(col.key)] = true;
    });
    return config;
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Filter & Search Logic
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // 1. Search filter
      const matchesSearch =
        !search ||
        searchKeys.some((key) => {
          const val = row[key];
          return val && String(val).toLowerCase().includes(search.toLowerCase());
        });

      if (!matchesSearch) return false;

      // 2. Custom dropdown filters
      return Object.entries(selectedFilters).every(([filterKey, filterVal]) => {
        if (!filterVal || filterVal === "all") return true;
        const rowVal = row[filterKey];
        return rowVal && String(rowVal).toLowerCase() === filterVal.toLowerCase();
      });
    });
  }, [data, search, searchKeys, selectedFilters]);

  // Sorting Logic
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === undefined || bVal === undefined) return 0;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Pagination Logic
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;

  // Sorting handler
  const handleSort = (key: keyof T | string, sortable = false) => {
    if (!sortable) return;
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Dropdown filter change handler
  const handleFilterChange = (key: string, value: string) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };

  // CSV Export handler
  const handleExport = () => {
    if (sortedData.length === 0) return;
    
    // Headers
    const headers = columns
      .filter((col) => visibleColumns[String(col.key)])
      .map((col) => col.header)
      .join(",");

    // Rows
    const rows = sortedData.map((row) =>
      columns
        .filter((col) => visibleColumns[String(col.key)])
        .map((col) => {
          const val = row[col.key];
          const escaped = String(val ?? "").replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    );

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${exportFilename}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {searchKeys.length > 0 && (
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-[#E4EAE2] rounded-xl bg-white focus:outline-none focus:border-[#8EA58C] transition-colors"
            />
          </div>
        )}

        {/* Dropdown Filters */}
        {filters.map((filter) => (
          <select
            key={filter.key}
            value={selectedFilters[filter.key] || "all"}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className="text-sm border border-[#E4EAE2] rounded-xl px-3 py-2 bg-white text-[#64748B] focus:outline-none focus:border-[#8EA58C] cursor-pointer"
          >
            <option value="all">All {filter.label}s</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ))}

        {/* Actions Menu (Visibility, Export) */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Column Visibility Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl border border-[#E4EAE2] bg-white text-[#1F2937] hover:bg-[#F8FAF8] transition cursor-pointer">
                <SlidersHorizontal size={14} />
                <span>Columns</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white border border-[#E4EAE2] rounded-xl p-1 shadow-md">
              <DropdownMenuLabel className="text-xs font-bold text-[#64748B] px-2 py-1.5">Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 border-t border-[#E4EAE2]" />
              {columns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={String(col.key)}
                  checked={visibleColumns[String(col.key)]}
                  onCheckedChange={(checked: boolean) =>
                    setVisibleColumns((prev) => ({ ...prev, [String(col.key)]: checked }))
                  }
                  className="text-xs font-semibold px-2 py-1.5 hover:bg-[#EEF4EC] rounded-lg cursor-pointer"
                >
                  {col.header}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export Action */}
          <button
            onClick={handleExport}
            disabled={sortedData.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl border border-[#E4EAE2] bg-white text-[#1F2937] hover:bg-[#F8FAF8] transition disabled:opacity-50 cursor-pointer"
          >
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-[#E4EAE2] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#F8FAF8" }} className="border-b border-[#E4EAE2]">
                {columns
                  .filter((col) => visibleColumns[String(col.key)])
                  .map((col) => {
                    const isSorted = sortConfig?.key === col.key;
                    return (
                      <th
                        key={String(col.key)}
                        onClick={() => handleSort(col.key, col.sortable)}
                        className={cn(
                          "px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide",
                          col.sortable ? "cursor-pointer select-none hover:text-[#1F2937] transition-colors" : "",
                          col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                          col.className
                        )}
                      >
                        <div className={cn("inline-flex items-center gap-1", col.align === "right" ? "flex-row-reverse" : "")}>
                          <span>{col.header}</span>
                          {col.sortable && (
                            <ChevronDown
                              size={12}
                              className={cn(
                                "transition-transform text-[#94A3B8]",
                                isSorted ? "text-[#8EA58C]" : "",
                                isSorted && sortConfig?.direction === "asc" ? "rotate-180" : ""
                              )}
                            />
                          )}
                        </div>
                      </th>
                    );
                  })}
                {rowActions.length > 0 && <th className="w-12 px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.filter((c) => visibleColumns[String(c.key)]).length + (rowActions.length > 0 ? 1 : 0)}
                    className="px-6 py-12 text-center text-sm text-[#64748B] font-medium"
                  >
                    No matching records found
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rIdx) => (
                  <tr key={row.id || rIdx} className="hover:bg-[#F8FAF8] transition-colors group">
                    {columns
                      .filter((col) => visibleColumns[String(col.key)])
                      .map((col) => {
                        const cellVal = row[col.key];
                        return (
                          <td
                            key={String(col.key)}
                            className={cn(
                              "px-4 py-3.5 text-[#1F2937]",
                              col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                              col.className
                            )}
                          >
                            {col.render ? col.render(row) : cellVal !== undefined ? String(cellVal) : "—"}
                          </td>
                        );
                      })}
                    {rowActions.length > 0 && (
                      <td className="px-4 py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded-lg hover:bg-[#EEF4EC] text-[#94A3B8] hover:text-[#1F2937] transition cursor-pointer">
                              <MoreHorizontal size={14} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border border-[#E4EAE2] rounded-xl p-1 shadow-md w-36">
                            {rowActions.map((act, aIdx) => (
                              <DropdownMenuItem
                                key={aIdx}
                                onClick={() => act.onClick(row)}
                                className={cn(
                                  "flex items-center gap-2 text-xs font-semibold px-2 py-1.5 hover:bg-[#EEF4EC] rounded-lg cursor-pointer",
                                  act.className
                                )}
                              >
                                {act.icon && <span className="flex-shrink-0">{act.icon}</span>}
                                <span>{act.label}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#E4EAE2]" style={{ background: "#F8FAF8" }}>
          <span className="text-xs text-[#64748B]">
            Showing {Math.min(sortedData.length, (currentPage - 1) * pageSize + 1)} to{" "}
            {Math.min(sortedData.length, currentPage * pageSize)} of {sortedData.length} records
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 text-xs font-semibold text-[#64748B] hover:bg-[#EEF4EC] rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                // Simple ellipsis for huge page sets
                if (totalPages > 5 && Math.abs(pageNum - currentPage) > 1 && pageNum !== 1 && pageNum !== totalPages) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="px-1.5 text-xs text-[#94A3B8]">...</span>;
                  }
                  return null;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-medium cursor-pointer transition-colors",
                      currentPage === pageNum
                        ? "bg-[#8EA58C] text-white"
                        : "text-[#64748B] hover:bg-[#EEF4EC]"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 py-1 text-xs font-semibold text-[#64748B] hover:bg-[#EEF4EC] rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
