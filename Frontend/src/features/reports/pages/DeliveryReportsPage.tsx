import { useState, useMemo, useEffect } from "react";
import { Download, BarChart2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/common/EmptyState";
import { SearchBar } from "../../../components/common/SearchBar";
import { Pagination } from "../../../components/ui/Pagination";
import { DELIVERY_STATUS_MAP } from "../../../lib/utils";
import { formatNumber } from "../../../utils/format";
import { usePagination } from "../../../hooks/usePagination";
import { reportsService } from "../services/reports.service";
import type { DeliveryStatus, DeliveryReport } from "../../../types/common";
import { toast } from "sonner";

const PAGE_SIZE = 10;

export function DeliveryReportsPage() {
  const [reports, setReports] = useState<DeliveryReport[]>([]);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | "ALL">("ALL");

  useEffect(() => {
    reportsService.getReports().then(setReports);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return reports.filter((r) => {
      const matchSearch = r.phone.includes(search) || r.campaignName.toLowerCase().includes(q);
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [reports, search, statusFilter]);

  const { page, totalPages, rangeStart, rangeEnd, setPage } = usePagination({
    totalItems: filtered.length,
    pageSize: PAGE_SIZE,
  });

  const paginated = useMemo(() => {
    return filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filtered, page]);

  function handleExport() {
    reportsService.exportCsv();
    toast.info("Export functionality requires backend integration.");
  }

  return (
    <div>
      <PageHeader
        title="Delivery Reports"
        description="Detailed delivery records for all campaigns."
        actions={
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4" />Export CSV
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Search by phone or campaign…"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as DeliveryStatus | "ALL"); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All Statuses</option>
            {(Object.keys(DELIVERY_STATUS_MAP) as DeliveryStatus[]).map((s) => (
              <option key={s} value={s}>{DELIVERY_STATUS_MAP[s].label}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={BarChart2}
            title="No delivery records found"
            description="No delivery records match the selected filters."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Campaign", "Phone", "Status", "Sent At", "Delivered At", "Failure Reason"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-foreground">{r.campaignName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.phone}</td>
                      <td className="px-4 py-3"><Badge status={r.status} map={DELIVERY_STATUS_MAP} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(parseISO(r.sentAt), "MMM d HH:mm:ss")}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {r.deliveredAt ? format(parseISO(r.deliveredAt), "MMM d HH:mm:ss") : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.failureReason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}

