import { z } from "zod";

export const SUPPORTED_CHANNELS = [
  "SUPPORT_TICKET",
  "EMAIL",
  "AMAZON_REVIEW",
  "GOOGLE_REVIEW",
  "PLAY_STORE",
  "APP_STORE",
  "WEBSITE",
  "LIVE_CHAT",
  "FACEBOOK",
  "INSTAGRAM",
  "TWITTER_X",
  "LINKEDIN",
  "WHATSAPP",
  "PHONE_CALL",
  "SURVEY",
  "NPS",
  "SALES_CALL",
  "COMMUNITY_FORUM",
] as const;

export type SupportedChannelType = (typeof SUPPORTED_CHANNELS)[number];

export const PRIORITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const SingleFeedbackSchema = z.object({
  customerName: z.string().optional(),
  customerEmail: z.string().email("Invalid email address.").optional().or(z.literal("")),
  company: z.string().optional(),
  channel: z.enum(SUPPORTED_CHANNELS, {
    message: "Invalid channel source provided.",
  }),
  source: z.string().optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  product: z.string().optional(),
  title: z.string().optional(),
  content: z.string().min(3, "Feedback content must be at least 3 characters long."),
  tags: z.string().optional(),
  priority: z.enum(PRIORITY_LEVELS).optional().default("MEDIUM"),
  sourceRef: z.string().optional(),
  customerLabel: z.string().optional(),
});

export type SingleFeedbackInput = z.infer<typeof SingleFeedbackSchema>;

export const BatchItemSchema = z.object({
  content: z.string().min(3, "Feedback content must be at least 3 characters long."),
  channel: z.string().default("SUPPORT_TICKET"),
  customerLabel: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  rating: z.coerce.number().optional(),
  title: z.string().optional(),
  product: z.string().optional(),
  tags: z.string().optional(),
  priority: z.string().optional(),
  sourceRef: z.string().optional(),
});

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
export const ALLOWED_FILE_EXTENSIONS = [
  "csv",
  "xlsx",
  "xls",
  "json",
  "txt",
  "docx",
  "pdf",
] as const;
