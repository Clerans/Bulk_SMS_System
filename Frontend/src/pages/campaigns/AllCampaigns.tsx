import React from "react";
import { useNavigate } from "react-router";
import { Plus, Eye, Edit, Trash2, RefreshCw } from "lucide-react";
import { useCampaigns } from "@/features/campaigns/hooks/useCampaigns";
import { Campaign } from "@/api/campaign.api";
import { DataTable, ColumnDef, RowActionDef } from "@/components/ui/data-table";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

const statusCfg: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft:     { label: "Draft",     bg: "bg-slate-100",  text: "text-slate-600",  dot: "bg-slate-400"  },
  queued:    { label: "Queued",    bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-400"  },
  sending:   { label: "Sending",   bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-500"   },
  running:   { label: "Running",   bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-500"   },
  completed: { label: "Completed", bg: "bg-green-50",   text: "text-green-700",  dot: "bg-green-500"  },
  failed:    { label: "Failed",    bg: "bg-red-50",     text: "text-red-700",    dot: "bg-red-500"    },
  cancelled: { label: "Cancelled", bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400"   },
  paused:    { label: "Paused",    bg: "bg-orange-50",  text: "text-orange-700", dot: "bg-orange-400" },
  scheduled: { label: "Scheduled", bg: "bg-purple-50",  text: "text-purple-700", dot: "bg-purple-400" },
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

export default function AllCampaigns() {
  const navigate = useNavigate();
  const { campaigns, isLoading, deleteCampaign, refetch } = useCampaigns();

  // Column definitions
  const columns: ColumnDef<Campaign>[] = [
    {
      key: "name",
      header: "Campaign",
      sortable: true,
      render: (row: Campaign) => (
        <div>
          <div className="font-semibold text-[#1F2937] text-sm">{row.name}</div>
          <div className="text-[10px] text-[#94A3B8]">{row.createdBy}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row: Campaign) => <StatusBadge status={row.status} />,
    },
    {
      key: "senderId",
      header: "Sender ID",
      sortable: true,
      render: (row: Campaign) => (
        <span className="font-mono text-xs bg-[#EEF4EC] text-[#728A72] px-2 py-0.5 rounded-md font-semibold">
          {row.senderId}
        </span>
      ),
    },
    {
      key: "group",
      header: "Group",
      sortable: true,
      className: "hidden lg:table-cell",
    },
    {
      key: "recipients",
      header: "Recipients",
      sortable: true,
      align: "right",
      render: (row: Campaign) => <span className="font-bold text-[#1F2937]">{row.recipients.toLocaleString()}</span>,
    },
    {
      key: "delivered",
      header: "Delivered",
      sortable: true,
      align: "right",
      className: "hidden md:table-cell",
      render: (row: Campaign) => <span className="text-green-600 font-semibold">{row.delivered.toLocaleString()}</span>,
    },
    {
      key: "failed",
      header: "Failed",
      sortable: true,
      align: "right",
      className: "hidden md:table-cell",
      render: (row: Campaign) => <span className="text-red-500 font-semibold">{row.failed.toLocaleString()}</span>,
    },
    {
      key: "cost",
      header: "Cost",
      sortable: true,
      align: "right",
      className: "hidden lg:table-cell",
      render: (row: Campaign) => <span className="text-[#64748B]">LKR {row.cost.toFixed(2)}</span>,
    },
    {
      key: "createdDate",
      header: "Created",
      sortable: true,
      className: "hidden xl:table-cell text-xs text-[#94A3B8]",
    },
  ];

  // Action items
  const rowActions: RowActionDef<Campaign>[] = [
    {
      label: "View",
      icon: <Eye size={12} />,
      onClick: (row: Campaign) => navigate(`/campaigns/${row.id}`),
    },
    {
      label: "Edit",
      icon: <Edit size={12} />,
      onClick: (row: Campaign) => {
        toast.info("Mock feature", {
          description: `Editing campaign "${row.name}" is restricted.`,
        });
      },
    },
    {
      label: "Delete",
      icon: <Trash2 size={12} className="text-[#EF4444]" />,
      className: "hover:bg-red-50 text-[#EF4444]",
      onClick: async (row: Campaign) => {
        if (confirm(`Are you sure you want to delete campaign "${row.name}"?`)) {
          try {
            await deleteCampaign(row.id);
            toast.success("Campaign deleted successfully");
          } catch (err: any) {
            toast.error("Failed to delete campaign");
          }
        }
      },
    },
  ];

  // Table Filters config
  const filtersConfig = [
    {
      key: "status",
      label: "Status",
      options: [
        { label: "Completed", value: "completed" },
        { label: "Sending", value: "sending" },
        { label: "Running", value: "running" },
        { label: "Draft", value: "draft" },
        { label: "Queued", value: "queued" },
        { label: "Failed", value: "failed" },
        { label: "Paused", value: "paused" },
        { label: "Scheduled", value: "scheduled" },
      ],
    },
    {
      key: "senderId",
      label: "Sender",
      options: [
        { label: "SHOPFAST", value: "SHOPFAST" },
        { label: "AUTHSVC", value: "AUTHSVC" },
        { label: "SECALERT", value: "SECALERT" },
        { label: "SURVEY", value: "SURVEY" },
      ],
    },
  ];

  return (
    <div className="p-6 space-y-4">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1F2937]">Campaigns</h1>
          <p className="text-sm text-[#64748B] mt-0.5">{campaigns.length} total campaigns in system</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#E4EAE2] bg-white text-[#1F2937] hover:bg-[#F8FAF8] transition cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => navigate("/campaigns/create")}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-[#8EA58C] text-white hover:bg-[#7a9278] transition shadow-sm cursor-pointer border-0"
          >
            <Plus size={14} />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-[#8EA58C]/20 border-t-[#8EA58C] rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable
          data={campaigns}
          columns={columns}
          searchPlaceholder="Search campaigns by name or sender..."
          searchKeys={["name", "senderId"]}
          filters={filtersConfig}
          rowActions={rowActions}
          exportFilename="campaigns_export"
          pageSize={10}
        />
      )}
    </div>
  );
}
