import { useRef } from "react";
import { Upload, FileText, CheckCircle2 } from "lucide-react";
import { Tabs } from "../../../components/ui/Tabs";
import { Textarea } from "../../../components/ui/Textarea";
import { cn } from "../../../lib/utils";
import { formatNumber } from "../../../utils/format";
import { parseCsvText } from "../../../utils/csv";
import { parseManualNumbers } from "../../../utils/phone";
import { toast } from "sonner";
import type { CsvRecipient, ContactGroup, RecipientSource } from "../../../types/common";

interface RecipientSelectorProps {
  activeTab: RecipientSource;
  onTabChange: (t: RecipientSource) => void;
  // CSV
  csvRows: CsvRecipient[];
  csvHeaders: string[];
  csvFileName: string;
  csvStats: { total: number; valid: number; invalid: number; duplicates: number };
  onCsvLoad: (rows: CsvRecipient[], headers: string[], stats: { total: number; valid: number; invalid: number; duplicates: number }) => void;
  // Groups
  groups: ContactGroup[];
  selectedGroups: string[];
  onGroupToggle: (id: string) => void;
  // Manual
  manualInput: string;
  onManualChange: (input: string, parsed: { valid: string[]; invalid: string[] }) => void;
  manualParsed: { valid: string[]; invalid: string[] };
  recipientCount: number;
}

export function RecipientSelector({
  activeTab, onTabChange,
  csvRows, csvHeaders, csvFileName, csvStats, onCsvLoad,
  groups, selectedGroups, onGroupToggle,
  manualInput, onManualChange, manualParsed,
  recipientCount,
}: RecipientSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = [false, () => {}]; // simplified drag state

  function processFile(file: File) {
    if (!file.name.endsWith(".csv")) { toast.error("Only .csv files are supported."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const result = parseCsvText(text);
        onCsvLoad(result.rows, result.headers, result.stats);
        toast.success(`CSV loaded: ${result.stats.valid} valid recipients.`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to parse CSV.");
      }
    };
    reader.readAsText(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  return (
    <div>
      <Tabs
        tabs={[
          { id: "CSV",    label: "CSV Upload"       },
          { id: "GROUPS", label: "Contact Groups"   },
          { id: "MANUAL", label: "Manual Numbers"   },
        ]}
        active={activeTab}
        onChange={(id) => onTabChange(id as RecipientSource)}
        className="mb-5"
      />

      {/* CSV Upload */}
      {activeTab === "CSV" && (
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors gap-2"
            role="button"
            aria-label="Upload CSV file"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Drop a CSV file here, or click to browse</p>
            <p className="text-xs text-muted-foreground">Required column: <code className="font-mono">phone</code> — optional: name, code, and any custom columns</p>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          </div>

          {csvFileName && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium text-foreground flex-1 truncate">{csvFileName}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Rows",  value: csvStats.total,      cls: "text-foreground" },
                  { label: "Valid",       value: csvStats.valid,       cls: "text-green-500"  },
                  { label: "Invalid",     value: csvStats.invalid,     cls: "text-destructive" },
                  { label: "Duplicates",  value: csvStats.duplicates,  cls: "text-yellow-500" },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="text-center p-3 rounded-lg bg-muted/40 border border-border">
                    <p className={cn("text-xl font-semibold", cls)}>{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              {csvStats.invalid > 0 && (
                <p className="text-xs text-destructive">
                  {csvStats.invalid} invalid {csvStats.invalid === 1 ? "row was" : "rows were"} skipped due to invalid or missing phone numbers.
                </p>
              )}

              {csvRows.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border">
                        {csvHeaders.map((h) => (
                          <th key={h} className="text-left px-3 py-2 text-muted-foreground font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          {csvHeaders.map((h) => (
                            <td key={h} className="px-3 py-2 text-foreground">{row[h] || "—"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvRows.length > 5 && (
                    <p className="text-xs text-muted-foreground px-3 py-2 border-t border-border">
                      Showing 5 of {formatNumber(csvRows.length)} valid rows
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Contact Groups */}
      {activeTab === "GROUPS" && (
        <div className="space-y-3">
          {groups.map((g) => (
            <label
              key={g.id}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors",
                selectedGroups.includes(g.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/20"
              )}
            >
              <input
                type="checkbox"
                className="w-4 h-4 accent-primary flex-shrink-0"
                checked={selectedGroups.includes(g.id)}
                onChange={() => onGroupToggle(g.id)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{g.name}</p>
                <p className="text-xs text-muted-foreground truncate">{g.description}</p>
              </div>
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                {formatNumber(g.contactCount)} contacts
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Manual Numbers */}
      {activeTab === "MANUAL" && (
        <div className="space-y-3">
          <Textarea
            label="Phone Numbers"
            placeholder={"+94771234567\n+94772345678\n0773456789"}
            rows={6}
            value={manualInput}
            onChange={(e) => {
              const input = e.target.value;
              const parsed = parseManualNumbers(input);
              onManualChange(input, parsed);
            }}
          />
          <p className="text-xs text-muted-foreground">
            One number per line or comma-separated. Sri Lankan numbers (07x) are normalized to +94 automatically.
          </p>
          {(manualParsed.valid.length > 0 || manualParsed.invalid.length > 0) && (
            <div className="flex gap-4 text-sm">
              <span className="text-green-500 font-medium">{manualParsed.valid.length} valid</span>
              {manualParsed.invalid.length > 0 && (
                <span className="text-destructive font-medium">{manualParsed.invalid.length} invalid</span>
              )}
            </div>
          )}
          {manualParsed.invalid.length > 0 && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
              Invalid entries: {manualParsed.invalid.join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Selected summary */}
      {recipientCount > 0 && (
        <div className="mt-5 flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {formatNumber(recipientCount)} recipients selected
        </div>
      )}
    </div>
  );
}
