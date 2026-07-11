import React from "react";
import { Plus, Send, Upload, UserCheck, LogOut, Trash2, Key, Edit, Filter, Download } from "lucide-react";
import { useAuditLogs } from "@/features/reports/hooks/useReports";
import { AuditLog } from "@/api/report.api";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

export default function AuditLogs() {
  const { auditLogs, isLoading } = useAuditLogs();

  const typeColor: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    create: { bg: "bg-green-50", text: "text-green-600", icon: <Plus size={14} /> },
    send: { bg: "bg-blue-50", text: "text-blue-600", icon: <Send size={14} /> },
    import: { bg: "bg-purple-50", text: "text-purple-600", icon: <Upload size={14} /> },
    login: { bg: "bg-[#EEF4EC]", text: "text-[#728A72]", icon: <UserCheck size={14} /> },
    logout: { bg: "bg-slate-50", text: "text-slate-500", icon: <LogOut size={14} /> },
    delete: { bg: "bg-red-50", text: "text-red-600", icon: <Trash2 size={14} /> },
    permission: { bg: "bg-amber-50", text: "text-amber-600", icon: <Key size={14} /> },
    update: { bg: "bg-indigo-50", text: "text-indigo-600", icon: <Edit size={14} /> },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1F2937]">Audit Logs</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Chronological record of all user activities in your organization</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toast.success("Exporting logs...")}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-[#E4EAE2] bg-white text-[#1F2937] hover:bg-[#F8FAF8] transition cursor-pointer"
          >
            <Download size={13} />
            <span>Export Logs</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-[#8EA58C]/20 border-t-[#8EA58C] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E4EAE2] overflow-hidden">
          <div className="relative">
            {auditLogs.map((log: AuditLog, i: number) => {
              const cfg = typeColor[log.type] ?? typeColor.create;
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-4 px-6 py-4 border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAF8] transition-colors"
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center flex-shrink-0 mt-0.5">
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", cfg.bg, cfg.text)}>
                      {cfg.icon}
                    </div>
                    {i < auditLogs.length - 1 && <div className="w-px h-full bg-[#E4EAE2] mt-2 min-h-[16px]" />}
                  </div>

                  <div className="flex-1 pb-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-semibold text-[#1F2937] text-sm">{log.action}</span>
                        <span className="text-xs text-[#64748B] ml-2">
                          by <span className="font-semibold text-[#1F2937]">{log.user}</span>
                        </span>
                      </div>
                      <span className="text-[10px] text-[#94A3B8] font-medium flex-shrink-0">{log.timestamp}</span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-1">{log.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
