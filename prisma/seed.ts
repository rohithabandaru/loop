import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Project LOOP multi-workspace seed...");

  // Clean existing data
  await prisma.embedding.deleteMany({});
  await prisma.feedbackTheme.deleteMany({});
  await prisma.feedback.deleteMany({});
  await prisma.theme.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.workspace.deleteMany({});

  const passwordHash = await bcrypt.hash("password123", 10);

  // ==========================================
  // 1. ADMIN WORKSPACE: Acme Enterprise Systems [Admin]
  // ==========================================
  const adminWorkspace = await prisma.workspace.create({
    data: {
      id: "demo-workspace-admin",
      name: "Acme Enterprise Systems [Admin]",
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      id: "user-admin-1",
      name: "Sarah Connor (Admin)",
      email: "admin@acme.com",
      passwordHash,
      role: "ADMIN",
      workspaceId: adminWorkspace.id,
    },
  });

  await prisma.user.create({
    data: {
      id: "user-admin-2",
      name: "Marcus Vance (Security Lead)",
      email: "sec-lead@acme.com",
      passwordHash,
      role: "ANALYST",
      workspaceId: adminWorkspace.id,
    },
  });

  await prisma.user.create({
    data: {
      id: "user-admin-3",
      name: "Elena Rostova (Compliance Auditor)",
      email: "compliance-auditor@acme.com",
      passwordHash,
      role: "VIEWER",
      workspaceId: adminWorkspace.id,
    },
  });

  const adminThemes = [
    { id: "theme-admin-sso", name: "Enterprise SAML & SSO", description: "Okta, Azure AD SAML integrations, 2FA, and SSO login friction.", color: "#06B6D4" },
    { id: "theme-admin-rbac", name: "RBAC & Audit Controls", description: "Role-based access management, permission scoping, and audit logs.", color: "#EF4444" },
    { id: "theme-admin-billing", name: "Enterprise Billing & Licences", description: "Annual invoicing, seat tier management, and invoice PDF timeouts.", color: "#F59E0B" },
    { id: "theme-admin-infra", name: "Infrastructure & Security", description: "System availability, API rate limits, data encryption, and compliance.", color: "#8B5CF6" },
  ];

  const adminCreatedThemes: Record<string, string> = {};
  for (const t of adminThemes) {
    const theme = await prisma.theme.create({
      data: { ...t, workspaceId: adminWorkspace.id },
    });
    adminCreatedThemes[t.name] = theme.id;
  }

  const adminRawFeedback = [
    { content: "Prospect insists on SAML Okta SSO before signing the $50k contract — 3rd time this month.", channel: "SALES_NOTE", customerLabel: "Enterprise - Acme Financial", sentiment: "NEGATIVE", sentimentScore: -0.7, status: "NEW", featureArea: "Security", themeName: "Enterprise SAML & SSO" },
    { content: "Audit logs are missing timestamp filtering options for SOC2 compliance reports.", channel: "SUPPORT_TICKET", customerLabel: "Enterprise Security Director", sentiment: "NEGATIVE", sentimentScore: -0.6, status: "REVIEWED", featureArea: "RBAC Controls", themeName: "RBAC & Audit Controls" },
    { content: "Billing page keeps timing out when attempting to download annual PDF invoice for fiscal audit.", channel: "SUPPORT_TICKET", customerLabel: "Acme Finance Team", sentiment: "NEGATIVE", sentimentScore: -0.85, status: "NEW", featureArea: "Billing", themeName: "Enterprise Billing & Licences" },
    { content: "Role-based access control works great for separating Viewer and Analyst permissions across sub-teams.", channel: "NPS_SURVEY", customerLabel: "Lead Engineer", sentiment: "POSITIVE", sentimentScore: 0.8, status: "ACTIONED", featureArea: "Security", themeName: "RBAC & Audit Controls" },
    { content: "We need automated IP whitelisting capabilities in tenant administration panel.", channel: "COMMUNITY_POST", customerLabel: "DevOps Lead", sentiment: "NEUTRAL", sentimentScore: 0.0, status: "REVIEWED", featureArea: "Infrastructure", themeName: "Infrastructure & Security" },
  ];

  for (let i = 0; i < 45; i++) {
    const template = adminRawFeedback[i % adminRawFeedback.length];
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - (i % 30));
    const fb = await prisma.feedback.create({
      data: {
        content: `${template.content}${i >= 5 ? ` (Ticket audit ref #${2000 + i})` : ""}`,
        channel: template.channel,
        sourceRef: `ADM-${2000 + i}`,
        customerLabel: template.customerLabel,
        sentiment: template.sentiment,
        sentimentScore: template.sentimentScore,
        status: template.status as string,
        featureArea: template.featureArea,
        rationale: `Admin automated security classification.`,
        createdAt: createdDate,
        workspaceId: adminWorkspace.id,
      },
    });
    const themeId = adminCreatedThemes[template.themeName];
    if (themeId) {
      await prisma.feedbackTheme.create({ data: { feedbackId: fb.id, themeId, confidence: 0.94 } });
    }
    const keywords = fb.content.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    await prisma.embedding.create({ data: { feedbackId: fb.id, vectorJson: JSON.stringify(keywords) } });
  }

  await prisma.report.create({
    data: {
      id: "demo-voc-admin",
      title: "Admin Infrastructure & Compliance VoC Digest",
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(),
      contentJson: JSON.stringify({
        summary: "Enterprise admin feedback highlights critical demand for SAML Okta SSO integration and fixing annual PDF invoice download timeouts.",
        metrics: { totalItems: 45, negativeRatio: 0.52, positiveRatio: 0.35, neutralRatio: 0.13, topSpikeTheme: "Enterprise SAML & SSO", spikePercentage: "+80% WoW" },
        quotes: ["Prospect insists on SAML Okta SSO before signing contract.", "Billing page keeps timing out on PDF invoice download."],
        recommendations: ["Ship Okta SAML SSO adapter (P0).", "Fix PDF invoice generator endpoint memory bottleneck.", "Add audit log date-range filtering."],
      }),
      workspaceId: adminWorkspace.id,
      generatedById: adminUser.id,
    },
  });

  console.log(`✅ Seeded Admin Workspace: ${adminWorkspace.name}`);

  // ==========================================
  // 2. ANALYST WORKSPACE: Acme Product Analytics [Analyst]
  // ==========================================
  const analystWorkspace = await prisma.workspace.create({
    data: {
      id: "demo-workspace-analyst",
      name: "Acme Product Analytics [Analyst]",
    },
  });

  const analystUser = await prisma.user.create({
    data: {
      id: "user-analyst-1",
      name: "Alex Rivera (Analyst)",
      email: "analyst@acme.com",
      passwordHash,
      role: "ANALYST",
      workspaceId: analystWorkspace.id,
    },
  });

  await prisma.user.create({
    data: {
      id: "user-analyst-2",
      name: "Maya Lin (Lead Data Analyst)",
      email: "data-lead@acme.com",
      passwordHash,
      role: "ANALYST",
      workspaceId: analystWorkspace.id,
    },
  });

  await prisma.user.create({
    data: {
      id: "user-analyst-3",
      name: "James Thorne (Head of Product)",
      email: "product-manager@acme.com",
      passwordHash,
      role: "ADMIN",
      workspaceId: analystWorkspace.id,
    },
  });

  const analystThemes = [
    { id: "theme-analyst-onboarding", name: "Guided Onboarding & Setup", description: "First-time user setup, walkthrough modals, and workspace initialization.", color: "#6366F1" },
    { id: "theme-analyst-export", name: "CSV & Data Integrations", description: "CSV exports, UTF-8 encoding, webhooks, and Zendesk integration.", color: "#8B5CF6" },
    { id: "theme-analyst-performance", name: "Dashboard Speed & Latency", description: "Chart rendering times, query execution, and date range performance.", color: "#F59E0B" },
    { id: "theme-analyst-ux", name: "Mobile UX & Responsive Layout", description: "Touch target sizes, iOS Safari viewport glitches, and mobile navigation.", color: "#10B981" },
  ];

  const analystCreatedThemes: Record<string, string> = {};
  for (const t of analystThemes) {
    const theme = await prisma.theme.create({
      data: { ...t, workspaceId: analystWorkspace.id },
    });
    analystCreatedThemes[t.name] = theme.id;
  }

  const analystRawFeedback = [
    { content: "Onboarding took forever — I couldn't figure out how to invite my team members.", channel: "SUPPORT_TICKET", customerLabel: "Pro Plan User", sentiment: "NEGATIVE", sentimentScore: -0.8, status: "NEW", featureArea: "Onboarding", themeName: "Guided Onboarding & Setup" },
    { content: "CSV export drops special UTF-8 characters in customer names when opened in Excel.", channel: "SUPPORT_TICKET", customerLabel: "Lead Analyst", sentiment: "NEGATIVE", sentimentScore: -0.5, status: "NEW", featureArea: "Integrations", themeName: "CSV & Data Integrations" },
    { content: "Love the new export feature! Saved me an hour today preparing our weekly slide deck.", channel: "COMMUNITY_POST", customerLabel: "VP of Product", sentiment: "POSITIVE", sentimentScore: 0.9, status: "ACTIONED", featureArea: "Integrations", themeName: "CSV & Data Integrations" },
    { content: "Dashboard charts take 8 to 10 seconds to render when filtering large date ranges.", channel: "SUPPORT_TICKET", customerLabel: "Churn Risk Customer", sentiment: "NEGATIVE", sentimentScore: -0.75, status: "NEW", featureArea: "Performance", themeName: "Dashboard Speed & Latency" },
    { content: "Buttons are too small to tap on mobile screens, making on-the-go triage impossible.", channel: "APP_STORE_REVIEW", customerLabel: "Product Manager", sentiment: "NEGATIVE", sentimentScore: -0.6, status: "REVIEWED", featureArea: "Mobile UX", themeName: "Mobile UX & Responsive Layout" },
  ];

  for (let i = 0; i < 75; i++) {
    const template = analystRawFeedback[i % analystRawFeedback.length];
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - (i % 35));
    const fb = await prisma.feedback.create({
      data: {
        content: `${template.content}${i >= 5 ? ` (Analyst note session #${3000 + i})` : ""}`,
        channel: template.channel,
        sourceRef: `ANL-${3000 + i}`,
        customerLabel: template.customerLabel,
        sentiment: template.sentiment,
        sentimentScore: template.sentimentScore,
        status: template.status as string,
        featureArea: template.featureArea,
        rationale: `AI product classification engine.`,
        createdAt: createdDate,
        workspaceId: analystWorkspace.id,
      },
    });
    const themeId = analystCreatedThemes[template.themeName];
    if (themeId) {
      await prisma.feedbackTheme.create({ data: { feedbackId: fb.id, themeId, confidence: 0.92 } });
    }
    const keywords = fb.content.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    await prisma.embedding.create({ data: { feedbackId: fb.id, vectorJson: JSON.stringify(keywords) } });
  }

  await prisma.report.create({
    data: {
      id: "demo-voc-analyst",
      title: "Product Feature & UX Sentiment Analysis Report",
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(),
      contentJson: JSON.stringify({
        summary: "Analyst trends indicate positive reception of CSV export functionality, but user friction remains in team setup onboarding and mobile tap responsiveness.",
        metrics: { totalItems: 75, negativeRatio: 0.40, positiveRatio: 0.48, neutralRatio: 0.12, topSpikeTheme: "Guided Onboarding & Setup", spikePercentage: "+45% WoW" },
        quotes: ["Love the new export feature! Saved me an hour today.", "Dashboard charts take 8 to 10 seconds to render when filtering."],
        recommendations: ["Streamline initial workspace team invite steps.", "Add UTF-8 BOM header to CSV export output for Excel compatibility.", "Optimize Recharts rendering cycle on 90-day filter."],
      }),
      workspaceId: analystWorkspace.id,
      generatedById: analystUser.id,
    },
  });

  console.log(`✅ Seeded Analyst Workspace: ${analystWorkspace.name}`);

  // ==========================================
  // 3. VIEWER WORKSPACE: Acme Customer Insights [Viewer]
  // ==========================================
  const viewerWorkspace = await prisma.workspace.create({
    data: {
      id: "demo-workspace-viewer",
      name: "Acme Customer Insights [Viewer]",
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      id: "user-viewer-1",
      name: "David Kim (Viewer)",
      email: "viewer@acme.com",
      passwordHash,
      role: "VIEWER",
      workspaceId: viewerWorkspace.id,
    },
  });

  await prisma.user.create({
    data: {
      id: "user-viewer-2",
      name: "Olivia Chen (Executive Director)",
      email: "exec-director@acme.com",
      passwordHash,
      role: "VIEWER",
      workspaceId: viewerWorkspace.id,
    },
  });

  await prisma.user.create({
    data: {
      id: "user-viewer-3",
      name: "Robert Sterling (VP Customer Success)",
      email: "cs-vp@acme.com",
      passwordHash,
      role: "ADMIN",
      workspaceId: viewerWorkspace.id,
    },
  });

  const viewerThemes = [
    { id: "theme-viewer-nps", name: "NPS & Customer Satisfaction", description: "Net Promoter Score feedback, promoter quotes, and detractor analysis.", color: "#10B981" },
    { id: "theme-viewer-reviews", name: "App Store & Public Ratings", description: "iOS & Android app store star reviews, public testimonials, and app ratings.", color: "#F59E0B" },
    { id: "theme-viewer-sentiment", name: "Executive Brand Sentiment", description: "Executive sentiment tracking across enterprise customer accounts.", color: "#6366F1" },
    { id: "theme-viewer-community", name: "Community & Advisory Panel", description: "Customer advisory council requests and community board discussions.", color: "#06B6D4" },
  ];

  const viewerCreatedThemes: Record<string, string> = {};
  for (const t of viewerThemes) {
    const theme = await prisma.theme.create({
      data: { ...t, workspaceId: viewerWorkspace.id },
    });
    viewerCreatedThemes[t.name] = theme.id;
  }

  const viewerRawFeedback = [
    { content: "Super easy onboarding experience! We were up and running in under 5 minutes.", channel: "NPS_SURVEY", customerLabel: "Promoter User", sentiment: "POSITIVE", sentimentScore: 0.9, status: "ACTIONED", featureArea: "Customer Satisfaction", themeName: "NPS & Customer Satisfaction" },
    { content: "Clear pricing structure and automated invoicing saves our finance team hours.", channel: "NPS_SURVEY", customerLabel: "Enterprise Director", sentiment: "POSITIVE", sentimentScore: 0.75, status: "ACTIONED", featureArea: "Customer Satisfaction", themeName: "NPS & Customer Satisfaction" },
    { content: "The latest platform update significantly boosted page load speeds. Feels lightning fast!", channel: "APP_STORE_REVIEW", customerLabel: "Pro User", sentiment: "POSITIVE", sentimentScore: 0.95, status: "ACTIONED", featureArea: "Public Reviews", themeName: "App Store & Public Ratings" },
    { content: "It does the job, but the mobile experience needs significant work on iOS Safari.", channel: "NPS_SURVEY", customerLabel: "Detractor User", sentiment: "NEUTRAL", sentimentScore: -0.2, status: "NEW", featureArea: "Public Reviews", themeName: "App Store & Public Ratings" },
    { content: "User registration requires too many verification steps before getting to main dashboard.", channel: "COMMUNITY_POST", customerLabel: "Community Member", sentiment: "NEGATIVE", sentimentScore: -0.4, status: "NEW", featureArea: "Community", themeName: "Community & Advisory Panel" },
  ];

  for (let i = 0; i < 50; i++) {
    const template = viewerRawFeedback[i % viewerRawFeedback.length];
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - (i % 25));
    const fb = await prisma.feedback.create({
      data: {
        content: `${template.content}${i >= 5 ? ` (Executive survey entry #${4000 + i})` : ""}`,
        channel: template.channel,
        sourceRef: `VIE-${4000 + i}`,
        customerLabel: template.customerLabel,
        sentiment: template.sentiment,
        sentimentScore: template.sentimentScore,
        status: template.status as string,
        featureArea: template.featureArea,
        rationale: `Executive VoC sentiment index.`,
        createdAt: createdDate,
        workspaceId: viewerWorkspace.id,
      },
    });
    const themeId = viewerCreatedThemes[template.themeName];
    if (themeId) {
      await prisma.feedbackTheme.create({ data: { feedbackId: fb.id, themeId, confidence: 0.95 } });
    }
    const keywords = fb.content.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    await prisma.embedding.create({ data: { feedbackId: fb.id, vectorJson: JSON.stringify(keywords) } });
  }

  await prisma.report.create({
    data: {
      id: "demo-voc-viewer",
      title: "Executive Voice of Customer Digest (July 2026)",
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(),
      contentJson: JSON.stringify({
        summary: "Executive sentiment shows overall positive customer satisfaction (60% positive score) driven by speed improvements and clear pricing, with minor detractor notes on mobile web usability.",
        metrics: { totalItems: 50, negativeRatio: 0.20, positiveRatio: 0.60, neutralRatio: 0.20, topSpikeTheme: "NPS & Customer Satisfaction", spikePercentage: "+30% WoW" },
        quotes: ["Super easy onboarding experience! We were up in 5 minutes.", "Latest platform update significantly boosted page load speeds."],
        recommendations: ["Maintain current performance optimization roadmap.", "Review iOS Safari mobile web layout.", "Publish customer satisfaction win stories to sales teams."],
      }),
      workspaceId: viewerWorkspace.id,
      generatedById: viewerUser.id,
    },
  });

  console.log(`✅ Seeded Viewer Workspace: ${viewerWorkspace.name}`);
  console.log("🎉 Database multi-workspace seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
