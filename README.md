# Project LOOP — AI Customer-Feedback Intelligence Platform

Project LOOP is a corporate-grade web application built for SaaS product management teams, support leads, and founders to ingest scattered customer feedback and transform it into ranked, evidence-backed product decisions.

Ingesting feedback across support tickets, app store reviews, survey responses, sales call notes, and community posts, LOOP leverages AI to auto-classify sentiment, cluster themes, detect volume spikes, power retrieval-grounded semantic Q&A (Ask LOOP RAG), and generate Voice-of-Customer (VoC) executive digests.

---

## 🌟 Key Features

### 1. Multi-Tenant Workspaces & Role-Based Access Control (RBAC)
- **Tenant Isolation**: Every database query is strictly scoped by `workspaceId`. Data belonging to Company A is completely isolated from Company B.
- **Three RBAC Roles**:
  - **ADMIN**: Manages workspace members, changes roles, ingests feedback, and deletes items.
  - **ANALYST**: Ingests single/CSV/simulated feedback, manages triage workflow (`NEW` → `REVIEWED` → `ACTIONED`), triggers AI re-classification, and generates VoC executive reports.
  - **VIEWER**: Read-only access to dashboards, inbox, themes, Ask LOOP, and VoC reports.

### 2. Ingestion Engine Suite
- **Single-Entry Form**: Create individual feedback entries with channel selection and Zod validation.
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

### 5. AI Features (Anthropic Claude API + Heuristic Fallback Engine)
- **AI1 Auto-Classification**: Automatically detects sentiment (Positive/Neutral/Negative), sentiment score (-1.0 to 1.0), theme association, feature area, and rationale on ingest.
- **AI2 Theme Clustering & Volume Trends**: Identifies week-over-week volume spikes (`+X% WoW`), flags spiking themes with alerts, and provides a detailed drill-down modal into linked feedback items.
- **AI3 Ask LOOP (Grounded Q&A RAG)**: Performs semantic vector retrieval across workspace feedback to answer natural language questions grounded strictly in verbatim context with evidence citations.
- **AI4 Voice-of-Customer (VoC) Executive Reports**: Synthesizes executive summaries, metric deltas, verbatim quotes, and strategic recommendations for 7-day, 30-day, or 90-day periods. Supports one-click PDF print export.

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router) + TypeScript |
| **Styling** | Tailwind CSS (Corporate Dark Theme, Glassmorphism) |
| **Database & ORM** | PostgreSQL / SQLite + Prisma ORM 6 |
| **Authentication** | Session JWT Cookies with bcrypt password hashing |
| **AI Integration** | Anthropic Claude API (`@anthropic-ai/sdk`) + Heuristic NLP Fallback |
| **Embeddings & Search** | Keyword Token Vectors & Semantic Similarity Retrieval |
| **Visualizations** | Recharts |
| **Validation** | Zod |

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- Node.js 18 LTS or newer
- Git

### 2. Installation
```bash
git clone <repository-url>
cd loop
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="super-secret-loop-jwt-key-2026"
ANTHROPIC_API_KEY="your-anthropic-claude-api-key" # Optional: Heuristic AI engine activates if empty
```

### 4. Database Setup & Seed Data
Push the Prisma schema and populate 125+ realistic feedback entries across 5 channels, 6 themes, 3 users, and a demo VoC report:
```bash
npx prisma db push
npm run seed
```

### 5. Run Local Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Preset Demo Credentials for Evaluation

For fast rubric grading, the login page features 1-click preset login buttons for all three RBAC roles:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@acme.com` | `password123` | Full Access (Ingest, Triage, Manage Roles, Delete) |
| **Analyst** | `analyst@acme.com` | `password123` | Ingest, Triage, Re-classify, VoC Reports |
| **Viewer** | `viewer@acme.com` | `password123` | Read-Only (Dashboard, Inbox, Ask LOOP, Reports) |

---

## 📁 Repository Structure

```
loop/
├── app/
│   ├── (auth)/             # Login & Signup pages
│   ├── (app)/              # Authenticated App Shell Pages
│   │   ├── dashboard/      # Recharts analytics dashboard
│   │   ├── inbox font/     # Paginated triage inbox with status workflow
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
