import { useState, useCallback, useEffect } from "react";
import type { Contact } from "../../../types/common";
import { contactsService } from "../services/contacts.service";

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await contactsService.getContacts();
      setContacts(data);
    } catch (err) {
      console.error("Failed to fetch contacts", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const addContact = useCallback(async (data: Omit<Contact, "id" | "status" | "lastCampaign">) => {
    const newContact = await contactsService.createContact(data);
    setContacts((prev) => [newContact, ...prev]);
    return newContact;
  }, []);

  const deleteContact = useCallback(async (id: string) => {
    await contactsService.deleteContact(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return {
    contacts,
    loading,
    addContact,
    deleteContact,
    refreshContacts: fetchContacts,
  };
}
