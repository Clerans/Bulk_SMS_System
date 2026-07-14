// ─── Domain Types ─────────────────────────────────────────────────────────────

export type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIALLY_FAILED"
  | "FAILED"
  | "CANCELLED";

export type DeliveryStatus = "PENDING" | "QUEUED" | "SENT" | "DELIVERED" | "FAILED";

export type ContactStatus = "ACTIVE" | "UNSUBSCRIBED" | "BLACKLISTED" | "INVALID";

export type RecipientSource = "CSV" | "GROUPS" | "MANUAL";

export type TemplateCategory = "Marketing" | "Transactional" | "Reminder" | "Notification" | "OTP";

export type UserRole = "ADMIN" | "OPERATOR";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  senderId: string;
  message: string;
  status: CampaignStatus;
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  pendingCount: number;
  smsUnits: number;
  route: string;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  group: string;
  country: string;
  status: ContactStatus;
  lastCampaign: string | null;
}

export interface ContactGroup {
  id: string;
  name: string;
  description: string;
  contactCount: number;
  createdAt: string;
}

export interface SMSTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  message: string;
  variables: string[];
  createdAt: string;
}

export interface SMSRoute {
  id: string;
  name: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface SenderId {
  id: string;
  value: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

export interface DeliveryReport {
  id: string;
  campaignName: string;
  phone: string;
  status: DeliveryStatus;
  sentAt: string;
  deliveredAt: string | null;
  failureReason: string | null;
}

export interface DashboardSummary {
  totalSent: number;
  delivered: number;
  failed: number;
  activeCampaigns: number;
  smsBalance: number;
  campaignCount: number;
}

export interface DeliveryTrend {
  date: string;
  delivered: number;
  failed: number;
}

export interface AppSettings {
  companyName: string;
  defaultCountry: string;
  defaultCountryCode: string;
  timezone: string;
  defaultSenderId: string;
  defaultRoute: string;
  smsBalanceWarningThreshold: number;
}

// ─── SMS Utility Types ────────────────────────────────────────────────────────

export interface SmsEncoding {
  encoding: "GSM-7" | "Unicode";
  characterCount: number;
  segmentCount: number;
  charactersPerSegment: number;
  remainingCharacters: number;
}

export interface PhoneNormalizeResult {
  original: string;
  normalized: string | null;
  valid: boolean;
  reason?: string;
}

export interface TemplateResolveResult {
  text: string;
  unresolvedVariables: string[];
}

export interface CsvRecipient {
  name: string;
  phone: string;
  [key: string]: string;
}

export interface CsvParseResult {
  rows: CsvRecipient[];
  headers: string[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
  };
}

// ─── API Request/Response Types ───────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface CreateCampaignRequest {
  name: string;
  senderId: string;
  message: string;
  recipientSource: RecipientSource;
  routeId: string;
  scheduleType: "NOW" | "SCHEDULED";
  scheduledAt?: string;
}

export interface CampaignFilters {
  search?: string;
  status?: CampaignStatus | "ALL";
  dateFrom?: string;
  dateTo?: string;
  senderId?: string;
}

export interface ContactFilters {
  search?: string;
  status?: ContactStatus | "ALL";
  group?: string;
}

export interface ReportFilters {
  search?: string;
  status?: DeliveryStatus | "ALL";
  campaignId?: string;
  dateFrom?: string;
  dateTo?: string;
}
