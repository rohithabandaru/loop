import Papa from "papaparse";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { SUPPORTED_CHANNELS, SupportedChannelType } from "./validations/import";

export type SupportedFileType = "csv" | "xlsx" | "xls" | "json" | "txt" | "docx" | "pdf" | "unknown";

export interface RawRowData {
  [key: string]: unknown;
}

export interface ParsedFeedbackRow {
  rowNumber: number; // 1-indexed row number
  content: string;
  channel: string;
  customerLabel: string;
  customerName?: string;
  customerEmail?: string;
  company?: string;
  source?: string;
  rating?: number | string;
  reviewTitle?: string;
  title?: string;
  product?: string;
  tags?: string;
  priority?: string;
  reviewDate?: string;
  verifiedPurchase?: boolean | string;
  sourceRef?: string;

  // Validation status
  isValid: boolean;
  isDuplicate: boolean;
  duplicateOfRow?: number;
  validationErrors: string[];
  raw: RawRowData;
}

export interface ValidationSummary {
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  duplicateRowsCount: number;
  fileType: SupportedFileType;
  detectedHeaders: string[];
  missingRequiredHeaders: string[];
  rows: ParsedFeedbackRow[];
  previewRows: ParsedFeedbackRow[]; // First 10 rows
  validationErrors: Array<{ rowNumber: number; errors: string[] }>;
}

export function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Detect file format from file extension or MIME type */
export function detectFileType(file: File | string): SupportedFileType {
  const filename = typeof file === "string" ? file : file.name;
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "csv") return "csv";
  if (ext === "xlsx") return "xlsx";
  if (ext === "xls") return "xls";
  if (ext === "json") return "json";
  if (ext === "txt") return "txt";
  if (ext === "docx") return "docx";
  if (ext === "pdf") return "pdf";

  if (typeof file !== "string" && file.type) {
    if (file.type === "text/csv") return "csv";
    if (file.type === "application/json") return "json";
    if (file.type === "text/plain") return "txt";
    if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return "xlsx";
    if (file.type === "application/vnd.ms-excel") return "xls";
    if (file.type === "application/pdf") return "pdf";
    if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  }

  return "unknown";
}

const COLUMN_ALIASES: Record<string, string[]> = {
  content: ["content", "feedback", "text", "message", "description", "comment", "review", "notes", "body"],
  channel: ["channel", "source", "type", "medium", "origin"],
  customerLabel: ["customerlabel", "customer_label", "customer label", "customer", "user", "email", "client", "company", "account"],
  customerName: ["customername", "customer_name", "customer name", "name", "full_name", "user_name"],
  customerEmail: ["customeremail", "customer_email", "customer email", "email"],
  company: ["company", "organization", "org", "business"],
  source: ["source", "source_name", "platform", "system"],
  rating: ["rating", "score", "stars", "star_rating"],
  title: ["title", "reviewtitle", "review_title", "subject", "headline"],
  product: ["product", "item", "feature", "module", "app"],
  tags: ["tags", "tag", "labels", "categories"],
  priority: ["priority", "urgency", "severity"],
  sourceRef: ["sourceref", "source_ref", "source ref", "ref", "id", "ticket", "ticketid", "ticket_id"],
};

export function getRowValue(row: RawRowData, fieldName: string): string {
  const aliases = COLUMN_ALIASES[fieldName] || [fieldName];
  const normalizedRow = new Map<string, unknown>();

  for (const [rk, rv] of Object.entries(row)) {
    normalizedRow.set(normalizeKey(rk), rv);
  }

  for (const alias of aliases) {
    const normAlias = normalizeKey(alias);
    if (normalizedRow.has(normAlias)) {
      const val = normalizedRow.get(normAlias);
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        return String(val).trim();
      }
    }
  }

  return "";
}

/** Normalize raw channel string into one of 18 supported channel enums */
export function normalizeChannel(raw: string): SupportedChannelType {
  if (!raw) return "SUPPORT_TICKET";

  const upper = raw.toUpperCase().replace(/[\s-]+/g, "_");
  if ((SUPPORTED_CHANNELS as readonly string[]).includes(upper)) {
    return upper as SupportedChannelType;
  }

  const compact = normalizeKey(raw);
  const aliases: Record<string, SupportedChannelType> = {
    support: "SUPPORT_TICKET",
    supportticket: "SUPPORT_TICKET",
    ticket: "SUPPORT_TICKET",
    zendesk: "SUPPORT_TICKET",
    email: "EMAIL",
    mail: "EMAIL",
    gmail: "EMAIL",
    amazon: "AMAZON_REVIEW",
    amazonreview: "AMAZON_REVIEW",
    google: "GOOGLE_REVIEW",
    googlereview: "GOOGLE_REVIEW",
    g2: "GOOGLE_REVIEW",
    playstore: "PLAY_STORE",
    googleplay: "PLAY_STORE",
    appstore: "APP_STORE",
    ios: "APP_STORE",
    apple: "APP_STORE",
    website: "WEBSITE",
    web: "WEBSITE",
    site: "WEBSITE",
    livechat: "LIVE_CHAT",
    chat: "LIVE_CHAT",
    intercom: "LIVE_CHAT",
    drift: "LIVE_CHAT",
    facebook: "FACEBOOK",
    fb: "FACEBOOK",
    instagram: "INSTAGRAM",
    ig: "INSTAGRAM",
    twitter: "TWITTER_X",
    twitterx: "TWITTER_X",
    x: "TWITTER_X",
    linkedin: "LINKEDIN",
    whatsapp: "WHATSAPP",
    phone: "PHONE_CALL",
    phonecall: "PHONE_CALL",
    call: "PHONE_CALL",
    survey: "SURVEY",
    surveymonkey: "SURVEY",
    nps: "NPS",
    npssurvey: "NPS",
    sales: "SALES_CALL",
    salescall: "SALES_CALL",
    hubspot: "SALES_CALL",
    community: "COMMUNITY_FORUM",
    forum: "COMMUNITY_FORUM",
    discourse: "COMMUNITY_FORUM",
    slack: "COMMUNITY_FORUM",
  };

  return aliases[compact] || "SUPPORT_TICKET";
}

/** Parse CSV string using PapaParse */
export function parseCsvWithPapa(csvContent: string): RawRowData[] {
  const result = Papa.parse<RawRowData>(csvContent, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });
  return result.data || [];
}

/** Parse Excel buffer using xlsx library */
export function parseExcelBuffer(buffer: ArrayBuffer | Buffer): RawRowData[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<RawRowData>(worksheet, { defval: "", raw: false });
}

/** Parse JSON content (JSON array of feedback objects) */
export function parseJsonContent(jsonText: string): RawRowData[] {
  try {
    const parsed = JSON.parse(jsonText);
    if (Array.isArray(parsed)) {
      return parsed;
    } else if (parsed && typeof parsed === "object") {
      return [parsed];
    }
  } catch (err) {
    console.warn("Invalid JSON input:", err);
  }
  return [];
}

/** Smartly split pasted multi-review text into individual feedback rows */
export function smartSplitPastedFeedback(rawText: string): RawRowData[] {
  const clean = rawText.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  const blocks = clean
    .split(/(?:\n\s*\n|\n?---+|\n?===+)/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  const results: RawRowData[] = [];

  for (const block of blocks) {
    const match = block.match(/^(?:(?:[0-9]+\.\s*)?([A-Za-z0-9\s._-]+?)\s*(?::|-|–)\s*)([\s\S]+)$/);
    if (match) {
      const customerName = match[1].trim();
      const content = match[2].trim();
      results.push({
        content,
        customerName,
        customerLabel: customerName,
        channel: "LIVE_CHAT",
      });
    } else {
      const lines = block.split("\n").filter((l) => l.trim().length > 0);
      let isSingleStructured = false;

      if (lines.length > 1 && lines.every((l) => /^[A-Za-z0-9\s._-]+?\s*:\s*.+/.test(l.trim()))) {
        lines.forEach((line) => {
          const colonIdx = line.indexOf(":");
          const customerName = line.slice(0, colonIdx).trim();
          const content = line.slice(colonIdx + 1).trim();
          results.push({
            content,
            customerName,
            customerLabel: customerName,
            channel: "COMMUNITY_FORUM",
          });
        });
        isSingleStructured = true;
      }

      if (!isSingleStructured) {
        results.push({
          content: block,
          channel: "SUPPORT_TICKET",
          customerLabel: "Pasted Review",
        });
      }
    }
  }

  return results;
}

/** Analyze and validate raw row entries */
export function validateAndProcessRows(
  rawRows: RawRowData[],
  fileType: SupportedFileType
): ValidationSummary {
  const detectedHeaders = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
  const processedRows: ParsedFeedbackRow[] = [];
  const contentSeen = new Map<string, number>();
  const rowValidationErrors: Array<{ rowNumber: number; errors: string[] }> = [];

  let validRowsCount = 0;
  let invalidRowsCount = 0;
  let duplicateRowsCount = 0;

  rawRows.forEach((row, index) => {
    const rowNumber = index + 1;
    const errors: string[] = [];

    const content = getRowValue(row, "content");
    const rawChannel = getRowValue(row, "channel");
    const channel = normalizeChannel(rawChannel);

    const customerName = getRowValue(row, "customerName");
    const customerEmail = getRowValue(row, "customerEmail");
    const company = getRowValue(row, "company");
    const rawCustomerLabel = getRowValue(row, "customerLabel");
    const customerLabel = rawCustomerLabel || customerName || customerEmail || company || "Imported Customer";

    const source = getRowValue(row, "source");
    const rating = getRowValue(row, "rating");
    const title = getRowValue(row, "title") || getRowValue(row, "reviewTitle");
    const product = getRowValue(row, "product");
    const tags = getRowValue(row, "tags");
    const priority = getRowValue(row, "priority") || "MEDIUM";
    const sourceRef = getRowValue(row, "sourceRef") || `IMP-${Date.now().toString().slice(-4)}-${rowNumber}`;

    if (!content) {
      errors.push("Missing required field 'content'.");
    } else if (content.length < 3) {
      errors.push("'content' must be at least 3 characters long.");
    }

    let isDuplicate = false;
    let duplicateOfRow: number | undefined;

    if (content && content.trim().length >= 3) {
      const normalizedContent = content.trim().toLowerCase();
      if (contentSeen.has(normalizedContent)) {
        isDuplicate = true;
        duplicateOfRow = contentSeen.get(normalizedContent);
        errors.push(`Duplicate content detected (matches Row #${duplicateOfRow}).`);
        duplicateRowsCount++;
      } else {
        contentSeen.set(normalizedContent, rowNumber);
      }
    }

    const isValid = errors.length === 0;
    if (isValid) {
      validRowsCount++;
    } else {
      invalidRowsCount++;
      rowValidationErrors.push({ rowNumber, errors });
    }

    processedRows.push({
      rowNumber,
      content,
      channel,
      customerLabel,
      customerName: customerName || undefined,
      customerEmail: customerEmail || undefined,
      company: company || undefined,
      source: source || undefined,
      rating: rating || undefined,
      title: title || undefined,
      product: product || undefined,
      tags: tags || undefined,
      priority,
      sourceRef,
      isValid,
      isDuplicate,
      duplicateOfRow,
      validationErrors: errors,
      raw: row,
    });
  });

  return {
    totalRows: rawRows.length,
    validRowsCount,
    invalidRowsCount,
    duplicateRowsCount,
    fileType,
    detectedHeaders,
    missingRequiredHeaders: [],
    rows: processedRows,
    previewRows: processedRows.slice(0, 10),
    validationErrors: rowValidationErrors,
  };
}

/** Parse file (CSV, Excel, JSON, TXT, DOCX, PDF) and return ValidationSummary */
export async function parseAndValidateFile(file: File): Promise<ValidationSummary> {
  const fileType = detectFileType(file);

  if (fileType === "csv") {
    const text = await file.text();
    const cleanText = text.replace(/^\uFEFF/, "").trim();
    const rawRows = parseCsvWithPapa(cleanText);
    return validateAndProcessRows(rawRows, "csv");
  } else if (fileType === "xlsx" || fileType === "xls") {
    const buffer = await file.arrayBuffer();
    const rawRows = parseExcelBuffer(buffer);
    return validateAndProcessRows(rawRows, fileType);
  } else if (fileType === "json") {
    const text = await file.text();
    const rawRows = parseJsonContent(text);
    return validateAndProcessRows(rawRows, "json");
  } else if (fileType === "txt") {
    const text = await file.text();
    const rawRows = smartSplitPastedFeedback(text);
    return validateAndProcessRows(rawRows, "txt");
  } else if (fileType === "docx") {
    const buffer = await file.arrayBuffer();
    const docxResult = await mammoth.extractRawText({ arrayBuffer: buffer });
    const rawRows = smartSplitPastedFeedback(docxResult.value || "");
    return validateAndProcessRows(rawRows, "docx");
  } else if (fileType === "pdf") {
    const buffer = await file.arrayBuffer();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const pdfResult = await pdfParse(Buffer.from(buffer));
    const rawRows = smartSplitPastedFeedback(pdfResult.text || "");
    return validateAndProcessRows(rawRows, "pdf");
  } else {
    const text = await file.text();
    const rawRows = parseCsvWithPapa(text);
    return validateAndProcessRows(rawRows, "unknown");
  }
}

/** Generate realistic fake feedback for 10 simulated channel cards */
export function generateSimulatedChannelFeedback(channelKey: string): RawRowData[] {
  const now = Date.now();
  switch (channelKey) {
    case "amazon":
      return [
        {
          customerName: "David Miller",
          customerEmail: "david.m@amazonbuyer.com",
          company: "Personal Purchase",
          channel: "AMAZON_REVIEW",
          source: "Amazon Storefront",
          rating: 5,
          title: "Incredible workflow speedup!",
          content: "The desktop sync is fast and effortless. Reduced our customer tag setup time from days to hours. Package arrived earlier than expected.",
          tags: "Amazon, Verified Purchase, 5-Star",
          priority: "LOW",
          sourceRef: `AMZ-${now}-1`,
        },
        {
          customerName: "Sarah Jenkins",
          customerEmail: "sjenkins@outlook.com",
          company: "Retail Inc",
          channel: "AMAZON_REVIEW",
          source: "Amazon Storefront",
          rating: 2,
          title: "Battery drain issue on mobile app",
          content: "While the analytics dashboard is helpful, the background battery consumption on iOS is unacceptable. Drains 25% battery in 30 minutes.",
          tags: "Amazon, Bug, Mobile",
          priority: "HIGH",
          sourceRef: `AMZ-${now}-2`,
        },
      ];

    case "google":
      return [
        {
          customerName: "Carlos Rodriguez",
          customerEmail: "carlos.r@gmail.com",
          company: "Growth Logistics",
          channel: "GOOGLE_REVIEW",
          source: "Google Maps Business",
          rating: 5,
          title: "Best customer intelligence suite",
          content: "Outstanding customer service and AI classification accuracy. The automated theme tagging saved our support team hundreds of hours.",
          tags: "Google Review, Enterprise",
          priority: "LOW",
          sourceRef: `GGL-${now}-1`,
        },
      ];

    case "appstore":
      return [
        {
          customerName: "Emily Chen",
          customerEmail: "emily.chen@appledev.net",
          company: "Mobile User",
          channel: "APP_STORE",
          source: "Apple App Store",
          rating: 1,
          title: "App crashes after iOS 18 update",
          content: "Cannot open the feedback details modal without the app freezing. Please push a hotfix for iOS 18 immediately!",
          tags: "iOS, Crash, High Priority",
          priority: "URGENT",
          sourceRef: `APP-${now}-1`,
        },
      ];

    case "playstore":
      return [
        {
          customerName: "Rahul Sharma",
          customerEmail: "rahul.sharma@techmail.com",
          company: "Android User",
          channel: "PLAY_STORE",
          source: "Google Play Store",
          rating: 4,
          title: "Great features, slightly slow dark mode toggle",
          content: "Overall a top-tier app for tracking customer tickets. The recent update fixed the push notification bug. Dark mode transition could be smoother.",
          tags: "Android, Play Store",
          priority: "MEDIUM",
          sourceRef: `PLAY-${now}-1`,
        },
      ];

    case "zendesk":
      return [
        {
          customerName: "Marcus Vance",
          customerEmail: "marcus@enterprise-corp.com",
          company: "Enterprise Corp",
          channel: "SUPPORT_TICKET",
          source: "Zendesk Integration",
          rating: 2,
          title: "SAML SSO Okta authentication failing",
          content: "Our team of 150 analysts cannot log into LOOP via Okta SAML SSO this morning. Redirect URL returns 500 internal error.",
          tags: "Zendesk, SSO, Security",
          priority: "URGENT",
          sourceRef: `ZD-${now}-1`,
        },
      ];

    case "email":
      return [
        {
          customerName: "Laura Thompson",
          customerEmail: "laura.t@acme.io",
          company: "Acme IO",
          channel: "EMAIL",
          source: "Inbound Support Email",
          rating: 4,
          title: "Feature Request: Custom CSV Export Filters",
          content: "We would love to export only high-priority negative feedback rows to CSV directly from the reporting tab. Is this on your product roadmap?",
          tags: "Email, Feature Request",
          priority: "MEDIUM",
          sourceRef: `EML-${now}-1`,
        },
      ];

    case "nps":
      return [
        {
          customerName: "Brian O'Connor",
          customerEmail: "brian@fastlogistics.com",
          company: "Fast Logistics",
          channel: "NPS",
          source: "Quarterly Survey",
          rating: 10,
          title: "Promoter Score 10/10",
          content: "LOOP has completely transformed how our product manager prioritizes sprint features. AI rationale gives instant clarity on customer churn drivers.",
          tags: "NPS, Promoter",
          priority: "LOW",
          sourceRef: `NPS-${now}-1`,
        },
      ];

    case "social":
      return [
        {
          customerName: "@tech_insider_alex",
          customerEmail: "alex@socialinfluencer.co",
          company: "Social Media",
          channel: "TWITTER_X",
          source: "X / Twitter Mention",
          rating: 5,
          title: "Shoutout to Project LOOP!",
          content: "Just tested @ProjectLOOP's new multi-channel feedback importer. Handling Excel, CSV, and Zendesk in one clean interface is game changing 🔥",
          tags: "Social, Twitter/X, Praise",
          priority: "LOW",
          sourceRef: `SOC-${now}-1`,
        },
      ];

    case "chat":
      return [
        {
          customerName: "Jessica Alba",
          customerEmail: "jessica@designstudio.org",
          company: "Design Studio",
          channel: "LIVE_CHAT",
          source: "Intercom Widget",
          rating: 3,
          title: "Live Chat Inquiry",
          content: "Hi support team! Can we invite read-only viewers to our workspace without upgrading to the custom enterprise tier?",
          tags: "Live Chat, Pricing",
          priority: "MEDIUM",
          sourceRef: `CHAT-${now}-1`,
        },
      ];

    case "contact":
      return [
        {
          customerName: "Robert Green",
          customerEmail: "robert.green@fintech-global.com",
          company: "Fintech Global",
          channel: "WEBSITE",
          source: "Website Contact Form",
          rating: 5,
          title: "Enterprise Demo Request",
          content: "Interested in deploying LOOP across 500 customer success representatives with custom HIPAA compliance. Please have a sales lead call me.",
          tags: "Website Form, Sales Lead",
          priority: "HIGH",
          sourceRef: `WEB-${now}-1`,
        },
      ];

    default:
      return [
        {
          customerName: "Sample Customer",
          customerEmail: "sample@customer.com",
          company: "Sample Corp",
          channel: "SUPPORT_TICKET",
          source: "Simulated Channel",
          rating: 4,
          title: "Generic Support Feedback",
          content: "Great customer experience and responsive feature roadmap updates.",
          tags: "Simulation",
          priority: "MEDIUM",
          sourceRef: `SIM-${now}-1`,
        },
      ];
  }
}
