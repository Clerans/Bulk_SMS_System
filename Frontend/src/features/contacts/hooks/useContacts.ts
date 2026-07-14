import { useState, useCallback } from "react";
import type { Contact } from "../../../types/common";
import { contactsService } from "../services/contacts.service";
import { MOCK_CONTACTS } from "../../../mocks/data";

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>(MOCK_CONTACTS);

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
    addContact,
    deleteContact,
  };
}
