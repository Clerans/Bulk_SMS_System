import { useState, useMemo, useEffect } from "react";
import { Download, BarChart2, Filter } from "lucide-react";
import { format, parseISO } from "date-fns";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/common/EmptyState";
import { SearchBar } from "../../../components/common/SearchBar";
import { Pagination } from "../../../components/ui/Pagination";
import { DELIVERY_STATUS_MAP } from "../../../lib/utils";
import { usePagination } from "../../../hooks/usePagination";
import { reportsService } from "../services/reports.service";
import type { DeliveryStatus, DeliveryReport } from "../../../types/common";
import { toast } from "sonner";

const PAGE_SIZE = 10;

export function DeliveryReportsPage() {
  const [reports, setReports] = useState<DeliveryReport[]>([]);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | "ALL">("ALL");
  const [senderFilter, setSenderFilter] = useState<string>("ALL");
  const [routeFilter, setRouteFilter]   = useState<string>("ALL");
  const [phoneFilter, setPhoneFilter]   = useState<string>("");
  const [startDate, setStartDate]       = useState<string>("");
  const [endDate, setEndDate]           = useState<string>("");

  useEffect(() => {
    reportsService.getReports().then(setReports);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return reports.filter((r) => {
      const matchSearch =
        r.phone.includes(q) ||
        r.campaignName.toLowerCase().includes(q) ||
        (r.gatewayMessageId || "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
      const matchSender = senderFilter === "ALL" || (r.senderId || "NotifyDEMO") === senderFilter;
      const matchRoute = routeFilter === "ALL" || (r.route || "Default Route") === routeFilter;
      const matchPhone = !phoneFilter || r.phone.includes(phoneFilter);

      let matchDate = true;
      if (startDate && r.sentAt) {
        matchDate = matchDate && new Date(r.sentAt) >= new Date(startDate);
      }
      if (endDate && r.sentAt) {
        matchDate = matchDate && new Date(r.sentAt) <= new Date(endDate + "T23:59:59");
      }

      return matchSearch && matchStatus && matchSender && matchRoute && matchPhone && matchDate;
    });
  }, [reports, search, statusFilter, senderFilter, routeFilter, phoneFilter, startDate, endDate]);

  const { page, totalPages, rangeStart, rangeEnd, setPage } = usePagination({
    totalItems: filtered.length,
    pageSize: PAGE_SIZE,
  });

  const paginated = useMemo(() => {
    return filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filtered, page]);

  function handleExport() {
    reportsService.exportCsv();
    toast.info("Exporting delivery reports CSV...");
  }

  return (
    <div>
      <PageHeader
        title="Delivery Reports"
        description="Enterprise detailed delivery records, status tracking, and gateway responses."
        actions={
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4" />Export CSV
          </Button>
        }
      />

      {/* Enhanced Filters Bar */}
      <Card className="mb-4 p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Search phone, campaign, message ID…"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as DeliveryStatus | "ALL"); setPage(1); }}
            aria-label="Filter by Status"
            className="px-3 py-2 rounded-lg border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All Statuses</option>
            {(Object.keys(DELIVERY_STATUS_MAP) as DeliveryStatus[]).map((s) => (
              <option key={s} value={s}>{DELIVERY_STATUS_MAP[s].label}</option>
            ))}
          </select>
          <select
            value={senderFilter}
            onChange={(e) => { setSenderFilter(e.target.value); setPage(1); }}
            aria-label="Filter by Sender ID"
            className="px-3 py-2 rounded-lg border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All Sender IDs</option>
            <option value="SMSlenzDEMO">SMSlenzDEMO</option>
            <option value="NotifyDEMO">NotifyDEMO</option>
          </select>
          <select
            value={routeFilter}
            onChange={(e) => { setRouteFilter(e.target.value); setPage(1); }}
            aria-label="Filter by Route"
            className="px-3 py-2 rounded-lg border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All Routes</option>
            <option value="Premium Route">Premium Route</option>
            <option value="Default Route">Default Route</option>
            <option value="Economy Route">Economy Route</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold uppercase tracking-wide">Date Filter:</span>
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            aria-label="Start Date"
            className="px-2 py-1 rounded border border-border bg-input-background text-foreground text-xs"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            aria-label="End Date"
            className="px-2 py-1 rounded border border-border bg-input-background text-foreground text-xs"
          />
          {(startDate || endDate || senderFilter !== "ALL" || routeFilter !== "ALL" || statusFilter !== "ALL") && (
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setSenderFilter("ALL");
                setRouteFilter("ALL");
                setPhoneFilter("");
                setStartDate("");
                setEndDate("");
                setSearch("");
                setPage(1);
              }}
              className="px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Reset Filters
            </button>
          )}
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
                    {[
                      "Campaign", "Phone", "Status", "Gateway Message ID", "Sender ID",
                      "Route", "Gateway Response", "Error Code", "Error Description", "Sent At", "Delivered At"
                    ].map((h) => (
                      <th key={h} className="text-left px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-3 font-medium text-foreground max-w-[130px] truncate">{r.campaignName}</td>
                      <td className="px-3 py-3 font-mono text-xs text-foreground">{r.phone}</td>
                      <td className="px-3 py-3"><Badge status={r.status} map={DELIVERY_STATUS_MAP} /></td>
                      <td className="px-3 py-3 font-mono text-xs text-muted-foreground max-w-[110px] truncate" title={r.gatewayMessageId || "—"}>
                        {r.gatewayMessageId || "—"}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-primary font-semibold">{r.senderId || "NotifyDEMO"}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{r.route || "Default Route"}</td>
                      <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground max-w-[120px] truncate" title={r.gatewayResponse || "—"}>
                        {r.gatewayResponse || "200 OK"}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{r.errorCode || "—"}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground max-w-[150px] truncate" title={r.errorDescription || r.failureReason || "—"}>
                        {r.errorDescription || r.failureReason || "—"}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {r.sentAt ? format(parseISO(r.sentAt), "MMM d HH:mm:ss") : "—"}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {r.deliveredAt ? format(parseISO(r.deliveredAt), "MMM d HH:mm:ss") : "—"}
                      </td>
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

