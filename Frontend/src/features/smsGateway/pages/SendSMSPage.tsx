import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, Send, CalendarDays, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Card, CardHeader, CardBody } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { RecipientSelector } from "../components/RecipientSelector";
import { MessageComposer } from "../components/MessageComposer";
import { calculateSmsSegments } from "../../../utils/sms";
import { formatNumber } from "../../../utils/format";
import { MOCK_CONTACT_GROUPS, MOCK_TEMPLATES, MOCK_SENDER_IDS, MOCK_ROUTES, MOCK_SUMMARY } from "../../../mocks/data";
import { campaignsService } from "../../campaigns/services/campaigns.service";
import type { CsvRecipient, RecipientSource } from "../../../types/common";

const STEPS = [
  { n: 1, label: "Recipients" },
  { n: 2, label: "Message"    },
  { n: 3, label: "Campaign"   },
];

export function SendSMSPage() {
  const navigate = useNavigate();

  // Step
  const [step, setStep] = useState(1);

  // Step 1 — Recipients
  const [recipientTab, setRecipientTab]     = useState<RecipientSource>("CSV");
  const [csvRows, setCsvRows]               = useState<CsvRecipient[]>([]);
  const [csvHeaders, setCsvHeaders]         = useState<string[]>([]);
  const [csvFileName, setCsvFileName]       = useState("");
  const [csvStats, setCsvStats]             = useState({ total: 0, valid: 0, invalid: 0, duplicates: 0 });
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [manualInput, setManualInput]       = useState("");
  const [manualParsed, setManualParsed]     = useState<{ valid: string[]; invalid: string[] }>({ valid: [], invalid: [] });

  // Step 2 — Message
  const [message, setMessage]                   = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // Step 3 — Campaign config
  const [campaignName, setCampaignName]     = useState("");
  const [senderId, setSenderId]             = useState(MOCK_SENDER_IDS[0]?.value ?? "");
  const [routeId, setRouteId]               = useState(MOCK_ROUTES[0]?.id ?? "");
  const [scheduleType, setScheduleType]     = useState<"NOW" | "SCHEDULED">("NOW");
  const [scheduledDate, setScheduledDate]   = useState("");
  const [scheduledTime, setScheduledTime]   = useState("");

  // Preview
  const [previewIndex, setPreviewIndex] = useState(0);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting]   = useState(false);

  // ── Derived state ──

  const smsMetrics = useMemo(() => calculateSmsSegments(message), [message]);

  const recipients: CsvRecipient[] = useMemo(() => {
    if (recipientTab === "CSV") return csvRows;
    if (recipientTab === "MANUAL") {
      return manualParsed.valid.map((phone, i) => ({ name: `Recipient ${i + 1}`, phone }));
    }
    // GROUPS — use stub contacts for preview (real data comes from backend)
    const total = MOCK_CONTACT_GROUPS
      .filter((g) => selectedGroups.includes(g.id))
      .reduce((acc, g) => acc + g.contactCount, 0);
    return Array.from({ length: Math.min(total, 5) }, (_, i) => ({
      name: `Contact ${i + 1}`,
      phone: `+9477${String(i + 1).padStart(7, "0")}`,
    }));
  }, [recipientTab, csvRows, manualParsed, selectedGroups]);

  const recipientCount = useMemo(() => {
    if (recipientTab === "CSV")    return csvStats.valid;
    if (recipientTab === "MANUAL") return manualParsed.valid.length;
    return MOCK_CONTACT_GROUPS.filter((g) => selectedGroups.includes(g.id)).reduce((a, g) => a + g.contactCount, 0);
  }, [recipientTab, csvStats, manualParsed, selectedGroups]);

  const estimatedUnits = recipientCount * Math.max(1, smsMetrics.segmentCount);
  const smsBalance = MOCK_SUMMARY.smsBalance;
  const insufficientBalance = recipientCount > 0 && estimatedUnits > smsBalance;

  const variables = csvHeaders.length > 0
    ? csvHeaders
    : ["name", "phone", "code", "country"];

  const previewRecipient = recipients[previewIndex] ?? { name: "Preview Recipient", phone: "+94771234567" };

  // ── Validation ──

  function canProceed(): boolean {
    if (step === 1) return recipientCount > 0;
    if (step === 2) return message.trim().length > 0;
    if (step === 3) return !!campaignName.trim() && !!senderId && !insufficientBalance &&
      (scheduleType === "NOW" || (!!scheduledDate && !!scheduledTime));
    return false;
  }

  // ── Send ──

  async function handleSend() {
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      await campaignsService.createCampaign({
        name: campaignName,
        senderId,
        message,
        routeId,
        scheduleType,
        scheduledAt: scheduleType === "SCHEDULED" ? `${scheduledDate}T${scheduledTime}` : undefined,
      });
      toast.success(scheduleType === "NOW" ? "Campaign sent successfully." : "Campaign scheduled successfully.");
      navigate("/campaigns");
    } catch {
      toast.error("Failed to create campaign. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }


  // ── Render ──

  const selectedRoute = MOCK_ROUTES.find((r) => r.id === routeId);
  const confirmDescription = `Estimated SMS usage: ${formatNumber(estimatedUnits)} units.`;
  const confirmTitle = scheduleType === "NOW"
    ? `Send campaign to ${formatNumber(recipientCount)} recipients?`
    : `Schedule campaign for ${scheduledDate} at ${scheduledTime}?`;

  return (
    <div>
      <PageHeader
        title="Send SMS"
        description="Create, personalize, and send a new SMS campaign."
      />

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map(({ n, label }, i) => (
          <div key={n} className="flex items-center gap-2">
            <button
              onClick={() => n < step && setStep(n)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                step === n ? "text-primary" : n < step ? "text-foreground cursor-pointer" : "text-muted-foreground cursor-default"
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                step === n ? "bg-primary text-primary-foreground" :
                n < step ? "bg-primary/20 text-primary" :
                "bg-muted text-muted-foreground"
              }`}>
                {n < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
              </span>
              <span className="hidden sm:block">{label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-px ${step > n ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="space-y-5">
          {/* Step 1 */}
          {step === 1 && (
            <Card>
              <CardHeader><h2 className="text-base font-semibold text-foreground">Select Recipients</h2></CardHeader>
              <CardBody>
                <RecipientSelector
                  activeTab={recipientTab}
                  onTabChange={(t) => { setRecipientTab(t); setPreviewIndex(0); }}
                  csvRows={csvRows}
                  csvHeaders={csvHeaders}
                  csvFileName={csvFileName}
                  csvStats={csvStats}
                  onCsvLoad={(rows, headers, stats) => { setCsvRows(rows); setCsvHeaders(headers); setCsvStats(stats); setCsvFileName(rows.length > 0 ? "uploaded.csv" : ""); }}
                  groups={MOCK_CONTACT_GROUPS}
                  selectedGroups={selectedGroups}
                  onGroupToggle={(id) => setSelectedGroups((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
                  manualInput={manualInput}
                  onManualChange={(input, parsed) => { setManualInput(input); setManualParsed(parsed); }}
                  manualParsed={manualParsed}
                  recipientCount={recipientCount}
                />
              </CardBody>
            </Card>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <Card>
              <CardHeader><h2 className="text-base font-semibold text-foreground">Compose Message</h2></CardHeader>
              <CardBody>
                <MessageComposer
                  message={message}
                  onMessageChange={setMessage}
                  templates={MOCK_TEMPLATES}
                  selectedTemplateId={selectedTemplateId}
                  onTemplateSelect={setSelectedTemplateId}
                  variables={variables}
                  smsMetrics={smsMetrics}
                  previewRecipient={previewRecipient}
                />
              </CardBody>
            </Card>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <Card>
              <CardHeader><h2 className="text-base font-semibold text-foreground">Campaign Settings</h2></CardHeader>
              <CardBody className="space-y-4">
                <Input
                  label="Campaign Name"
                  placeholder="e.g. Weekend Flash Sale"
                  value={campaignName}
                  maxLength={100}
                  onChange={(e) => setCampaignName(e.target.value)}
                  hint={`${campaignName.length}/100 characters`}
                />

                <Select
                  label="Sender ID"
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                >
                  {MOCK_SENDER_IDS.map((s) => (
                    <option key={s.id} value={s.value}>{s.value}</option>
                  ))}
                </Select>

                <Select
                  label="SMS Route"
                  value={routeId}
                  onChange={(e) => setRouteId(e.target.value)}
                >
                  {MOCK_ROUTES.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} — {r.description}</option>
                  ))}
                </Select>

                {/* Schedule */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Schedule</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { id: "NOW",       label: "Send Now",          sub: "Campaign starts immediately" },
                      { id: "SCHEDULED", label: "Schedule for Later", sub: "Pick a date and time"       },
                    ].map(({ id, label, sub }) => (
                      <label
                        key={id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          scheduleType === id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/20"
                        }`}
                      >
                        <input
                          type="radio"
                          name="schedule"
                          className="accent-primary mt-0.5"
                          checked={scheduleType === id}
                          onChange={() => setScheduleType(id as "NOW" | "SCHEDULED")}
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">{label}</p>
                          <p className="text-xs text-muted-foreground">{sub}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {scheduleType === "SCHEDULED" && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input label="Date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                    <Input label="Time" type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                    <p className="text-xs text-muted-foreground sm:col-span-2">Timezone: Asia/Colombo (UTC+5:30)</p>
                  </div>
                )}

                {/* Summary */}
                <div className="pt-4 border-t border-border space-y-2.5">
                  <h3 className="text-sm font-semibold text-foreground">Campaign Summary</h3>
                  {[
                    { label: "Campaign Name",         value: campaignName || "—" },
                    { label: "Sender ID",             value: senderId },
                    { label: "Recipients",            value: formatNumber(recipientCount) },
                    { label: "Encoding",              value: smsMetrics.encoding },
                    { label: "Segments per Recipient",value: String(smsMetrics.segmentCount) },
                    { label: "Estimated SMS Units",   value: formatNumber(estimatedUnits) },
                    { label: "SMS Balance",           value: formatNumber(smsBalance) },
                    { label: "Route",                 value: selectedRoute?.name ?? "—" },
                    { label: "Schedule",              value: scheduleType === "NOW" ? "Send immediately" : scheduledDate && scheduledTime ? `${scheduledDate} at ${scheduledTime}` : "Not set" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-foreground">{value}</span>
                    </div>
                  ))}
                </div>

                {insufficientBalance && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Insufficient SMS balance. Top up your account before sending.
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 1}>
              <ArrowLeft className="w-4 h-4" />Previous
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
                Next<ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={!canProceed() || submitting}
                loading={submitting}
              >
                {scheduleType === "NOW"
                  ? <><Send className="w-4 h-4" />Send Campaign</>
                  : <><CalendarDays className="w-4 h-4" />Schedule Campaign</>
                }
              </Button>
            )}
          </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={scheduleType === "NOW" ? "Confirm & Send" : "Confirm & Schedule"}
        onConfirm={handleSend}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
