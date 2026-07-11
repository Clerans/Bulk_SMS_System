import React from "react";
import { Plus, Send, MoreHorizontal } from "lucide-react";
import { useCustomerGroups } from "@/features/customers/hooks/useCustomers";
import { iconMap, CustomerGroup } from "@/api/customer.api";
import { toast } from "sonner";

export default function CustomerGroups() {
  const { groups, isLoading, createGroup } = useCustomerGroups();

  const handleCreateGroup = async () => {
    try {
      await createGroup({
        name: "New Promo Segment",
        description: "Auto-generated promotional segment group",
        iconName: "Target",
        color: "#22C55E",
        colorBg: "#F0FDF4",
      });
      toast.success("Created new customer group successfully");
    } catch (e) {
      toast.error("Failed to create group");
    }
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1F2937]">Customer Groups</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Organize contacts into targeted segments</p>
        </div>
        <button
          onClick={handleCreateGroup}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-[#8EA58C] text-white hover:bg-[#7a9278] transition shadow-sm cursor-pointer border-0"
        >
          <Plus size={14} />
          <span>New Group</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-[#8EA58C]/20 border-t-[#8EA58C] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g: CustomerGroup) => {
            // Resolve component icon dynamically
            const IconComponent = iconMap[g.iconName] || iconMap.Users;
            return (
              <div
                key={g.id}
                className="bg-white rounded-2xl border border-[#E4EAE2] p-5 hover:shadow-md transition-shadow duration-200 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: g.colorBg }}
                    >
                      <IconComponent size={22} style={{ color: g.color }} />
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-[#F8FAF8] text-[#94A3B8] cursor-pointer bg-transparent border-0">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                  <h3 className="font-semibold text-[#1F2937] text-sm mb-1">{g.name}</h3>
                  <p className="text-xs text-[#64748B] leading-relaxed mb-4">{g.description}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <div className="text-xl font-bold text-[#1F2937]">{g.members.toLocaleString()}</div>
                      <div className="text-[10px] text-[#94A3B8] font-semibold uppercase">members</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#1F2937]">{g.campaigns}</div>
                      <div className="text-[10px] text-[#94A3B8] font-semibold uppercase">campaigns</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                    <span className="text-[10px] text-[#94A3B8]">Last used: {g.lastUsed}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toast.info("View segment", { description: "Viewing contact list of group" })}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-[#64748B] hover:bg-[#EEF4EC] hover:text-[#1F2937] transition bg-transparent border-0 cursor-pointer"
                      >
                        View
                      </button>
                      <button
                        onClick={() => toast.info("Send campaign", { description: "Navigating to create campaign with group selected" })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E4EAE2] bg-white text-[#1F2937] hover:bg-[#F8FAF8] transition cursor-pointer"
                      >
                        <Send size={10} />
                        <span>Send SMS</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add new group placeholder card */}
          <div
            onClick={handleCreateGroup}
            className="bg-[#F8FAF8] rounded-2xl border-2 border-dashed border-[#E4EAE2] p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#8EA58C] hover:bg-[#EEF4EC] transition-all group min-h-48"
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#E4EAE2] flex items-center justify-center group-hover:border-[#8EA58C] transition-colors">
              <Plus size={22} className="text-[#94A3B8] group-hover:text-[#8EA58C] transition-colors" />
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-[#64748B] group-hover:text-[#8EA58C] transition-colors">
                Create New Group
              </div>
              <div className="text-xs text-[#94A3B8] mt-0.5">Import CSV or add manually</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
