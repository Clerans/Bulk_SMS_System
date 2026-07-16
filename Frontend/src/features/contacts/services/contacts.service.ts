import { axiosInstance } from "../../../services/axios";
import type { Contact, ContactGroup } from "../../../types/common";
import { MOCK_CONTACTS, MOCK_CONTACT_GROUPS } from "../../../mocks/data";

export const contactsService = {
  async getContacts(): Promise<Contact[]> {
    const res = await axiosInstance.get<Contact[]>("/contacts");
    return res.data;
  },

  async getContactGroups(): Promise<ContactGroup[]> {
    const res = await axiosInstance.get<ContactGroup[]>("/groups");
    return res.data;
  },

  async createContact(data: Omit<Contact, "id" | "status" | "lastCampaign">): Promise<Contact> {
    const res = await axiosInstance.post<Contact>("/contacts", data);
    return res.data;
  },

  async deleteContact(id: string): Promise<void> {
    await axiosInstance.delete(`/contacts/${id}`);
  },
};
