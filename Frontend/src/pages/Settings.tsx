import React, { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Building2,
  Hash,
  Key,
  Shield,
  Clock,
  Bell,
  Upload,
  Plus,
  Copy,
  Trash2,
  Settings as SettingsIcon,
  Pause,
  Play,
  Zap,
  Activity,
  CheckCircle,
  BarChart3,
} from "lucide-react";
import {
  useCompanySettings,
  useApiKeys,
  useSecuritySettings,
  useGateways,
} from "@/features/settings/hooks/useSettings";
import { SmsGateway, ApiKey, SecuritySetting } from "@/api/settings.api";
import { FormField, Input, Select, Switch } from "@/components/ui/form-controls";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("company");

  const { companyInfo, updateCompany, isLoading: loadingCompany } = useCompanySettings();
  const { apiKeys, isLoading: loadingKeys } = useApiKeys();
  const { securitySettings, toggleSecurity, isLoading: loadingSecurity } = useSecuritySettings();
  const { gateways, toggleGatewayStatus, isLoading: loadingGateways } = useGateways();

  const tabs = [
    { id: "company", label: "Company", icon: <Building2 size={15} /> },
    { id: "gateways", label: "SMS Gateways", icon: <Activity size={15} /> },
    { id: "senderids", label: "Sender IDs", icon: <Hash size={15} /> },
    { id: "apikeys", label: "API Keys", icon: <Key size={15} /> },
    { id: "security", label: "Security", icon: <Shield size={15} /> },
    { id: "hours", label: "Business Hours", icon: <Clock size={15} /> },
    { id: "notif", label: "Notifications", icon: <Bell size={15} /> },
  ];

  // Company info form
  const { register, handleSubmit } = useForm({
    values: companyInfo || {
      name: "",
      email: "",
      phone: "",
      country: "",
      timezone: "",
      industry: "",
    },
  });

  const onCompanySubmit = async (data: any) => {
    try {
      await updateCompany(data);
      toast.success("Company settings saved successfully");
    } catch (e) {
      toast.error("Failed to save settings");
    }
  };

  const handleCopyKey = (keyText: string) => {
    navigator.clipboard.writeText(keyText);
    toast.success("API key copied to clipboard");
  };

  const isPageLoading = loadingCompany || loadingKeys || loadingSecurity || loadingGateways;

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 mb-6">
        <h1 className="text-xl font-bold text-[#1F2937]">Settings</h1>
        <p className="text-sm text-[#64748B]">Manage account preferences, credentials, and API connection gateways</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-48 flex-shrink-0">
          <div className="flex md:flex-col flex-wrap gap-1 bg-[#EEF4EC] md:bg-transparent p-1 md:p-0 rounded-xl">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border-0 w-full text-left justify-start",
                  activeTab === t.id
                    ? "bg-[#EEF4EC] text-[#8EA58C] md:bg-[#EEF4EC] md:text-[#8EA58C]"
                    : "text-[#64748B] hover:bg-[#F8FAF8] hover:text-[#1F2937]"
                )}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contents area */}
        <div className="flex-1">
          {isPageLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#8EA58C]/20 border-t-[#8EA58C] rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Company Info tab */}
              {activeTab === "company" && (
                <form onSubmit={handleSubmit(onCompanySubmit)} className="bg-white rounded-2xl border border-[#E4EAE2] p-6 space-y-6">
                  <div>
                    <h3 className="font-semibold text-[#1F2937] text-sm mb-4">Company Information</h3>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-[#EEF4EC] flex items-center justify-center">
                        <Building2 size={28} className="text-[#8EA58C]" />
                      </div>
                      <div>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E4EAE2] bg-white text-[#1F2937] hover:bg-[#F8FAF8] transition cursor-pointer"
                        >
                          <Upload size={12} />
                          <span>Upload Logo</span>
                        </button>
                        <p className="text-[10px] text-[#94A3B8] mt-1.5">PNG, JPG up to 2MB. Recommended 200x200px.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="Company Name">
                        <Input {...register("name")} />
                      </FormField>
                      <FormField label="Business Email">
                        <Input type="email" {...register("email")} />
                      </FormField>
                      <FormField label="Phone Number">
                        <Input {...register("phone")} />
                      </FormField>
                      <FormField label="Country">
                        <Input {...register("country")} />
                      </FormField>
                      <FormField label="Timezone">
                        <Input {...register("timezone")} />
                      </FormField>
                      <FormField label="Industry">
                        <Input {...register("industry")} />
                      </FormField>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t border-[#E4EAE2]">
                    <button
                      type="button"
                      className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#E4EAE2] bg-white text-[#1F2937] hover:bg-[#F8FAF8] transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#8EA58C] text-white hover:bg-[#7a9278] transition cursor-pointer border-0"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              )}

              {/* SMS Gateways tab */}
              {activeTab === "gateways" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {gateways.map((g: SmsGateway) => {
                    const usagePct = Math.round((g.dailyUsage / g.maxDaily) * 100);
                    return (
                      <div key={g.id} className="bg-white rounded-2xl border border-[#E4EAE2] p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                              style={{ background: g.color }}
                            >
                              {g.abbr}
                            </div>
                            <div>
                              <h3 className="font-semibold text-sm text-[#1F2937]">{g.name}</h3>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5",
                                  g.status === "active" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                )}
                              >
                                <span className={cn("w-1.5 h-1.5 rounded-full", g.status === "active" ? "bg-green-500" : "bg-red-500")} />
                                {g.status === "active" ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {[
                            { label: "Latency", value: g.latency, icon: <Zap size={11} /> },
                            { label: "API Health", value: g.status === "active" ? `${g.health}%` : "—", icon: <Activity size={11} /> },
                            { label: "Success Rate", value: `${g.successRate}%`, icon: <CheckCircle size={11} /> },
                            { label: "Today's Usage", value: g.dailyUsage.toLocaleString(), icon: <BarChart3 size={11} /> },
                          ].map((m) => (
                            <div key={m.label} className="rounded-xl p-2.5 bg-[#F8FAF8] border border-[#F1F5F9]">
                              <div className="flex items-center gap-1 text-[#94A3B8] mb-0.5">
                                {m.icon}
                                <span className="text-[10px] font-semibold">{m.label}</span>
                              </div>
                              <div className="text-xs font-bold text-[#1F2937]">{m.value}</div>
                            </div>
                          ))}
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] text-[#64748B] mb-1 font-semibold">
                            <span>Daily Limit Usage</span>
                            <span>{usagePct}% of {g.maxDaily.toLocaleString()}</span>
                          </div>
                          <div className="h-1.5 bg-[#EEF4EC] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${usagePct}%`,
                                background: usagePct > 80 ? "#EF4444" : usagePct > 60 ? "#F59E0B" : g.color,
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <button
                            type="button"
                            onClick={() => toast.info("Configure connection parameters")}
                            className="flex-1 py-1.5 text-xs font-semibold rounded-lg text-[#64748B] hover:bg-[#EEF4EC] hover:text-[#1F2937] transition bg-transparent border-0 cursor-pointer"
                          >
                            Configure
                          </button>
                          {g.status === "active" ? (
                            <button
                              type="button"
                              onClick={() => toggleGatewayStatus({ id: g.id, status: "inactive" })}
                              className="flex-1 py-1.5 text-xs font-semibold rounded-lg border border-[#E4EAE2] bg-white text-orange-600 hover:bg-orange-50 transition cursor-pointer"
                            >
                              Pause
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleGatewayStatus({ id: g.id, status: "active" })}
                              className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-[#8EA58C] text-white hover:bg-[#7a9278] transition cursor-pointer border-0"
                            >
                              Enable
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* API Keys tab */}
              {activeTab === "apikeys" && (
                <div className="bg-white rounded-2xl border border-[#E4EAE2] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[#1F2937] text-sm">API credentials Keys</h3>
                    <button
                      onClick={() => toast.success("Generated new credentials")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#8EA58C] text-white hover:bg-[#7a9278] transition shadow-sm cursor-pointer border-0"
                    >
                      <Plus size={12} />
                      <span>Generate Key</span>
                    </button>
                  </div>
                  {apiKeys.map((k: ApiKey) => (
                    <div key={k.name} className="border border-[#E4EAE2] rounded-xl p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-xs text-[#1F2937]">{k.name}</div>
                          <div className="font-mono text-xs text-[#64748B] mt-1 bg-[#F8FAF8] px-2 py-1 rounded-lg border border-[#E4EAE2] select-all">
                            {k.key}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleCopyKey(k.key)}
                            className="p-1.5 rounded-lg hover:bg-[#EEF4EC] text-[#64748B] cursor-pointer bg-transparent border-0"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            onClick={() => toast.error("Cannot delete staging keys")}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-[#EF4444] cursor-pointer bg-transparent border-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-4 text-[10px] text-[#94A3B8] font-medium pt-1">
                        <span>Created: {k.created}</span>
                        <span>Last used: {k.lastUsed}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Security settings tab */}
              {activeTab === "security" && (
                <div className="bg-white rounded-2xl border border-[#E4EAE2] p-6 space-y-5">
                  <h3 className="font-semibold text-sm text-[#1F2937]">Security Settings</h3>
                  {securitySettings.map((s: SecuritySetting) => (
                    <div key={s.label} className="flex items-center justify-between py-3 border-b border-[#F1F5F9] last:border-0">
                      <div>
                        <div className="font-semibold text-xs text-[#1F2937]">{s.label}</div>
                        <div className="text-[11px] text-[#64748B] mt-0.5">{s.desc}</div>
                      </div>
                      <Switch checked={s.enabled} onChange={() => toggleSecurity(s.label)} />
                    </div>
                  ))}
                </div>
              )}

              {/* Placeholder tabs */}
              {(activeTab === "senderids" || activeTab === "hours" || activeTab === "notif") && (
                <div className="bg-white rounded-2xl border border-[#E4EAE2] p-6 text-center py-16">
                  <SettingsIcon size={32} className="text-[#94A3B8] mx-auto mb-3" />
                  <h3 className="font-semibold text-[#1F2937] text-sm">
                    {tabs.find((t) => t.id === activeTab)?.label}
                  </h3>
                  <p className="text-xs text-[#64748B] mt-1">Configure {tabs.find((t) => t.id === activeTab)?.label.toLowerCase()} settings for SMS broadcasts.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
