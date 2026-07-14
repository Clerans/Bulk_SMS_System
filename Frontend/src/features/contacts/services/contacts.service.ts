import { axiosInstance } from "../../../services/axios";
import type { Contact, ContactGroup } from "../../../types/common";
import { MOCK_CONTACTS, MOCK_CONTACT_GROUPS } from "../../../mocks/data";

export const contactsService = {
  async getContacts(): Promise<Contact[]> {
    // In production:
    // const res = await axiosInstance.get<Contact[]>("/contacts");
    // return res.data;
    return MOCK_CONTACTS;
  },

  async getContactGroups(): Promise<ContactGroup[]> {
    // In production:
    // const res = await axiosInstance.get<ContactGroup[]>("/contact-groups");
    // return res.data;
    return MOCK_CONTACT_GROUPS;
  },

  async createContact(data: Omit<Contact, "id" | "status" | "lastCampaign">): Promise<Contact> {
    // In production:
    // const res = await axiosInstance.post<Contact>("/contacts", data);
    // return res.data;
    return {
      id: `cnt_local_${Date.now()}`,
      ...data,
      status: "ACTIVE",
      lastCampaign: null,
    };
  },

  async deleteContact(id: string): Promise<void> {
    // In production:
    // await axiosInstance.delete(`/contacts/${id}`);
    await new Promise<void>((r) => setTimeout(r, 200));
  },
};
