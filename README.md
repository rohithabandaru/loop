# Project LOOP — AI Customer-Feedback Intelligence Platform

## Overview
Project LOOP is a corporate-grade web application built for SaaS product management teams, support leads, and founders to ingest scattered multi-channel customer feedback and transform it into ranked, evidence-backed product decisions.

Ingesting feedback across support tickets, app store reviews, survey responses, sales call notes, and community posts, LOOP leverages Anthropic Claude AI to auto-classify sentiment, cluster themes, detect volume spikes, power retrieval-grounded semantic Q&A (Ask LOOP RAG), and generate Voice-of-Customer (VoC) executive digests.

---

## Features

### 1. Multi-Tenant Workspaces & RBAC
- **Tenant Isolation**: Every database query is strictly scoped by `workspaceId`. Cross-tenant data access is strictly prohibited.
- **Three Access Roles**: `ADMIN`, `ANALYST`, and `VIEWER`.
- **Workspace Management**: Admin team invite & role management interface.

### 2. Ingestion Engine Suite
- **Single-Entry Form**: Manual feedback creation with Zod runtime validation.
- **CSV Bulk Importer**: Upload or paste CSV files with preview parsing, row validation, and success/failure breakdown.
- **Simulated Integration Channels**: 1-click sync triggers for Zendesk Support Tickets, App Store Reviews, SurveyMonkey NPS, and HubSpot Sales Call Notes.

### 3. Feedback Triage Inbox
- **Server-Side Pagination**: Efficient pagination handling large feedback volumes.
- **Multi-Filter & Full-Text Search**: Filter by Channel, Sentiment, Theme, Status, and Date Range.
- **Interactive Workflow**: Advance feedback status (`NEW` → `REVIEWED` → `ACTIONED`).
- **AI Re-Classification**: On-demand trigger to correct or refresh AI sentiment and theme assignments.

### 4. Executive Analytics Dashboard
- Dynamic Recharts visualizations:
  1. **Volume & Sentiment Over Time**: Daily velocity area chart comparing positive vs negative sentiment.
  2. **Sentiment Distribution**: Donut chart breakdown.
  3. **Top Themes**: Horizontal bar chart distribution.
  4. **Channel Distribution**: Ingestion source breakdown.
- Metric Stat Cards: Total Items, % Negative Sentiment, Actioned Rate, and New This Week count.

### 5. AI Engine Suite
- **AI1 Auto-Classification**: Automatically detects sentiment (Positive/Neutral/Negative), sentiment score (-1.0 to 1.0), theme association, feature area, and rationale on ingest.
- **AI2 Theme Clustering & Volume Trends**: Identifies week-over-week volume spikes (`+X% WoW`), flags spiking themes with alerts, and provides a detailed drill-down modal into linked feedback items.
- **AI3 Ask LOOP (Grounded Q&A RAG)**: Performs semantic vector retrieval across workspace feedback to answer natural language questions grounded strictly in verbatim context with evidence citations.
- **AI4 Voice-of-Customer (VoC) Executive Reports**: Synthesizes executive summaries, metric deltas, verbatim quotes, and strategic recommendations for 7-day, 30-day, or 90-day periods. Supports one-click PDF print export.

---

## Tech Stack
- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS (Corporate Dark Theme, Glassmorphism)
- **Database & ORM**: PostgreSQL / SQLite + Prisma ORM 6
- **Authentication**: Session JWT Cookies with bcrypt password hashing
- **AI Integration**: Anthropic Claude API (`@anthropic-ai/sdk`) + Heuristic NLP Fallback
- **Embeddings & Search**: Keyword Token Vectors & Semantic Similarity Retrieval
- **Visualizations**: Recharts
- **Validation**: Zod

---

## System Architecture
LOOP follows a 3-tier architecture with server-side isolation:
1. **Client Layer**: Next.js App Router (Server & Client Components) with responsive Tailwind styling.
2. **API Layer (Route Handlers)**: Session authentication, RBAC authorization, Zod validation, and workspace query scoping (`where: { workspaceId }`).
3. **Services & Storage Layer**:
   - `lib/ai.ts`: Anthropic Claude API integration + structured JSON parsing.
   - `lib/search.ts`: Semantic token vector search for Ask LOOP RAG.
   - `prisma/schema.prisma`: Relational database mapping Workspaces, Users, Feedback, Themes, Embeddings, and Reports.

---

## Folder Structure
```
loop/
├── app/
│   ├── (auth)/             # Login & Signup pages
│   ├── (app)/              # Authenticated App Shell Pages
│   │   ├── dashboard/      # Recharts analytics dashboard
│   │   ├── inbox/          # Paginated triage inbox with status workflow
│   │   ├── trends/         # Theme clustering & WoW spike alerts
│   │   ├── ask/            # Ask LOOP RAG semantic Q&A
│   │   ├── reports/        # VoC executive digests & PDF print export
│   │   └── settings/       # Workspace team & RBAC management
│   └── api/                # REST Route Handlers (Auth, Feedback, CSV, Simulate, Themes, Ask, Reports, Members)
├── components/             # Reusable UI building blocks (Navbar, Sidebar, StatCard, IngestionModal, ThemeModal)
├── lib/
│   ├── ai.ts               # Anthropic Claude API & Heuristic AI engine
│   ├── auth.ts             # Session authentication & RBAC guards
│   ├── db.ts               # Prisma Client singleton
│   └── search.ts           # Semantic vector search retrieval
└── prisma/
    ├── schema.prisma       # Database entities & relationships
    └── seed.ts             # 125+ item seed script
```

---

## Database Schema
The minimum required schema includes:
- **`Workspace`**: Tenant workspace with name and timestamps.
- **`User`**: Hashed password, role (`ADMIN` | `ANALYST` | `VIEWER`), and `workspaceId`.
- **`Feedback`**: Content, channel, customer label, sentiment, sentiment score, status (`NEW` | `REVIEWED` | `ACTIONED`), feature area, rationale, and `workspaceId`.
- **`Theme`**: Cluster name, description, badge color, and `workspaceId`.
- **`FeedbackTheme`**: Join table mapping feedback items to themes with confidence scores.
- **`Embedding`**: Stored feedback vector token JSON representation.
- **`Report`**: Generated VoC reports with period bounds, structured metrics, quotes, and markdown content.

---

## Prerequisites
- Node.js 18 LTS or newer
- Git

---

## Installation
```bash
git clone <repository-url>
cd loop
npm install
```

---

## Environment Variables
Create a `.env` file in the project root:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="super-secret-loop-jwt-key-2026"
ANTHROPIC_API_KEY="your-anthropic-claude-api-key" # Optional: Heuristic AI engine activates if empty
```

---

## Database Setup
Run Prisma migrations/db push to create the relational tables:
```bash
npx prisma db push
```

---

## Seed Data
Populate 125+ realistic customer feedback entries across 5 channels, 6 core themes, 3 demo users (Admin, Analyst, Viewer), and an executive VoC report:
```bash
npm run seed
```

---

## Running the Project
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Endpoints
- `POST /api/auth/login` - User login with credentials or quick-login.
- `POST /api/auth/signup` - Register account & create new workspace.
- `GET /api/auth/me` - Get active session user info.
- `POST /api/auth/logout` - Clear session token.
- `GET /api/feedback` - List paginated feedback with filters.
- `POST /api/feedback` - Submit single feedback item & auto-classify.
- `POST /api/feedback/csv` - Bulk import CSV feedback records.
- `POST /api/feedback/simulate` - Simulate channel sync (Zendesk, App Store, NPS, Sales Notes).
- `PATCH /api/feedback/[id]` - Update status workflow or trigger AI re-classify.
- `DELETE /api/feedback/[id]` - Delete feedback item (Admin only).
- `GET /api/themes` - List themes with volume counts & spike percentages.
- `POST /api/ask` - Ask LOOP grounded semantic Q&A (RAG).
- `GET /api/reports` - List saved VoC reports.
- `POST /api/reports` - Generate new Voice of Customer report.
- `GET /api/members` - List workspace team members.
- `POST /api/members` - Invite member with assigned role (Admin only).

---

## AI Features
1. **Auto-Classification (AI1)**: Structured JSON output with Zod schema validation.
2. **Theme Clustering & Trends (AI2)**: Week-over-week spike detection (`+X% WoW`).
3. **Ask LOOP (AI3)**: Retrieval-Augmented Generation (RAG) with verbatim evidence citations.
4. **Voice of Customer Digest (AI4)**: Synthesized executive report with PDF print layout.

---

## User Roles (RBAC)
- **ADMIN**: Full access (ingest, triage, manage roles, delete items).
- **ANALYST**: Ingest feedback, CSV imports, triage status updates, AI re-classification, VoC reports.
- **VIEWER**: Read-only access across all dashboards, inbox, trends, Ask LOOP, and reports.

---

## Screenshots
*(Add screenshots of Dashboard, Inbox, Ask LOOP, and VoC Reports during deployment)*

---

## Deployment
1. Connect repository to Vercel.
2. Configure `DATABASE_URL`, `NEXTAUTH_SECRET`, and `ANTHROPIC_API_KEY` in Vercel Project Settings.
3. Deploy!

---

## Demo Credentials
For evaluator testing, use the 1-click preset login buttons on the login page:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@acme.com` | `password123` | Full Access (Ingest, Triage, Manage Roles, Delete) |
| **Analyst** | `analyst@acme.com` | `password123` | Ingest, Triage, Re-classify, VoC Reports |
| **Viewer** | `viewer@acme.com` | `password123` | Read-Only (Dashboard, Inbox, Ask LOOP, Reports) |

---

## Future Enhancements
- Live Zendesk & Slack Webhook Connectors
- Sentiment Trend Email Alerts
- Custom Saved Views / Inbox Filters

---

## License
Confidential — Issued for Zidio Development Internship Program.
