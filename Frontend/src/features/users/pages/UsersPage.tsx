import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, ShieldCheck, Shield, User, Search, ShieldAlert, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { SearchBar } from "../../../components/common/SearchBar";
import { EmptyState } from "../../../components/common/EmptyState";
import { AddUserModal } from "../components/AddUserModal";
import { userService } from "../../../services/userService";
import { useAuth } from "../../auth/hooks/useAuth";
import type { User as UserType, UserRole } from "../../../types/common";
import { format, parseISO } from "date-fns";

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
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

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q));
      const matchRole = roleFilter === "ALL" || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  function handleUserAdded(newUser: UserType) {
    setUsers((prev) => [newUser, ...prev]);
  }

  async function handleDeleteConfirm() {
    if (!deleteUserId) return;
    setDeleting(true);
    try {
      await userService.deleteUser(deleteUserId);
      setUsers((prev) => prev.filter((u) => u.id !== deleteUserId));
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

  const roleBadgeMap: Record<UserRole, { label: string; bg: string; text: string; icon: typeof Shield }> = {
    SUPERADMIN: { label: "Super Admin", bg: "bg-purple-100 dark:bg-purple-950/60", text: "text-purple-700 dark:text-purple-300", icon: ShieldAlert },
    ADMIN:      { label: "Admin",       bg: "bg-blue-100 dark:bg-blue-950/60",     text: "text-blue-700 dark:text-blue-300",     icon: ShieldCheck },
    MANAGER:    { label: "Manager",     bg: "bg-cyan-100 dark:bg-cyan-950/60",     text: "text-cyan-700 dark:text-cyan-300",     icon: Shield },
    OPERATOR:   { label: "Operator",    bg: "bg-emerald-100 dark:bg-emerald-950/60", text: "text-emerald-700 dark:text-emerald-300", icon: User },
    VIEWER:     { label: "Viewer",      bg: "bg-slate-100 dark:bg-slate-800",     text: "text-slate-700 dark:text-slate-300",     icon: User },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage system administrators, operators, role-based access control, and user permissions."
        actions={
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add New User
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search users by name, email, or mobile..."
          className="w-full sm:w-80"
        />

        <div className="flex gap-2 items-center w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPERADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="OPERATOR">Operator</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden border border-slate-200/80 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Mobile</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <EmptyState
                      icon={User}
                      title="No users found"
                      description={search ? "Try adjusting your search filters." : "Create your first system user."}
                    />
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleConfig = roleBadgeMap[u.role] || roleBadgeMap.VIEWER;
                  const RoleIcon = roleConfig.icon;
                  const delPerm = canDeleteUser(u);
                  const isCurrent = u.id === currentUser?.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-sm flex-shrink-0">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                              {u.name}
                              {isCurrent && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {u.phone || <span className="text-slate-400">—</span>}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${roleConfig.bg} ${roleConfig.text}`}>
                          <RoleIcon className="w-3.5 h-3.5" />
                          {roleConfig.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {u.status || "ACTIVE"}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {u.created_at ? format(parseISO(u.created_at), "MMM d, yyyy") : "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {delPerm.allowed ? (
                          <button
                            onClick={() => setDeleteUserId(u.id)}
                            title="Delete User"
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            disabled
                            title={delPerm.reason}
                            className="p-1.5 text-slate-300 dark:text-slate-700 cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onUserAdded={handleUserAdded}
        currentUserRole={currentUser?.role}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteUserId}
        title="Delete User"
        message={`Are you sure you want to delete user "${userToDelete?.name}" (${userToDelete?.email})? This action cannot be undone.`}
        confirmLabel="Delete User"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteUserId(null)}
      />
    </div>
  );
}
