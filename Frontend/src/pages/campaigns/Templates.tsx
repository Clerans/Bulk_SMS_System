import React, { useState } from "react";
import { Plus, Eye, Edit, Copy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { templateApi, SmsTemplate } from "@/api/template.api";
import { toast } from "sonner";

export default function Templates() {
  const [preview, setPreview] = useState<number | null>(null);

  const { data: templates = [], isLoading, refetch } = useQuery<SmsTemplate[]>({
    queryKey: ["templates"],
    queryFn: templateApi.list,
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Template copied to clipboard");
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1F2937]">SMS Templates</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Reusable message templates with variable token support</p>
        </div>
        <button
          onClick={() => toast.info("New Template", { description: "Adding templates is a simulated feature." })}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-[#8EA58C] text-white hover:bg-[#7a9278] transition shadow-sm cursor-pointer border-0"
        >
          <Plus size={14} />
          <span>New Template</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-[#8EA58C]/20 border-t-[#8EA58C] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-2xl border border-[#E4EAE2] p-5 hover:shadow-md transition-shadow duration-200 group flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
                  style={{ background: t.catColor }}
                >
                  {t.category}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopy(t.preview)}
                    className="p-1.5 rounded-lg hover:bg-[#EEF4EC] text-[#64748B] cursor-pointer bg-transparent border-0"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    onClick={() => toast.info("Mock feature", { description: "Editing templates is locked." })}
                    className="p-1.5 rounded-lg hover:bg-[#EEF4EC] text-[#64748B] cursor-pointer bg-transparent border-0"
                  >
                    <Edit size={13} />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-[#1F2937] text-sm mb-2">{t.name}</h3>
              <p className="text-xs text-[#64748B] leading-relaxed flex-1 line-clamp-3 mb-4">{t.preview}</p>

              {/* Variables */}
              <div className="flex flex-wrap gap-1 mt-auto">
                {t.variables.map((v) => (
                  <span
                    key={v}
                    className="text-[10px] bg-[#EEF4EC] text-[#728A72] px-2 py-0.5 rounded-md font-mono font-semibold"
                  >
                    {`{${v}}`}
                  </span>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                <span className="text-[11px] text-[#94A3B8]">Used in {t.usedIn} campaigns</span>
                <button
                  onClick={() => setPreview(preview === t.id ? null : t.id)}
                  className="text-xs text-[#8EA58C] font-semibold hover:underline cursor-pointer flex items-center gap-1 bg-transparent border-0"
                >
                  <Eye size={12} />
                  <span>{preview === t.id ? "Hide" : "Preview"}</span>
                </button>
              </div>

              {preview === t.id && (
                <div className="mt-3 p-3 rounded-xl border border-[#E4EAE2] bg-[#F8FAF8]">
                  <div className="text-[10px] text-[#64748B] mb-1.5 font-bold">SMS Preview</div>
                  <div className="text-xs text-[#1F2937] leading-relaxed bg-white rounded-lg p-2.5 border border-[#E4EAE2]">
                    {t.preview}
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-[#94A3B8] font-medium">
                    <span>{t.preview.length} chars</span>
                    <span>{Math.ceil(t.preview.length / 160)} SMS segment</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
