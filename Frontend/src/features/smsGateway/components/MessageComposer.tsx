import { useRef } from "react";
import { AlertCircle } from "lucide-react";
import { Select } from "../../../components/ui/Select";
import type { SmsEncoding, SMSTemplate } from "../../../types/common";
import { insertAtCursor, resolveTemplate } from "../../../utils/template";
import { cn } from "../../../lib/utils";

interface MessageComposerProps {
  message: string;
  onMessageChange: (msg: string) => void;
  templates: SMSTemplate[];
  selectedTemplateId: string;
  onTemplateSelect: (id: string) => void;
  variables: string[];
  smsMetrics: SmsEncoding;
  previewRecipient: Record<string, string>;
}

export function MessageComposer({
  message, onMessageChange, templates, selectedTemplateId, onTemplateSelect,
  variables, smsMetrics, previewRecipient,
}: MessageComposerProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { unresolvedVariables } = resolveTemplate(message, previewRecipient);

  function insertVariable(varName: string) {
    const ta = taRef.current;
    const insert = `{${varName}}`;
    if (ta) {
      const { newValue, newCursorPos } = insertAtCursor(
        message, insert, ta.selectionStart, ta.selectionEnd
      );
      onMessageChange(newValue);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else {
      onMessageChange(message + insert);
    }
  }

  function handleTemplateSelect(id: string) {
    const tpl = templates.find((t) => t.id === id);
    if (tpl) onMessageChange(tpl.message);
    onTemplateSelect(id);
  }

  return (
    <div className="space-y-4">
      <Select
        label="Load Template (optional)"
        value={selectedTemplateId}
        onChange={(e) => handleTemplateSelect(e.target.value)}
      >
        <option value="">— Select a template —</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
        ))}
      </Select>

      <div>
        <label className="text-sm font-medium text-foreground block mb-1.5">Message</label>
        <textarea
          ref={taRef}
          rows={5}
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder="Type your message here, or load a template above…"
          className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
        />

        {/* Metrics bar */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
          <span>{smsMetrics.characterCount} chars</span>
          <span>·</span>
          <span className={smsMetrics.encoding === "Unicode" ? "text-yellow-500 font-medium" : ""}>
            {smsMetrics.encoding}
          </span>
          <span>·</span>
          <span>{smsMetrics.segmentCount} segment{smsMetrics.segmentCount !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{smsMetrics.remainingCharacters} remaining</span>
        </div>

        {/* Unresolved variable warning */}
        {unresolvedVariables.length > 0 && (
          <div className="mt-2 flex items-center gap-2 p-2.5 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-300 text-xs">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {unresolvedVariables.length} unresolved variable{unresolvedVariables.length > 1 ? "s" : ""}:{" "}
              {unresolvedVariables.map((v) => `{${v}}`).join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* Variable chips */}
      {variables.length > 0 && (
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Insert Variable</p>
          <div className="flex flex-wrap gap-2">
            {variables.map((v) => (
              <button
                key={v}
                onClick={() => insertVariable(v)}
                className={cn(
                  "px-2.5 py-1 rounded-md border text-xs font-mono transition-colors",
                  "border-border text-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
                )}
              >
                {"{" + v + "}"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
