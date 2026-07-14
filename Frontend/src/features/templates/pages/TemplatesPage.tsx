import { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/common/EmptyState";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Textarea } from "../../../components/ui/Textarea";
import { SearchBar } from "../../../components/common/SearchBar";
import { calculateSmsSegments } from "../../../utils/sms";
import { extractVariables } from "../../../utils/template";
import { templatesService } from "../services/templates.service";
import { cn } from "../../../lib/utils";
import type { SMSTemplate, TemplateCategory } from "../../../types/common";

const CATEGORIES: TemplateCategory[] = ["Marketing", "Transactional", "Reminder", "Notification", "OTP"];

export function TemplatesPage() {
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ name: "", category: "Marketing" as TemplateCategory, message: "" });

  useEffect(() => {
    templatesService.getTemplates().then((res) => {
      setTemplates(res);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() =>
    templates.filter((t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
    ),
    [templates, search]
  );

  const liveMetrics = useMemo(() => calculateSmsSegments(form.message), [form.message]);

  async function handleAdd() {
    if (!form.name.trim())    { toast.error("Template name is required."); return; }
    if (!form.message.trim()) { toast.error("Message content is required."); return; }

    const variables = extractVariables(form.message);
    try {
      const newTpl = await templatesService.createTemplate({
        name: form.name.trim(),
        category: form.category,
        message: form.message.trim(),
        variables,
      });
      setTemplates((prev) => [newTpl, ...prev]);
      setAddOpen(false);
      setForm({ name: "", category: "Marketing", message: "" });
      toast.success("Template created.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create template.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await templatesService.deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setDeleteId(null);
      toast.success("Template deleted.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete template.");
    }
  }

  const deletingTemplate = templates.find((t) => t.id === deleteId);

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Loading templates...
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="SMS Templates"
        description="Create reusable messages for campaigns."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" />New Template
          </Button>
        }
      />

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search templates…"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="No templates yet"
            description="Create reusable message templates to speed up your campaigns."
            action={<Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" />New Template</Button>}
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => {
            const m = calculateSmsSegments(t.message);
            return (
              <Card key={t.id} className="p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t.name}</p>
                    <span className="text-xs text-muted-foreground">{t.category}</span>
                  </div>
                  <button
                    onClick={() => setDeleteId(t.id)}
                    aria-label={`Delete ${t.name}`}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-3 flex-1">{t.message}</p>

                {t.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.variables.map((v) => (
                      <span key={v} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary">
                        {"{" + v + "}"}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                  <span className={m.encoding === "Unicode" ? "text-yellow-500" : ""}>{m.encoding}</span>
                  <span>{m.segmentCount} segment{m.segmentCount !== 1 ? "s" : ""}</span>
                  <span>{m.characterCount} chars</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Template Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-foreground mb-4">New Template</h3>
            <div className="space-y-4">
              <Input
                label="Template Name"
                placeholder="Flash Sale Promo"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
              <Select
                label="Category"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as TemplateCategory }))}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
              <div>
                <Textarea
                  label="Message"
                  rows={4}
                  placeholder="Hi {name}, use code {code} for 20% off today…"
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                />
                <div className="flex gap-3 text-xs text-muted-foreground mt-1.5">
                  <span>{liveMetrics.characterCount} chars</span>
                  <span>·</span>
                  <span className={liveMetrics.encoding === "Unicode" ? "text-yellow-500" : ""}>{liveMetrics.encoding}</span>
                  <span>·</span>
                  <span>{liveMetrics.segmentCount} segment{liveMetrics.segmentCount !== 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span>{liveMetrics.remainingCharacters} remaining</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd}><Plus className="w-4 h-4" />Create Template</Button>
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete template?"
        description={`"${deletingTemplate?.name ?? "This template"}" will be permanently deleted.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
