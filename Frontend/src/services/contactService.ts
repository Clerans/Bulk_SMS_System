import { axiosInstance } from "./axios";
import type { Contact, ContactGroup } from "../types/common";

export const contactService = {
  async getContacts(): Promise<Contact[]> {
    const res = await axiosInstance.get<any>("/contacts");
    return Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
  },

  async getContactGroups(): Promise<ContactGroup[]> {
    const res = await axiosInstance.get<any>("/groups");
    return Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
  },

  async createContact(data: Omit<Contact, "id" | "status" | "lastCampaign">): Promise<Contact> {
    const nameParts = (data.name || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "Contact";
    
    const payload = {
      first_name: firstName,
      last_name: lastName,
      phone: data.phone,
      country: data.country || "LK",
      group_name: data.group || undefined,
    };
    
    const res = await axiosInstance.post<Contact>("/contacts", payload);
    return res.data;
  },

  async deleteContact(id: string): Promise<void> {
    await axiosInstance.delete(`/contacts/${id}`);
  },

  async createContactGroup(data: { name: string; description?: string }): Promise<ContactGroup> {
    const res = await axiosInstance.post<any>("/groups", data);
    return res.data;
  },
};
