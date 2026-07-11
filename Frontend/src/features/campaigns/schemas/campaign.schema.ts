import { z } from "zod";

export const campaignSchema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters"),
  description: z.string().optional(),
  senderId: z.string().min(1, "Sender ID is required"),
  priority: z.enum(["Low", "Normal", "High"]).default("Normal"),
  messageBody: z.string().min(1, "Message body cannot be empty"),
  recipientMode: z.enum(["group", "csv", "manual"]).default("group"),
  customerGroup: z.string().optional(),
  manualRecipients: z.string().optional(),
  scheduleMode: z.enum(["now", "later", "recurring"]).default("now"),
  scheduleDate: z.string().optional(),
  scheduleTime: z.string().optional(),
  trackDelivery: z.boolean().default(true),
  retryFailed: z.boolean().default(true),
  removeDuplicates: z.boolean().default(true),
  businessHoursOnly: z.boolean().default(false),
});

export type CampaignFormFields = z.infer<typeof campaignSchema>;
