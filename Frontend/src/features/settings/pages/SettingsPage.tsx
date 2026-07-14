import { useState, useEffect } from "react";
import { Settings as SettingsIcon, MessageSquare, Tag, Zap, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { cn } from "../../../lib/utils";
import { MOCK_SENDER_IDS, MOCK_ROUTES } from "../../../mocks/data";
import { settingsService } from "../services/settings.service";
import type { AppSettings } from "../../../types/common";
import type { Theme } from "../../../hooks/useTheme";

type Tab = "general" | "sms" | "senderids" | "routes" | "appearance";

const TABS = [
  { id: "general",    label: "General",      icon: SettingsIcon },
  { id: "sms",        label: "SMS Config",   icon: MessageSquare },
  { id: "senderids",  label: "Sender IDs",   icon: Tag          },
  { id: "routes",     icon: Zap,             label: "Routes"    },
  { id: "appearance", label: "Appearance",   icon: Sun          },
] as const;

interface SettingsPageProps {
  theme: Theme;
  onThemeToggle: () => void;
}

export function SettingsPage({ theme, onThemeToggle }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [settings, setSettings]   = useState<AppSettings | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    settingsService.getSettings().then((res) => {
      setSettings(res);
      setLoading(false);
    });
  }, []);

  async function saveSettings() {
    if (settings) {
      try {
        await settingsService.saveSettings(settings);
        toast.success("Settings saved.");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to save settings.");
      }
    }
  }

  const upd = (key: keyof AppSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (settings) {
      setSettings({ ...settings, [key]: e.target.value });
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Loading settings...
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Settings" description="Configure your SMS platform preferences." />

      <div className="flex gap-6 items-start flex-col lg:flex-row">
        {/* Tab nav */}
        <Card className="lg:w-52 flex-shrink-0 overflow-hidden">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as Tab)}
              className={cn(
                "w-full flex items-center gap-2.5 px-4 py-3 text-sm transition-colors text-left",
                activeTab === id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </Card>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "general" && (
            <Card className="p-6 space-y-4">
              <h2 className="text-base font-semibold text-foreground">General Settings</h2>
              <Input label="Company Name" value={settings.companyName} onChange={upd("companyName")} />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Default Country" value={settings.defaultCountry} onChange={upd("defaultCountry")} />
                <Input label="Country Dial Code" value={settings.defaultCountryCode} onChange={upd("defaultCountryCode")} />
              </div>
              <Input
                label="Timezone"
                value={settings.timezone}
                onChange={upd("timezone")}
                hint="e.g. Asia/Colombo"
              />
              <div className="pt-2">
                <Button onClick={saveSettings}>Save Changes</Button>
              </div>
            </Card>
          )}

          {activeTab === "sms" && (
            <Card className="p-6 space-y-4">
              <h2 className="text-base font-semibold text-foreground">SMS Configuration</h2>
              <Select
                label="Default Sender ID"
                value={settings.defaultSenderId}
                onChange={upd("defaultSenderId")}
              >
                {MOCK_SENDER_IDS.map((s) => (
                  <option key={s.id} value={s.value}>{s.value}</option>
                ))}
              </Select>
              <Select
                label="Default Route"
                value={settings.defaultRoute}
                onChange={upd("defaultRoute")}
              >
                {MOCK_ROUTES.map((r) => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </Select>
              <Input
                label="SMS Balance Warning Threshold"
                type="number"
                value={settings.smsBalanceWarningThreshold}
                onChange={upd("smsBalanceWarningThreshold")}
                hint="Show a warning when balance falls below this amount."
              />
              <div className="pt-2">
                <Button onClick={saveSettings}>Save Changes</Button>
              </div>
            </Card>
          )}

          {activeTab === "senderids" && (
            <Card>
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Approved Sender IDs</h2>
                <span className="text-xs text-muted-foreground">Managed by backend</span>
              </div>
              <div className="divide-y divide-border">
                {MOCK_SENDER_IDS.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-5 py-4">
                    <span className="font-mono text-sm text-foreground">{s.value}</span>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                      s.status === "APPROVED" ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                      s.status === "REJECTED" ? "bg-destructive/10 text-destructive" :
                      "bg-yellow-500/10 text-yellow-600"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full",
                        s.status === "APPROVED" ? "bg-green-500" :
                        s.status === "REJECTED" ? "bg-destructive" : "bg-yellow-400"
                      )} />
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === "routes" && (
            <Card>
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-base font-semibold text-foreground">SMS Routes</h2>
              </div>
              <div className="divide-y divide-border">
                {MOCK_ROUTES.map((r) => (
                  <div key={r.id} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground text-sm">{r.name}</span>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                        r.status === "ACTIVE" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", r.status === "ACTIVE" ? "bg-green-500" : "bg-muted-foreground")} />
                        {r.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === "appearance" && (
            <Card className="p-6 space-y-4">
              <h2 className="text-base font-semibold text-foreground">Appearance</h2>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Theme</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { id: "dark",  label: "Dark Mode",  icon: Moon },
                    { id: "light", label: "Light Mode", icon: Sun  },
                  ].map(({ id, label, icon: Icon }) => (
                    <label
                      key={id}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors",
                        theme === id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/20"
                      )}
                    >
                      <input
                        type="radio"
                        name="theme"
                        className="accent-primary"
                        checked={theme === id}
                        onChange={() => theme !== id && onThemeToggle()}
                      />
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
