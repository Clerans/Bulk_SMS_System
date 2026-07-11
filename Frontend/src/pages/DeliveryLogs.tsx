import React from "react";
import { Download, RefreshCw, RotateCcw } from "lucide-react";
import { useDeliveryLogs } from "@/features/campaigns/hooks/useCampaigns";
import { DeliveryLog } from "@/api/campaign.api";
import { DataTable, ColumnDef, RowActionDef } from "@/components/ui/data-table";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

const statusCfg: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  delivered: { label: "Delivered", bg: "bg-green-50",   text: "text-green-700",  dot: "bg-green-500"  },
  pending:   { label: "Pending",   bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-400"  },
  failed:    { label: "Failed",    bg: "bg-red-50",     text: "text-red-700",    dot: "bg-red-500"    },
};

function StatusBadge({ status }: { status: string }) {
  const c = statusCfg[status] ?? { label: status, bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap", c.bg, c.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", c.dot)} />
      {c.label}
    </span>
  );
}

export default function DeliveryLogs() {
  const { logs, isLoading, refetch } = useDeliveryLogs();

  const columns: ColumnDef<DeliveryLog>[] = [
    {
      key: "recipient",
      header: "Recipient",
      sortable: true,
      render: (row: DeliveryLog) => <span className="font-semibold text-[#1F2937]">{row.recipient}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      sortable: true,
      render: (row: DeliveryLog) => <span className="font-mono text-xs text-[#64748B]">{row.phone}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row: DeliveryLog) => <StatusBadge status={row.status} />,
    },
    {
      key: "gateway",
      header: "Gateway",
      sortable: true,
      className: "text-xs text-[#64748B]",
    },
    {
      key: "timestamp",
      header: "Timestamp",
      sortable: true,
      className: "text-xs text-[#94A3B8]",
    },
    {
      key: "retry",
      header: "Retry",
      sortable: true,
      align: "center",
      render: (row: DeliveryLog) =>
        row.retry > 0 ? (
          <span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-2 py-0.5 rounded-full">
            {row.retry}x
          </span>
        ) : (
          <span className="text-xs text-[#94A3B8]">—</span>
        ),
    },
    {
      key: "latency",
      header: "Latency",
      sortable: true,
      render: (row: DeliveryLog) => <span className="font-mono text-xs text-[#64748B]">{row.latency}</span>,
    },
    {
      key: "response",
      header: "Response",
      sortable: true,
      render: (row: DeliveryLog) => (
        <span className={cn("text-xs font-semibold", row.response === "OK" ? "text-green-600" : "text-red-500")}>
          {row.response}
        </span>
      ),
    },
  ];

  const rowActions: RowActionDef<DeliveryLog>[] = [
    {
      label: "Retry Dispatch",
      icon: <RotateCcw size={12} />,
      onClick: (row: DeliveryLog) => {
        toast.success(`Retrying SMS dispatch to ${row.phone}`);
      },
    },
  ];

  const filtersConfig = [
    {
      key: "status",
      label: "Status",
      options: [
        { label: "Delivered", value: "delivered" },
        { label: "Pending", value: "pending" },
        { label: "Failed", value: "failed" },
      ],
    },
    {
      key: "gateway",
      label: "Gateway",
      options: [
        { label: "Notify.lk", value: "Notify.lk" },
        { label: "Twilio", value: "Twilio" },
        { label: "Infobip", value: "Infobip" },
        { label: "AWS SNS", value: "AWS SNS" },
      ],
    },
  ];

  return (
    <div className="p-6 space-y-4">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1F2937]">Delivery Logs</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Real-time message delivery analytics and logs</p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#E4EAE2] bg-white text-[#1F2937] hover:bg-[#F8FAF8] transition cursor-pointer"
        >
          <RefreshCw size={12} />
          <span>Refresh</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-[#8EA58C]/20 border-t-[#8EA58C] rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable
          data={logs}
          columns={columns}
          searchPlaceholder="Search recipient name or phone..."
          searchKeys={["recipient", "phone"]}
          filters={filtersConfig}
          rowActions={rowActions}
          exportFilename="delivery_logs_export"
          pageSize={10}
        />
      )}
    </div>
  );
}
