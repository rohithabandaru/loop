// ============================================================
// Shared TypeScript interfaces for Project LOOP API responses
// ============================================================

/** Theme attached to a feedback item */
export interface FeedbackThemeRef {
  id: string;
  name: string;
  description: string;
  color: string;
}

/** Full feedback item as returned by the API */
export interface FeedbackItem {
  id: string;
  content: string;
  channel: string;
  sourceRef: string | null;
  customerLabel: string | null;
  customerName: string | null;
  customerEmail: string | null;
  company: string | null;
  source: string | null;
  rating: number | null;
  title: string | null;
  product: string | null;
  tags: string | null;
  priority: string;
  language: string;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  sentimentScore: number;
  status: "NEW" | "REVIEWED" | "ACTIONED";
  featureArea: string | null;
  rationale: string | null;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  themes: FeedbackThemeRef[];
}

/** Dashboard stat cards */
export interface DashboardStats {
  total: number;
  negativeRatio: number;
  actionedRatio: number;
  newThisWeek: number;
}

/** Pagination metadata */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Sample feedback item within a theme */
export interface ThemeSampleItem {
  id: string;
  content: string;
  channel: string;
  sentiment: string;
  status: string;
  createdAt: string;
}

/** Theme data as returned by /api/themes */
export interface ThemeData {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  totalCount: number;
  recentCount: number;
  previousCount: number;
  spikePercentage: number;
  isSpiking: boolean;
  negCount: number;
  posCount: number;
  avgScore: number;
  sampleItems: ThemeSampleItem[];
}

/** VoC report content (parsed from contentJson) */
export interface ReportContent {
  summary: string;
  metrics: {
    totalItems: number;
    negativeRatio: number;
    positiveRatio: number;
    topSpikeTheme: string;
    spikePercentage: string;
  };
  quotes: string[];
  recommendations: string[];
}

/** Report as returned by /api/reports */
export interface ReportData {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  contentJson: string;
  workspaceId: string;
  generatedById: string;
  generatedBy: {
    name: string;
    email: string;
  };
  createdAt: string;
}

/** Workspace team member */
export interface MemberData {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "ANALYST" | "VIEWER";
  createdAt: string;
}

/** Citation in Ask LOOP response */
export interface CitedFeedback {
  id: string;
  content: string;
  channel: string;
  sentiment: string;
  customerLabel: string | null;
}
