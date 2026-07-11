import React from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useUsers } from "@/features/users/hooks/useUsers";
import { SystemUser } from "@/api/user.api";
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

export default function Users() {
  const { users, isLoading, createUser, toggleUserStatus, deleteUser } = useUsers();

  const columns: ColumnDef<SystemUser>[] = [
    {
      key: "name",
      header: "User",
      sortable: true,
      render: (row: SystemUser) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#EEF4EC] text-[#728A72] font-bold text-xs flex items-center justify-center flex-shrink-0">
            {row.avatar}
          </div>
          <span className="font-semibold text-[#1F2937] text-sm">{row.name}</span>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      render: (row: SystemUser) => <span className="text-xs text-[#64748B]">{row.email}</span>,
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      render: (row: SystemUser) => (
        <span className="text-xs font-semibold bg-[#EEF4EC] text-[#728A72] px-2.5 py-1 rounded-full">
          {row.role}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row: SystemUser) => <StatusBadge status={row.status} />,
    },
    {
      key: "lastLogin",
      header: "Last Login",
      sortable: true,
      className: "text-xs text-[#94A3B8]",
    },
  ];

  const rowActions: RowActionDef<SystemUser>[] = [
    {
      label: "Toggle Status",
      icon: <Edit size={12} />,
      onClick: async (row: SystemUser) => {
        const nextStatus = row.status === "active" ? "inactive" : "active";
        try {
          await toggleUserStatus({ id: row.id, status: nextStatus });
          toast.success(`User status changed to ${nextStatus}`);
        } catch (e) {
          toast.error("Failed to toggle status");
        }
      },
    },
    {
      label: "Delete",
      icon: <Trash2 size={12} className="text-[#EF4444]" />,
      className: "hover:bg-red-50 text-[#EF4444]",
      onClick: async (row: SystemUser) => {
        if (confirm(`Are you sure you want to delete user "${row.name}"?`)) {
          try {
            await deleteUser(row.id);
            toast.success("User deleted successfully");
          } catch (e) {
            toast.error("Failed to delete user");
          }
        }
      },
    },
  ];

  const handleInviteUser = async () => {
    try {
      await createUser({
        name: "James Bond",
        email: "bond@company.com",
        role: "Campaign Manager",
        status: "active",
      });
      toast.success("Invited user successfully");
    } catch (e) {
      toast.error("Failed to invite user");
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1F2937]">Users</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Manage team access credentials and security profiles</p>
        </div>
        <button
          onClick={handleInviteUser}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-[#8EA58C] text-white hover:bg-[#7a9278] transition shadow-sm cursor-pointer border-0"
        >
          <Plus size={14} />
          <span>Invite User</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-[#8EA58C]/20 border-t-[#8EA58C] rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable
          data={users}
          columns={columns}
          searchPlaceholder="Search user name or email..."
          searchKeys={["name", "email"]}
          rowActions={rowActions}
          exportFilename="users_export"
          pageSize={10}
        />
      )}
    </div>
  );
}
