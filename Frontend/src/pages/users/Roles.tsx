import React from "react";
import { Plus, Shield, CheckCircle } from "lucide-react";
import { useRoles } from "@/features/users/hooks/useUsers";
import { UserRole } from "@/api/user.api";
import { toast } from "sonner";

export default function Roles() {
  const { roles, isLoading, createRole } = useRoles();

  const handleCreateRole = async () => {
    try {
      await createRole({
        name: "Support Executive",
        users: 0,
        color: "#A78BFA",
        colorBg: "#F5F3FF",
        desc: "Access customer databases, templates, and view campaigns.",
        perms: ["View Campaigns", "Customer Groups", "Templates"],
      });
      toast.success("Created new system role successfully");
    } catch (e) {
      toast.error("Failed to create role");
    }
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1F2937]">Roles & Permissions</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Control what team members can access in the platform</p>
        </div>
        <button
          onClick={handleCreateRole}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-[#8EA58C] text-white hover:bg-[#7a9278] transition shadow-sm cursor-pointer border-0"
        >
          <Plus size={14} />
          <span>Create Role</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-[#8EA58C]/20 border-t-[#8EA58C] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {roles.map((r: UserRole) => (
            <div
              key={r.name}
              className="bg-white rounded-2xl border border-[#E4EAE2] p-5 hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: r.colorBg }}
                  >
                    <Shield size={20} style={{ color: r.color }} />
                  </div>
                  <span className="text-[10px] font-bold text-[#64748B] bg-[#F8FAF8] border border-[#E4EAE2] px-2.5 py-1 rounded-lg">
                    {r.users} user{r.users !== 1 ? "s" : ""}
                  </span>
                </div>
                <h3 className="font-semibold text-[#1F2937] text-sm mb-1">{r.name}</h3>
                <p className="text-xs text-[#64748B] leading-relaxed mb-4">{r.desc}</p>
                <div className="space-y-1.5 mb-4">
                  {r.perms.map((p: string) => (
                    <div key={p} className="flex items-center gap-2 text-xs text-[#1F2937] font-medium">
                      <CheckCircle size={13} style={{ color: r.color }} className="flex-shrink-0" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-[#F1F5F9]">
                <button
                  onClick={() => toast.info("Edit role permissions", { description: `Editing parameters of "${r.name}".` })}
                  className="flex-1 py-1.5 text-xs font-semibold rounded-lg text-[#64748B] hover:bg-[#EEF4EC] hover:text-[#1F2937] transition bg-transparent border-0 cursor-pointer"
                >
                  Edit Role
                </button>
                {r.name !== "Administrator" && (
                  <button
                    onClick={() => toast.info("Clone role", { description: "Cloning permissions settings." })}
                    className="flex-1 py-1.5 text-xs font-semibold rounded-lg border border-[#E4EAE2] bg-white text-[#1F2937] hover:bg-[#F8FAF8] transition cursor-pointer"
                  >
                    Clone
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
