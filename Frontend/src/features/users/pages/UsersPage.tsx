import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Users, Shield, ShieldCheck, ShieldAlert, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { SearchBar } from "../../../components/common/SearchBar";
import { EmptyState } from "../../../components/common/EmptyState";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { AddUserModal } from "../components/AddUserModal";
import { userService } from "../../../services/userService";
import { useAuth } from "../../auth/hooks/useAuth";
import type { User as UserType, UserRole } from "../../../types/common";
import { format, parseISO } from "date-fns";

const USER_ROLE_MAP: Record<UserRole, { label: string; variant: "success" | "warning" | "danger" | "neutral" | "info" }> = {
  SUPERADMIN: { label: "Super Admin", variant: "info" },
  ADMIN:      { label: "Admin",       variant: "success" },
  MANAGER:    { label: "Manager",     variant: "warning" },
  OPERATOR:   { label: "Operator",    variant: "neutral" },
  VIEWER:     { label: "Viewer",      variant: "neutral" },
};

const USER_STATUS_MAP: Record<string, { label: string; variant: "success" | "neutral" | "danger" }> = {
  ACTIVE:   { label: "Active",   variant: "success" },
  INACTIVE: { label: "Inactive", variant: "neutral" },
};

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await userService.getUsers({ limit: 100 });
      setUsers(res.items);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q));
      const matchRole = roleFilter === "ALL" || u.role === roleFilter;
      const matchStatus = statusFilter === "ALL" || (u.status || "ACTIVE") === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  function handleUserAdded(newUser: UserType) {
    setUsers((prev) => [newUser, ...prev]);
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await userService.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success("User deleted successfully.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user.");
    } finally {
      setDeleting(false);
      setDeleteUserId(null);
    }
  }

  const isSuperAdmin = currentUser?.role === "SUPERADMIN";
  const userToDelete = users.find((u) => u.id === deleteUserId);

  function canDeleteUser(targetUser: UserType): { allowed: boolean; reason?: string } {
    if (targetUser.id === currentUser?.id) {
      return { allowed: false, reason: "You cannot delete your own account" };
    }
    if (targetUser.role === "SUPERADMIN") {
      return { allowed: false, reason: "Super Admin accounts cannot be deleted" };
    }
    if (targetUser.role === "ADMIN" && !isSuperAdmin) {
      return { allowed: false, reason: "Only Super Admin can delete an Admin user" };
    }
    return { allowed: true };
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage system administrators, operators, role-based access, and permissions."
        actions={
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Add User
          </Button>
        }
      />

      {/* Search & Filter Toolbar matching ContactsPage */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name, email, or phone..."
            className="flex-1"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-input-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPERADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="OPERATOR">Operator</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-input-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </Card>

      {/* Users table */}
      <Card className="mb-6">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description="Create your first system administrator or operator to get started."
            action={
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4" />
                Add User
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Name", "Email", "Phone", "Role", "Status", "Created Date", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const delPerm = canDeleteUser(u);
                  const isCurrent = u.id === currentUser?.id;

                  return (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {u.name}
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.phone || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge
                          status={u.role}
                          map={USER_ROLE_MAP as any}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          status={u.status || "ACTIVE"}
                          map={USER_STATUS_MAP as any}
                        />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.created_at ? format(parseISO(u.created_at), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {delPerm.allowed ? (
                          <button
                            onClick={() => setDeleteUserId(u.id)}
                            aria-label={`Remove ${u.name}`}
                            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            disabled
                            title={delPerm.reason}
                            className="p-1.5 text-muted-foreground/30 cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">{filtered.length} user{filtered.length !== 1 ? "s" : ""} shown</p>
            </div>
          </div>
        )}
      </Card>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onUserAdded={handleUserAdded}
        currentUserRole={currentUser?.role}
      />

      {/* Delete User Confirmation */}
      <ConfirmDialog
        open={!!deleteUserId}
        title="Remove user?"
        description={`"${userToDelete?.name ?? "This user"}" will be permanently removed from the system.`}
        confirmLabel="Remove"
        danger
        onConfirm={() => deleteUserId && handleDelete(deleteUserId)}
        onCancel={() => setDeleteUserId(null)}
      />
    </div>
  );
}
