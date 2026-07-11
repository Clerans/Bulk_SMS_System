import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { Send, Upload, ChevronRight, AlertTriangle, Info } from "lucide-react";
import { useCampaigns } from "@/features/campaigns/hooks/useCampaigns";
import { useCustomerGroups } from "@/features/customers/hooks/useCustomers";
import { CustomerGroup } from "@/api/customer.api";
import { campaignSchema, CampaignFormFields } from "@/features/campaigns/schemas/campaign.schema";
import { FormField, Input, Textarea, Select, Switch } from "@/components/ui/form-controls";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

export default function CreateCampaign() {
  const navigate = useNavigate();
  const { createCampaign, isCreating } = useCampaigns();
  const { groups } = useCustomerGroups();

  const [message, setMessage] = useState("Hi {name}! Your exclusive offer is ready. Get 20% OFF with code SAVE20. Valid until Jan 31, 2025. Shop now!");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CampaignFormFields>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "January Promo Campaign",
      description: "",
      senderId: "SHOPFAST",
      priority: "Normal",
      messageBody: "Hi {name}! Your exclusive offer is ready. Get 20% OFF with code SAVE20. Valid until Jan 31, 2025. Shop now!",
      recipientMode: "group",
      customerGroup: "VIP Members",
      manualRecipients: "",
      scheduleMode: "now",
      scheduleDate: "2025-01-15",
      scheduleTime: "09:00",
      trackDelivery: true,
      retryFailed: true,
      removeDuplicates: true,
      businessHoursOnly: false,
    },
  });

  // Watch field values for UI toggles
  const recipientMode = watch("recipientMode");
  const scheduleMode = watch("scheduleMode");

  // Sync state for preview
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setValue("messageBody", e.target.value, { shouldValidate: true });
  };

  const charCount = message.length;
  const isUnicode = /[^\x00-\x7F]/.test(message);
  // SMS segment sizing: 160 chars for normal GSM, 70 chars for Unicode
  const segmentLimit = isUnicode ? 70 : 160;
  const segments = Math.ceil(charCount / segmentLimit) || 1;

  // Recipients count estimation
  let recipientsCount = 67890;
  if (recipientMode === "manual") {
    const raw = watch("manualRecipients") || "";
    recipientsCount = raw.split(/\r?\n/).filter(Boolean).length || 0;
  } else if (recipientMode === "group") {
    const selectedG = watch("customerGroup");
    const found = groups.find((g: CustomerGroup) => g.name === selectedG);
    recipientsCount = found ? found.members : 0;
  } else {
    // CSV
    recipientsCount = 1250; // Mock CSV file upload estimate
  }

  const estimatedCost = recipientsCount * segments * 0.005;

  const onSubmit = async (data: CampaignFormFields) => {
    try {
      await createCampaign({
        name: data.name,
        description: data.description,
        senderId: data.senderId,
        priority: data.priority,
        messageBody: data.messageBody,
        recipientMode: data.recipientMode,
        customerGroup: data.customerGroup,
        manualRecipients: data.manualRecipients,
        scheduleMode: data.scheduleMode,
        scheduleDate: data.scheduleDate,
        scheduleTime: data.scheduleTime,
        trackDelivery: data.trackDelivery,
        retryFailed: data.retryFailed,
        removeDuplicates: data.removeDuplicates,
        businessHoursOnly: data.businessHoursOnly,
        recipients: recipientsCount,
      });

      toast.success("Campaign created successfully", {
        description: data.scheduleMode === "now" ? "Dispatching messages..." : `Scheduled for ${data.scheduleDate} at ${data.scheduleTime}`,
      });
      navigate("/campaigns");
    } catch (err: any) {
      toast.error("Failed to create campaign", {
        description: err.message || "Something went wrong.",
      });
    }
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate("/campaigns")}
          className="flex items-center gap-1 text-sm text-[#64748B] hover:text-[#1F2937] transition-colors cursor-pointer bg-transparent border-0"
        >
          <ChevronRight size={14} className="rotate-180" />
          <span>Back to Campaigns</span>
        </button>
      </div>

      <div className="flex flex-col gap-1 mb-6">
        <h1 className="text-xl font-bold text-[#1F2937]">Create Campaign</h1>
        <p className="text-sm text-[#64748B]">Set up and launch your SMS campaign</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left pane: input forms */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Section 1: Campaign Info */}
          <div className="bg-white rounded-2xl border border-[#E4EAE2] p-5">
            <h3 className="font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#8EA58C] text-white text-xs flex items-center justify-center flex-shrink-0">1</span>
              Campaign Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <FormField label="Campaign Name" error={errors.name?.message} required>
                  <Input error={!!errors.name} {...register("name")} />
                </FormField>
              </div>
              <div className="sm:col-span-2">
                <FormField label="Description" error={errors.description?.message}>
                  <Input placeholder="Optional campaign details..." {...register("description")} />
                </FormField>
              </div>
              <div>
                <FormField label="Sender ID" error={errors.senderId?.message} required>
                  <Select error={!!errors.senderId} {...register("senderId")}>
                    <option value="SHOPFAST">SHOPFAST</option>
                    <option value="TECHSVC">TECHSVC</option>
                    <option value="SECALERT">SECALERT</option>
                  </Select>
                </FormField>
              </div>
              <div>
                <FormField label="Priority">
                  <Select {...register("priority")}>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Low">Low</option>
                  </Select>
                </FormField>
              </div>
            </div>
          </div>

          {/* Section 2: Message Body */}
          <div className="bg-white rounded-2xl border border-[#E4EAE2] p-5">
            <h3 className="font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#8EA58C] text-white text-xs flex items-center justify-center flex-shrink-0">2</span>
              Message Body
            </h3>
            {/* Dynamic tag inserters */}
            <div className="flex gap-2 mb-2 flex-wrap">
              {["name", "phone", "date", "link", "code"].map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => {
                    const tag = `{${v}}`;
                    setMessage((m) => m + tag);
                    setValue("messageBody", message + tag, { shouldValidate: true });
                  }}
                  className="text-xs bg-[#EEF4EC] text-[#728A72] px-2.5 py-1 rounded-lg font-mono hover:bg-[#E4EAE2] cursor-pointer transition-colors border-0"
                >
                  {`{${v}}`}
                </button>
              ))}
            </div>

            <FormField error={errors.messageBody?.message}>
              <Textarea
                rows={4}
                value={message}
                onChange={handleMessageChange}
                className="resize-none"
                error={!!errors.messageBody}
              />
            </FormField>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3 text-xs text-[#64748B]">
                <span>{charCount} characters</span>
                <span className="text-[#94A3B8]">·</span>
                <span>
                  {segments} SMS segment{segments !== 1 ? "s" : ""}
                </span>
                {charCount > segmentLimit && (
                  <span className="text-amber-600 font-semibold">Multi-part message</span>
                )}
              </div>
              <div className="text-xs">
                <span
                  className={cn(
                    "font-semibold",
                    charCount > segmentLimit * 2
                      ? "text-red-500"
                      : charCount > segmentLimit
                      ? "text-amber-600"
                      : "text-green-600"
                  )}
                >
                  {charCount}/{segmentLimit}
                </span>
              </div>
            </div>

            {/* Unicode Warning */}
            {isUnicode && (
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                <AlertTriangle size={13} className="flex-shrink-0" />
                <span>Unicode characters detected — SMS limit reduced to 70 chars per segment</span>
              </div>
            )}
          </div>

          {/* Section 3: Recipients */}
          <div className="bg-white rounded-2xl border border-[#E4EAE2] p-5">
            <h3 className="font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#8EA58C] text-white text-xs flex items-center justify-center flex-shrink-0">3</span>
              Recipients
            </h3>
            {/* Mode selection buttons */}
            <div className="flex gap-2 mb-4">
              {[
                { k: "group", l: "Customer Group" },
                { k: "csv", l: "Upload CSV" },
                { k: "manual", l: "Manual Entry" },
              ].map(({ k, l }) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setValue("recipientMode", k as any)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                    recipientMode === k
                      ? "bg-[#8EA58C] text-white border-[#8EA58C]"
                      : "bg-white text-[#64748B] border-[#E4EAE2] hover:border-[#8EA58C]"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>

            {recipientMode === "group" && (
              <FormField label="Select Group" error={errors.customerGroup?.message}>
                <Select {...register("customerGroup")}>
                  {groups.map((g: CustomerGroup) => (
                    <option key={g.id} value={g.name}>
                      {g.name} ({g.members.toLocaleString()} contacts)
                    </option>
                  ))}
                </Select>
              </FormField>
            )}

            {recipientMode === "csv" && (
              <div className="border-2 border-dashed border-[#E4EAE2] rounded-xl p-8 text-center hover:border-[#8EA58C] transition-colors cursor-pointer bg-[#F8FAF8]">
                <Upload size={24} className="text-[#94A3B8] mx-auto mb-2" />
                <div className="text-sm font-semibold text-[#64748B]">Drop your CSV file here or click to browse</div>
                <div className="text-[11px] text-[#94A3B8] mt-1">Requires a "phone" column. Max 100,000 rows.</div>
              </div>
            )}

            {recipientMode === "manual" && (
              <FormField label="Enter Phone Numbers (one per line)" error={errors.manualRecipients?.message}>
                <Textarea
                  placeholder="+94771234567&#10;+94712345678&#10;+94759876543"
                  rows={4}
                  className="font-mono text-xs"
                  {...register("manualRecipients")}
                />
              </FormField>
            )}
          </div>

          {/* Section 4: Schedule */}
          <div className="bg-white rounded-2xl border border-[#E4EAE2] p-5">
            <h3 className="font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#8EA58C] text-white text-xs flex items-center justify-center flex-shrink-0">4</span>
              Schedule
            </h3>
            <div className="flex gap-2 mb-4">
              {[
                { k: "now", l: "Send Now" },
                { k: "later", l: "Schedule Later" },
                { k: "recurring", l: "Recurring" },
              ].map(({ k, l }) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setValue("scheduleMode", k as any)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                    scheduleMode === k
                      ? "bg-[#8EA58C] text-white border-[#8EA58C]"
                      : "bg-white text-[#64748B] border-[#E4EAE2] hover:border-[#8EA58C]"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>

            {scheduleMode === "now" && (
              <p className="text-xs text-[#64748B] flex items-center gap-1.5 bg-[#EEF4EC] p-3 rounded-xl">
                <Info size={13} className="text-[#8EA58C] flex-shrink-0" />
                <span>Campaign will be dispatched immediately after approval.</span>
              </p>
            )}

            {scheduleMode === "later" && (
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Date" error={errors.scheduleDate?.message}>
                  <Input type="date" {...register("scheduleDate")} />
                </FormField>
                <FormField label="Time" error={errors.scheduleTime?.message}>
                  <Input type="time" {...register("scheduleTime")} />
                </FormField>
              </div>
            )}

            {scheduleMode === "recurring" && (
              <FormField label="Select Interval">
                <Select>
                  <option>Daily at 09:00 AM</option>
                  <option>Weekly on Monday</option>
                  <option>Monthly on 1st</option>
                </Select>
              </FormField>
            )}
          </div>

          {/* Section 5: Advanced Controls */}
          <div className="bg-white rounded-2xl border border-[#E4EAE2] p-5">
            <h3 className="font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#8EA58C] text-white text-xs flex items-center justify-center flex-shrink-0">5</span>
              Advanced Settings
            </h3>
            <div className="space-y-3">
              {[
                { name: "trackDelivery", label: "Track Delivery Reports", desc: "Receive delivery status for each message" },
                { name: "retryFailed", label: "Retry Failed Messages", desc: "Automatically retry failed messages up to 3 times" },
                { name: "removeDuplicates", label: "Remove Duplicates", desc: "Filter out duplicate phone numbers before sending" },
                { name: "businessHoursOnly", label: "Business Hours Only", desc: "Only send messages between 8 AM and 8 PM local time" },
              ].map((s) => (
                <div key={s.name} className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                  <div>
                    <div className="text-sm font-semibold text-[#1F2937]">{s.label}</div>
                    <div className="text-xs text-[#64748B] mt-0.5">{s.desc}</div>
                  </div>
                  <Controller
                    control={control}
                    name={s.name as any}
                    render={({ field: { value, onChange } }) => (
                      <Switch checked={!!value} onChange={onChange} />
                    )}
                  />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right pane: visual mock preview + summary card */}
        <div className="space-y-4">
          
          {/* Smartphone visual frame */}
          <div className="bg-white rounded-2xl border border-[#E4EAE2] p-5">
            <h3 className="font-semibold text-[#1F2937] text-xs mb-4">SMS Preview</h3>
            <div className="flex flex-col items-center">
              <div className="w-48 bg-[#1F2937] rounded-3xl p-3 shadow-lg border border-[#E4EAE2]">
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3" />
                <div className="bg-white rounded-2xl p-3 text-[10px] text-[#1F2937] leading-relaxed">
                  <div className="text-[9px] text-[#94A3B8] font-bold mb-1">SHOPFAST</div>
                  {message || <span className="text-gray-400 italic">Your message will appear here…</span>}
                </div>
                <div className="text-[8px] text-white/40 text-right mt-2 mr-1">Now</div>
              </div>
            </div>
          </div>

          {/* Campaign Summary card */}
          <div className="bg-white rounded-2xl border border-[#E4EAE2] p-5 sticky top-20">
            <h3 className="font-semibold text-[#1F2937] text-sm mb-4">Campaign Summary</h3>
            <div className="space-y-3">
              {[
                { label: "Recipients", value: `${recipientsCount.toLocaleString()} contacts` },
                { label: "SMS Segments", value: `${segments} per message` },
                { label: "Total Messages", value: (recipientsCount * segments).toLocaleString() },
                { label: "Gateway", value: "Notify.lk (Auto)" },
                { label: "Schedule", value: scheduleMode === "now" ? "Immediate" : scheduleMode === "later" ? "Scheduled" : "Recurring" },
              ].map((f) => (
                <div key={f.label} className="flex justify-between items-center py-2 border-b border-[#F1F5F9] last:border-0 text-xs">
                  <span className="text-[#64748B]">{f.label}</span>
                  <span className="font-semibold text-[#1F2937]">{f.value}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-[#EEF4EC] rounded-xl">
              <div className="text-[10px] text-[#64748B]">Estimated cost</div>
              <div className="text-lg font-bold text-[#1F2937] mt-0.5">LKR {estimatedCost.toFixed(2)}</div>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-2.5 bg-[#8EA58C] text-white font-semibold rounded-xl hover:bg-[#7a9278] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border-0"
              >
                <Send size={14} />
                <span>{scheduleMode === "now" ? "Send Campaign" : "Schedule Campaign"}</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/campaigns")}
                className="w-full py-2 text-xs font-semibold rounded-xl border border-[#E4EAE2] bg-white text-[#1F2937] hover:bg-[#F8FAF8] transition cursor-pointer"
              >
                Cancel & Back
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
