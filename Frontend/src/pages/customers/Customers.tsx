import React from "react";
import { Plus, Edit, Trash2, Upload, Download } from "lucide-react";
import { useCustomers, useCustomerGroups } from "@/features/customers/hooks/useCustomers";
import { Customer, CustomerGroup } from "@/api/customer.api";
import { DataTable, ColumnDef, RowActionDef } from "@/components/ui/data-table";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

const statusCfg: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  active:   { label: "Active",    bg: "bg-green-50",   text: "text-green-700",  dot: "bg-green-500"  },
  inactive: { label: "Inactive",  bg: "bg-red-50",     text: "text-red-700",    dot: "bg-red-500"    },
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

export default function Customers() {
  const { customers, isLoading, createCustomer, deleteCustomer } = useCustomers();
  const { groups } = useCustomerGroups();

  // Column definitions
  const columns: ColumnDef<Customer>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (row: Customer) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#EEF4EC] text-[#728A72] font-bold text-xs flex items-center justify-center flex-shrink-0">
            {row.name.split(" ").map((n: string) => n[0]).join("")}
          </div>
          <span className="font-semibold text-[#1F2937] text-sm">{row.name}</span>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      sortable: true,
      render: (row: Customer) => <span className="font-mono text-xs text-[#64748B]">{row.phone}</span>,
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      render: (row: Customer) => <span className="text-xs text-[#64748B]">{row.email}</span>,
    },
    {
      key: "group",
      header: "Group",
      sortable: true,
      className: "text-xs text-[#64748B]",
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row: Customer) => <StatusBadge status={row.status} />,
    },
    {
      key: "added",
      header: "Added Date",
      sortable: true,
      className: "text-xs text-[#94A3B8]",
    },
  ];

  // Actions
  const rowActions: RowActionDef<Customer>[] = [
    {
      label: "Edit Contact",
      icon: <Edit size={12} />,
      onClick: (row: Customer) => {
        toast.info("Mock feature", { description: `Editing "${row.name}" contact is mock-only.` });
      },
    },
    {
      label: "Delete",
      icon: <Trash2 size={12} className="text-[#EF4444]" />,
      className: "hover:bg-red-50 text-[#EF4444]",
      onClick: async (row: Customer) => {
        if (confirm(`Are you sure you want to delete customer "${row.name}"?`)) {
          try {
            await deleteCustomer(row.id);
            toast.success("Contact deleted successfully");
          } catch (e) {
            toast.error("Failed to delete contact");
          }
        }
      },
    },
  ];

  // Custom filters configuration
  const filtersConfig = [
    {
      key: "group",
      label: "Group",
      options: groups.map((g: CustomerGroup) => ({ label: g.name, value: g.name })),
    },
    {
      key: "status",
      label: "Status",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
  ];

  const handleAddContact = async () => {
    try {
      await createCustomer({
        name: "Mock Contact Name",
        phone: "+94770000000",
        email: "mock@domain.com",
        group: "General Customers",
        status: "active",
      });
      toast.success("Added a mock customer contact successfully");
    } catch (e) {
      toast.error("Failed to add mock contact");
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1F2937]">Customers</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Manage customer directory data and segments</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toast.info("CSV Upload", { description: "CSV Importer utility is a simulated process." })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#E4EAE2] bg-white text-[#1F2937] hover:bg-[#F8FAF8] transition cursor-pointer"
          >
            <Upload size={13} />
            <span>Import CSV</span>
          </button>
          <button
            onClick={handleAddContact}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-[#8EA58C] text-white hover:bg-[#7a9278] transition shadow-sm cursor-pointer border-0"
          >
            <Plus size={14} />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-[#8EA58C]/20 border-t-[#8EA58C] rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable
          data={customers}
          columns={columns}
          searchPlaceholder="Search by name, phone or email..."
          searchKeys={["name", "phone", "email"]}
          filters={filtersConfig}
          rowActions={rowActions}
          exportFilename="customers_export"
          pageSize={10}
        />
      )}
    </div>
  );
}
