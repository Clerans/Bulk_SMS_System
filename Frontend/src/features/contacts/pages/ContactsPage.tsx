import { useState, useMemo } from "react";
import { Plus, Trash2, Users, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Card, CardHeader, CardBody } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/common/EmptyState";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { SearchBar } from "../../../components/common/SearchBar";
import { CONTACT_STATUS_MAP } from "../../../lib/utils";
import { formatNumber } from "../../../utils/format";
import { normalizePhone } from "../../../utils/phone";
import { useContacts } from "../hooks/useContacts";
import { contactsService } from "../services/contacts.service";
import type { Contact, ContactStatus, ContactGroup } from "../../../types/common";
import { useEffect } from "react";

export function ContactsPage() {
  const { contacts, addContact, deleteContact } = useContacts();
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState<ContactStatus | "ALL">("ALL");
  const [groupFilter, setGroupFilter]   = useState("ALL");
  const [addOpen, setAddOpen]       = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [deleteId, setDeleteId]     = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", phone: "", group: "", country: "LK" });
  const [formError, setFormError] = useState("");

  const [groupForm, setGroupForm] = useState({ name: "", description: "" });
  const [groupFormError, setGroupFormError] = useState("");

  useEffect(() => {
    contactsService.getContactGroups().then(setGroups);
  }, [contacts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(q) || c.phone.includes(search);
      const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
      const matchGroup  = groupFilter === "ALL" || c.group === groupFilter;
      return matchSearch && matchStatus && matchGroup;
    });
  }, [contacts, search, statusFilter, groupFilter]);

  async function handleAdd() {
    setFormError("");
    if (!form.name.trim()) { setFormError("Full name is required."); return; }
    const result = normalizePhone(form.phone);
    if (!result.valid || !result.normalized) {
      setFormError(`Invalid phone number: ${result.reason}`);
      return;
    }
    
    try {
      await addContact({
        name: form.name.trim(),
        phone: result.normalized,
        group: form.group,
        country: form.country.toUpperCase(),
      });
      setAddOpen(false);
      setForm({ name: "", phone: "", group: "", country: "LK" });
      toast.success("Contact added successfully.");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to add contact.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteContact(id);
      setDeleteId(null);
      toast.success("Contact removed.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete contact.");
    }
  }

  async function handleAddGroup() {
    if (!groupForm.name.trim()) {
      setGroupFormError("Group name is required.");
      return;
    }
    
    try {
      await contactsService.createContactGroup({
        name: groupForm.name.trim(),
        description: groupForm.description.trim() || undefined,
      });
      setAddGroupOpen(false);
      setGroupForm({ name: "", description: "" });
      setGroupFormError("");
      toast.success("Group created successfully.");
      const updatedGroups = await contactsService.getContactGroups();
      setGroups(updatedGroups);
    } catch (err: unknown) {
      setGroupFormError(err instanceof Error ? err.message : "Failed to create group.");
    }
  }

  const deletingContact = contacts.find((c) => c.id === deleteId);


  return (
    <div>
      <PageHeader
        title="Contacts"
        description="Manage recipients and contact groups."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAddGroupOpen(true)}>
              <FolderPlus className="w-4 h-4" />Create Group
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" />Add Contact
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="mb-4 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name or phone…"
          />
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.name}>{g.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ContactStatus | "ALL")}
            className="px-3 py-2 rounded-lg border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All Statuses</option>
            {(Object.keys(CONTACT_STATUS_MAP) as ContactStatus[]).map((s) => (
              <option key={s} value={s}>{CONTACT_STATUS_MAP[s].label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Contacts table */}
      <Card className="mb-6">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts found"
            description="Import a CSV or add your first contact to get started."
            action={<Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" />Add Contact</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Name", "Phone", "Group", "Country", "Status", "Last Campaign", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.group || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.country}</td>
                    <td className="px-4 py-3"><Badge status={c.status} map={CONTACT_STATUS_MAP} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{c.lastCampaign ?? "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDeleteId(c.id)}
                        aria-label={`Remove ${c.name}`}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">{filtered.length} contact{filtered.length !== 1 ? "s" : ""} shown</p>
            </div>
          </div>
        )}
      </Card>

      {/* Contact Groups */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Contact Groups</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {groups.map((g) => (
            <Card key={g.id} className="p-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <p className="font-semibold text-foreground text-sm">{g.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">{g.description}</p>
              <p className="text-2xl font-bold text-primary">{formatNumber(g.contactCount)}</p>
              <p className="text-xs text-muted-foreground">contacts</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Add Contact modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-foreground mb-4">Add Contact</h3>
            <div className="space-y-4">
              <Input
                label="Full Name"
                placeholder="Priya Jayawardena"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
              <Input
                label="Phone Number"
                placeholder="+94771234567 or 0771234567"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                hint="Sri Lankan numbers are normalized automatically."
              />
              <Select
                label="Group (optional)"
                value={form.group}
                onChange={(e) => setForm((p) => ({ ...p, group: e.target.value }))}
              >
                <option value="">— No group —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.name}>{g.name}</option>
                ))}
              </Select>
              <Input
                label="Country Code"
                value={form.country}
                onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
              />
              {formError && (
                <p className="text-xs text-destructive">{formError}</p>
              )}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <Button variant="outline" onClick={() => { setAddOpen(false); setFormError(""); }}>Cancel</Button>
              <Button onClick={handleAdd}><Plus className="w-4 h-4" />Add Contact</Button>
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Remove contact?"
        description={`"${deletingContact?.name ?? "This contact"}" will be permanently removed from your list.`}
        confirmLabel="Remove"
        danger
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />

      {/* Create Group Modal */}
      {addGroupOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-semibold text-foreground mb-4">Create Contact Group</h3>
            <div className="space-y-4">
              <Input
                label="Group Name"
                value={groupForm.name}
                onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Premium Customers"
              />
              <Input
                label="Description (optional)"
                value={groupForm.description}
                onChange={(e) => setGroupForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Brief details about this group"
              />
              {groupFormError && (
                <p className="text-xs text-destructive">{groupFormError}</p>
              )}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <Button variant="outline" onClick={() => { setAddGroupOpen(false); setGroupFormError(""); }}>Cancel</Button>
              <Button onClick={handleAddGroup}><FolderPlus className="w-4 h-4" />Create Group</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
