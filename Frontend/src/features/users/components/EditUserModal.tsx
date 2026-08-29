import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import { userService } from "../../../services/userService";
import type { User, UserRole, UserStatus, UpdateUserRequest } from "../../../types/common";

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserUpdated: (user: User) => void;
  currentUserRole?: UserRole;
}

export function EditUserModal({ isOpen, onClose, user, onUserUpdated, currentUserRole }: EditUserModalProps) {
  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "OPERATOR" as UserRole,
    status: "ACTIVE" as UserStatus,
  });
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSuperAdmin = currentUserRole === "SUPERADMIN";

  useEffect(() => {
    if (user) {
      setForm({
        username: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        password: "",
        confirmPassword: "",
        role: user.role || "OPERATOR",
        status: user.status || "ACTIVE",
      });
      setFormError("");
    }
  }, [user]);

  if (!isOpen || !user) return null;

  async function handleSave() {
    if (!user) return;
    setFormError("");

    if (!form.username.trim()) {
      setFormError("User Name is required.");
      return;
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      setFormError("A valid Email address is required.");
      return;
    }
    if (form.password) {
      if (!isSuperAdmin) {
        setFormError("Only Super Admin can change user passwords.");
        return;
      }
      if (form.password.length < 6) {
        setFormError("Password must be at least 6 characters.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setFormError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload: UpdateUserRequest = {
        name: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        role: form.role,
        status: form.status,
      };

      if (isSuperAdmin && form.password) {
        payload.password = form.password;
      }

      const updated = await userService.updateUser(user.id, payload);
      toast.success(`User "${form.username}" updated successfully.`);
      onUserUpdated(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update user.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
          setFormError("");
        }
      }}
    >
      <Card className="w-full max-w-md p-6 shadow-2xl border border-border animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-semibold text-foreground mb-4">Edit User</h3>
        <div className="space-y-4">
          <Input
            label="User Name"
            placeholder="Enter Your Username"
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="akash@cafechai.lk"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          />
          <Input
            label="Phone Number"
            placeholder="+94771234567 or 0771234567"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            hint="Sri Lankan numbers are normalized automatically."
          />

          {/* Password Section - Super Admin Only */}
          {isSuperAdmin ? (
            <>
              <Input
                label="New Password (optional)"
                type="password"
                placeholder="Leave blank to keep current password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                hint="Super Admin permission: enter new password to reset."
              />
              {form.password ? (
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Confirm new password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                />
              ) : null}
            </>
          ) : (
            <div className="p-3 bg-muted/40 border border-border rounded-lg text-xs text-muted-foreground">
              Password change is restricted to <strong>Super Admin</strong> only.
            </div>
          )}

          <Select
            label="Role Type"
            value={form.role}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))}
          >
            {isSuperAdmin && <option value="SUPERADMIN">Super Admin</option>}
            <option value="ADMIN">Admin</option>
            <option value="OPERATOR">Operator</option>
            <option value="VIEWER">Viewer</option>
          </Select>

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-medium text-foreground">Status</span>
            <button
              type="button"
              role="switch"
              aria-checked={form.status === "ACTIVE"}
              onClick={() =>
                setForm((p) => ({
                  ...p,
                  status: p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                form.status === "ACTIVE" ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.status === "ACTIVE" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {formError && (
            <p className="text-xs text-destructive">{formError}</p>
          )}
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <Button variant="outline" onClick={() => { onClose(); setFormError(""); }}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={loading}>
            <Check className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </Card>
    </div>,
    document.body
  );
}
