// ─── Isolated Mock Data ───────────────────────────────────────────────────────
// Enabled when VITE_USE_MOCK_API=true.
// Remove this file and its usages when connecting a real backend.

import { format, subDays } from "date-fns";
import type {
  Campaign, Contact, ContactGroup, DashboardSummary, DeliveryReport,
  DeliveryTrend, SMSRoute, SMSTemplate, SenderId, User, AppSettings,
} from "../types/common";

export const MOCK_USER: User = {
  id: "usr_01",
  name: "Anika Perera",
  email: "anika@cafechai.lk",
  role: "ADMIN",
};

export const MOCK_SUMMARY: DashboardSummary = {
  totalSent: 24780,
  delivered: 23948,
  failed: 832,
  activeCampaigns: 3,
  smsBalance: 42500,
  campaignCount: 18,
};

export function generateMockTrend(): DeliveryTrend[] {
  const seed = [
    [820, 22], [740, 18], [960, 31], [880, 25], [1020, 28],
    [780, 19], [640, 15], [900, 24], [1100, 35], [850, 21],
    [720, 17], [980, 30], [1050, 33], [760, 20], [890, 26],
    [940, 29], [810, 22], [670, 16], [1020, 34], [930, 27],
    [750, 18], [860, 23], [990, 31], [820, 20], [710, 16],
    [950, 28], [1080, 36], [800, 21], [880, 25], [1010, 32],
  ];
  return seed.map(([delivered, failed], i) => ({
    date: format(subDays(new Date(), 29 - i), "yyyy-MM-dd"),
    delivered,
    failed,
  }));
}

export const MOCK_TREND: DeliveryTrend[] = generateMockTrend();

export const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: "cmp_01", name: "Weekend Flash Sale", senderId: "CAFECHAI",
    message: "Hi {name}, enjoy 30% off this weekend! Use code {code}. Valid until Sunday. Shop: cafechai.lk",
    status: "COMPLETED", recipientCount: 5000, deliveredCount: 4870, failedCount: 130, pendingCount: 0,
    smsUnits: 5000, route: "Premium Route", scheduledAt: null,
    sentAt: "2026-07-10T08:00:00+05:30", createdAt: "2026-07-09T22:00:00+05:30",
  },
  {
    id: "cmp_02", name: "New Product Launch", senderId: "CAFECHAI",
    message: "Exciting news! Our new Signature Blend is here. Order now at cafechai.lk",
    status: "PROCESSING", recipientCount: 3200, deliveredCount: 2100, failedCount: 45, pendingCount: 1055,
    smsUnits: 3200, route: "Premium Route", scheduledAt: null,
    sentAt: "2026-07-12T09:00:00+05:30", createdAt: "2026-07-12T08:50:00+05:30",
  },
  {
    id: "cmp_03", name: "Loyalty Rewards Reminder", senderId: "CAFECHAI",
    message: "Hi {name}, you have {points} reward points expiring soon. Redeem before it's too late!",
    status: "SCHEDULED", recipientCount: 1240, deliveredCount: 0, failedCount: 0, pendingCount: 1240,
    smsUnits: 1240, route: "Default Route", scheduledAt: "2026-07-14T10:00:00+05:30",
    sentAt: null, createdAt: "2026-07-12T07:00:00+05:30",
  },
  {
    id: "cmp_04", name: "Ramadan Special Offer", senderId: "CAFECHAI",
    message: "Assalamu Alaikum {name}! Special Ramadan bundle at 25% off. Limited stock. Order: cafechai.lk",
    status: "PARTIALLY_FAILED", recipientCount: 2800, deliveredCount: 2650, failedCount: 150, pendingCount: 0,
    smsUnits: 2800, route: "Default Route", scheduledAt: null,
    sentAt: "2026-06-28T07:00:00+05:30", createdAt: "2026-06-27T18:00:00+05:30",
  },
  {
    id: "cmp_05", name: "App Re-engagement", senderId: "CAFECHAI",
    message: "We miss you! Open the CafeChai app and get your next order free. Terms apply.",
    status: "COMPLETED", recipientCount: 8500, deliveredCount: 8320, failedCount: 180, pendingCount: 0,
    smsUnits: 8500, route: "Economy Route", scheduledAt: null,
    sentAt: "2026-06-20T09:00:00+05:30", createdAt: "2026-06-19T14:00:00+05:30",
  },
  {
    id: "cmp_06", name: "OTP Test Run", senderId: "CAFECHAI",
    message: "Your OTP is {otp}. Valid for 5 minutes. Do not share.",
    status: "FAILED", recipientCount: 100, deliveredCount: 0, failedCount: 100, pendingCount: 0,
    smsUnits: 100, route: "Premium Route", scheduledAt: null,
    sentAt: "2026-06-15T14:00:00+05:30", createdAt: "2026-06-15T13:55:00+05:30",
  },
];

export const MOCK_CONTACT_GROUPS: ContactGroup[] = [
  { id: "grp_01", name: "VIP Customers",  description: "High-value repeat customers",          contactCount: 1240, createdAt: "2025-11-01T00:00:00Z" },
  { id: "grp_02", name: "New Leads",      description: "Recently acquired potential customers", contactCount: 856,  createdAt: "2026-01-15T00:00:00Z" },
  { id: "grp_03", name: "Loyal Customers",description: "Customers with 5+ orders",             contactCount: 3120, createdAt: "2025-09-01T00:00:00Z" },
  { id: "grp_04", name: "Unengaged",      description: "No activity in last 90 days",          contactCount: 620,  createdAt: "2026-03-01T00:00:00Z" },
];

export const MOCK_CONTACTS: Contact[] = [
  { id: "cnt_01", name: "Priya Jayawardena",    phone: "+94771234567", group: "VIP Customers",   country: "LK", status: "ACTIVE",       lastCampaign: "Weekend Flash Sale" },
  { id: "cnt_02", name: "Kasun Fernando",        phone: "+94772345678", group: "Loyal Customers", country: "LK", status: "ACTIVE",       lastCampaign: "App Re-engagement" },
  { id: "cnt_03", name: "Nishanthi Rathnayake",  phone: "+94773456789", group: "New Leads",       country: "LK", status: "ACTIVE",       lastCampaign: null },
  { id: "cnt_04", name: "Rajesh Krishnan",       phone: "+94774567890", group: "VIP Customers",   country: "LK", status: "ACTIVE",       lastCampaign: "New Product Launch" },
  { id: "cnt_05", name: "Sanduni Wickramasinghe",phone: "+94775678901", group: "Unengaged",       country: "LK", status: "UNSUBSCRIBED", lastCampaign: "App Re-engagement" },
  { id: "cnt_06", name: "Dilan Perera",          phone: "+94776789012", group: "Loyal Customers", country: "LK", status: "ACTIVE",       lastCampaign: "Ramadan Special Offer" },
  { id: "cnt_07", name: "Amara Silva",           phone: "+94777890123", group: "VIP Customers",   country: "LK", status: "ACTIVE",       lastCampaign: "Weekend Flash Sale" },
  { id: "cnt_08", name: "Thisara Bandara",       phone: "+94778901234", group: "New Leads",       country: "LK", status: "BLACKLISTED",  lastCampaign: null },
];

export const MOCK_TEMPLATES: SMSTemplate[] = [
  {
    id: "tpl_01", name: "Flash Sale Promo", category: "Marketing",
    message: "Hi {name}, enjoy {discount}% off today only! Use code {code} at checkout. Shop now: {link}",
    variables: ["name", "discount", "code", "link"], createdAt: "2026-05-01T00:00:00Z",
  },
  {
    id: "tpl_02", name: "Order Confirmation", category: "Transactional",
    message: "Your order #{orderId} has been confirmed. Expected delivery: {deliveryDate}. Track: {trackingLink}",
    variables: ["orderId", "deliveryDate", "trackingLink"], createdAt: "2026-03-12T00:00:00Z",
  },
  {
    id: "tpl_03", name: "Appointment Reminder", category: "Reminder",
    message: "Hi {name}, reminder for your appointment on {date} at {time}. Reply CANCEL to cancel.",
    variables: ["name", "date", "time"], createdAt: "2026-04-20T00:00:00Z",
  },
  {
    id: "tpl_04", name: "OTP Verification", category: "OTP",
    message: "Your verification code is {otp}. Valid for 5 minutes. Do not share this code.",
    variables: ["otp"], createdAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "tpl_05", name: "Loyalty Points Update", category: "Notification",
    message: "Hi {name}, you now have {points} reward points. Redeem at {redeemLink} before {expiry}.",
    variables: ["name", "points", "redeemLink", "expiry"], createdAt: "2026-06-05T00:00:00Z",
  },
];

export const MOCK_REPORTS: DeliveryReport[] = [
  { id: "rpt_01", campaignName: "Weekend Flash Sale",  phone: "+94771234567", status: "DELIVERED", sentAt: "2026-07-10T08:01:12Z", deliveredAt: "2026-07-10T08:01:18Z", failureReason: null },
  { id: "rpt_02", campaignName: "Weekend Flash Sale",  phone: "+94772345678", status: "DELIVERED", sentAt: "2026-07-10T08:01:13Z", deliveredAt: "2026-07-10T08:01:20Z", failureReason: null },
  { id: "rpt_03", campaignName: "Weekend Flash Sale",  phone: "+94773456789", status: "FAILED",    sentAt: "2026-07-10T08:01:14Z", deliveredAt: null,                    failureReason: "Unreachable subscriber" },
  { id: "rpt_04", campaignName: "New Product Launch",  phone: "+94774567890", status: "SENT",      sentAt: "2026-07-12T09:01:00Z", deliveredAt: null,                    failureReason: null },
  { id: "rpt_05", campaignName: "New Product Launch",  phone: "+94775678901", status: "DELIVERED", sentAt: "2026-07-12T09:01:01Z", deliveredAt: "2026-07-12T09:01:09Z", failureReason: null },
  { id: "rpt_06", campaignName: "Ramadan Special Offer",phone: "+94776789012", status: "FAILED",   sentAt: "2026-06-28T07:01:00Z", deliveredAt: null,                    failureReason: "Invalid number format" },
];

export const MOCK_SENDER_IDS: SenderId[] = [
  { id: "sid_01", value: "CAFECHAI", status: "APPROVED" },
  { id: "sid_02", value: "NOTIFY",   status: "APPROVED" },
  { id: "sid_03", value: "PROMO-LK", status: "APPROVED" },
];

export const MOCK_ROUTES: SMSRoute[] = [
  { id: "route_01", name: "Premium Route",  description: "Priority delivery, highest success rate",   status: "ACTIVE" },
  { id: "route_02", name: "Default Route",  description: "Standard delivery route",                   status: "ACTIVE" },
  { id: "route_03", name: "Economy Route",  description: "Cost-effective for bulk campaigns",         status: "ACTIVE" },
];

export const MOCK_SETTINGS: AppSettings = {
  companyName: "CafeChai Sri Lanka",
  defaultCountry: "Sri Lanka",
  defaultCountryCode: "+94",
  timezone: "Asia/Colombo",
  defaultSenderId: "CAFECHAI",
  defaultRoute: "Premium Route",
  smsBalanceWarningThreshold: 5000,
};
