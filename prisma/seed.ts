import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Project LOOP database seed...");

  // Clean existing data
  await prisma.embedding.deleteMany({});
  await prisma.feedbackTheme.deleteMany({});
  await prisma.feedback.deleteMany({});
  await prisma.theme.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.workspace.deleteMany({});

  // 1. Create Demo Workspace
  const workspace = await prisma.workspace.create({
    data: {
      id: "demo-workspace-acme",
      name: "Acme SaaS Technologies",
    },
  });

  console.log(`✅ Created Workspace: ${workspace.name} (${workspace.id})`);

  // 2. Create Password Hash
  const passwordHash = await bcrypt.hash("password123", 10);

  // 3. Create Demo Users (Admin, Analyst, Viewer)
  const admin = await prisma.user.create({
    data: {
      id: "user-admin-1",
      name: "Sarah Connor (Admin)",
      email: "admin@acme.com",
      passwordHash,
      role: "ADMIN",
      workspaceId: workspace.id,
    },
  });

  const analyst = await prisma.user.create({
    data: {
      id: "user-analyst-1",
      name: "Alex Rivera (Analyst)",
      email: "analyst@acme.com",
      passwordHash,
      role: "ANALYST",
      workspaceId: workspace.id,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      id: "user-viewer-1",
      name: "David Kim (Viewer)",
      email: "viewer@acme.com",
      passwordHash,
      role: "VIEWER",
      workspaceId: workspace.id,
    },
  });

  console.log(`✅ Created 3 demo users (Admin: ${admin.email}, Analyst: ${analyst.email}, Viewer: ${viewer.email})`);

  // 4. Create Core Themes
  const themesData = [
    {
      id: "theme-onboarding",
      name: "Onboarding & Setup",
      description: "First-time user onboarding, registration, team invites, and workspace setup.",
      color: "#6366F1", // Indigo
    },
    {
      id: "theme-billing",
      name: "Billing & Invoicing",
      description: "Payment processing, subscription tiers, receipt downloads, and billing settings.",
      color: "#EF4444", // Red
    },
    {
      id: "theme-performance",
      name: "Performance & Reliability",
      description: "Page load speeds, API latency, dashboard timeouts, and system availability.",
      color: "#F59E0B", // Amber
    },
    {
      id: "theme-mobile",
      name: "Mobile & Responsive UX",
      description: "Mobile browser experience, responsive layout bugs, and touch navigation.",
      color: "#10B981", // Emerald
    },
    {
      id: "theme-integrations",
      name: "Export & Integrations",
      description: "Data export formats, CSV downloads, webhooks, and third-party integrations.",
      color: "#8B5CF6", // Purple
    },
    {
      id: "theme-sso",
      name: "Enterprise & SSO Security",
      description: "SAML SSO, RBAC roles, audit logs, and enterprise compliance requirements.",
      color: "#06B6D4", // Cyan
    },
  ];

  const createdThemes: Record<string, string> = {};
  for (const t of themesData) {
    const theme = await prisma.theme.create({
      data: {
        ...t,
        workspaceId: workspace.id,
      },
    });
    createdThemes[t.name] = theme.id;
  }
  console.log(`✅ Created ${Object.keys(createdThemes).length} core themes.`);

  // 5. Build Seed Feedback Template Generator (125 items)
  const channels = ["SUPPORT_TICKET", "APP_STORE_REVIEW", "NPS_SURVEY", "SALES_NOTE", "COMMUNITY_POST"];
  const customerLabels = [
    "Enterprise - Acme Financial",
    "Pro Plan User",
    "Trial User",
    "Churn Risk Customer",
    "Free Tier User",
    "VP of Product",
    "Lead Engineer",
    "Customer Support Rep",
    "Product Manager",
  ];

  const seedRawFeedback: Array<{
    content: string;
    channel: string;
    customerLabel: string;
    sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
    sentimentScore: number;
    status: "NEW" | "REVIEWED" | "ACTIONED";
    featureArea: string;
    themeName: string;
    daysAgo: number;
  }> = [
    // Onboarding
    {
      content: "Onboarding took forever — I couldn't figure out how to invite my team members.",
      channel: "SUPPORT_TICKET",
      customerLabel: "Enterprise - Acme Financial",
      sentiment: "NEGATIVE",
      sentimentScore: -0.8,
      status: "NEW",
      featureArea: "Onboarding",
      themeName: "Onboarding & Setup",
      daysAgo: 2,
    },
    {
      content: "The initial walkthrough modal crashed twice during workspace creation on Chrome Linux.",
      channel: "SUPPORT_TICKET",
      customerLabel: "Pro Plan User",
      sentiment: "NEGATIVE",
      sentimentScore: -0.65,
      status: "REVIEWED",
      featureArea: "Onboarding",
      themeName: "Onboarding & Setup",
      daysAgo: 4,
    },
    {
      content: "Super easy onboarding experience! We were up and running in under 5 minutes.",
      channel: "NPS_SURVEY",
      customerLabel: "Trial User",
      sentiment: "POSITIVE",
      sentimentScore: 0.9,
      status: "ACTIONED",
      featureArea: "Onboarding",
      themeName: "Onboarding & Setup",
      daysAgo: 5,
    },
    {
      content: "User registration requires too many verification steps before getting to the main dashboard.",
      channel: "COMMUNITY_POST",
      customerLabel: "Free Tier User",
      sentiment: "NEGATIVE",
      sentimentScore: -0.4,
      status: "NEW",
      featureArea: "Onboarding",
      themeName: "Onboarding & Setup",
      daysAgo: 1,
    },
    {
      content: "Love the new guided setup checklist! Made onboarding our 20 analysts effortless.",
      channel: "APP_STORE_REVIEW",
      customerLabel: "VP of Product",
      sentiment: "POSITIVE",
      sentimentScore: 0.85,
      status: "REVIEWED",
      featureArea: "Onboarding",
      themeName: "Onboarding & Setup",
      daysAgo: 8,
    },

    // Billing
    {
      content: "Billing page keeps timing out when I try to download an PDF invoice.",
      channel: "SUPPORT_TICKET",
      customerLabel: "Enterprise - Acme Financial",
      sentiment: "NEGATIVE",
      sentimentScore: -0.85,
      status: "NEW",
      featureArea: "Billing",
      themeName: "Billing & Invoicing",
      daysAgo: 1,
    },
    {
      content: "We were charged twice for our seat add-ons this month. Please issue a refund ASAP.",
      channel: "SUPPORT_TICKET",
      customerLabel: "Pro Plan User",
      sentiment: "NEGATIVE",
      sentimentScore: -0.9,
      status: "NEW",
      featureArea: "Billing",
      themeName: "Billing & Invoicing",
      daysAgo: 3,
    },
    {
      content: "Clear pricing structure and automated invoicing saves our finance team hours.",
      channel: "NPS_SURVEY",
      customerLabel: "Lead Engineer",
      sentiment: "POSITIVE",
      sentimentScore: 0.75,
      status: "ACTIONED",
      featureArea: "Billing",
      themeName: "Billing & Invoicing",
      daysAgo: 12,
    },
    {
      content: "Can we get annual payment options with invoice billing rather than credit card auto-charge?",
      channel: "SALES_NOTE",
      customerLabel: "Enterprise - Acme Financial",
      sentiment: "NEUTRAL",
      sentimentScore: 0.0,
      status: "REVIEWED",
      featureArea: "Billing",
      themeName: "Billing & Invoicing",
      daysAgo: 7,
    },

    // Performance
    {
      content: "Dashboard charts take 8 to 10 seconds to render when filtering large date ranges.",
      channel: "SUPPORT_TICKET",
      customerLabel: "Churn Risk Customer",
      sentiment: "NEGATIVE",
      sentimentScore: -0.75,
      status: "NEW",
      featureArea: "Performance",
      themeName: "Performance & Reliability",
      daysAgo: 1,
    },
    {
      content: "The app experienced intermittent 504 gateway timeouts yesterday afternoon during peak hours.",
      channel: "COMMUNITY_POST",
      customerLabel: "Lead Engineer",
      sentiment: "NEGATIVE",
      sentimentScore: -0.8,
      status: "REVIEWED",
      featureArea: "Performance",
      themeName: "Performance & Reliability",
      daysAgo: 3,
    },
    {
      content: "The latest platform update significantly boosted page load speeds. Feels lightning fast!",
      channel: "APP_STORE_REVIEW",
      customerLabel: "Pro Plan User",
      sentiment: "POSITIVE",
      sentimentScore: 0.95,
      status: "ACTIONED",
      featureArea: "Performance",
      themeName: "Performance & Reliability",
      daysAgo: 6,
    },
    {
      content: "Search queries with more than 3 keywords fail to load results or timeout completely.",
      channel: "SUPPORT_TICKET",
      customerLabel: "Free Tier User",
      sentiment: "NEGATIVE",
      sentimentScore: -0.7,
      status: "NEW",
      featureArea: "Performance",
      themeName: "Performance & Reliability",
      daysAgo: 2,
    },

    // Mobile UX
    {
      content: "It does the job, but the mobile experience needs significant work. Text overlaps on iOS Safari.",
      channel: "NPS_SURVEY",
      customerLabel: "Trial User",
      sentiment: "NEUTRAL",
      sentimentScore: -0.2,
      status: "NEW",
      featureArea: "Mobile UX",
      themeName: "Mobile & Responsive UX",
      daysAgo: 2,
    },
    {
      content: "Buttons are too small to tap on mobile screens, making on-the-go triage impossible.",
      channel: "APP_STORE_REVIEW",
      customerLabel: "Product Manager",
      sentiment: "NEGATIVE",
      sentimentScore: -0.6,
      status: "REVIEWED",
      featureArea: "Mobile UX",
      themeName: "Mobile & Responsive UX",
      daysAgo: 5,
    },

    // Integrations & Export
    {
      content: "Love the new export feature! Saved me an hour today preparing our weekly slide deck.",
      channel: "COMMUNITY_POST",
      customerLabel: "VP of Product",
      sentiment: "POSITIVE",
      sentimentScore: 0.9,
      status: "ACTIONED",
      featureArea: "Integrations",
      themeName: "Export & Integrations",
      daysAgo: 3,
    },
    {
      content: "CSV export drops special UTF-8 characters in customer names when opened in Excel.",
      channel: "SUPPORT_TICKET",
      customerLabel: "Pro Plan User",
      sentiment: "NEGATIVE",
      sentimentScore: -0.5,
      status: "NEW",
      featureArea: "Integrations",
      themeName: "Export & Integrations",
      daysAgo: 4,
    },
    {
      content: "We urgently need a native Zendesk integration to automatically push resolved tickets into LOOP.",
      channel: "SALES_NOTE",
      customerLabel: "Enterprise - Acme Financial",
      sentiment: "NEUTRAL",
      sentimentScore: 0.1,
      status: "REVIEWED",
      featureArea: "Integrations",
      themeName: "Export & Integrations",
      daysAgo: 9,
    },

    // Enterprise & SSO
    {
      content: "Prospect insists on SAML Okta SSO before signing the $50k contract — 3rd time this month.",
      channel: "SALES_NOTE",
      customerLabel: "Enterprise - Acme Financial",
      sentiment: "NEGATIVE",
      sentimentScore: -0.7,
      status: "NEW",
      featureArea: "Security",
      themeName: "Enterprise & SSO Security",
      daysAgo: 1,
    },
    {
      content: "Role-based access control works great for separating Viewer and Analyst permissions.",
      channel: "NPS_SURVEY",
      customerLabel: "Lead Engineer",
      sentiment: "POSITIVE",
      sentimentScore: 0.8,
      status: "ACTIONED",
      featureArea: "Security",
      themeName: "Enterprise & SSO Security",
      daysAgo: 14,
    },
  ];

  // Expand into 125 items by generating realistic variations
  const fullSeedList = [];
  const baseCount = seedRawFeedback.length;

  for (let i = 0; i < 125; i++) {
    const template = seedRawFeedback[i % baseCount];
    const daysAgo = Math.floor(Math.random() * 45) + (i < 25 ? 1 : 3); // recent items spike in last 5 days
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - daysAgo);

    let content = template.content;
    if (i >= baseCount) {
      const suffixes = [
        ` (Reported again by ${template.customerLabel})`,
        ` Note from user session #${1000 + i}.`,
        ` Customer mentioned this in follow-up call.`,
        ` Priority request from team lead.`,
        ` Escalated via support queue.`,
      ];
      content += suffixes[i % suffixes.length];
    }

    fullSeedList.push({
      content,
      channel: template.channel,
      customerLabel: template.customerLabel,
      sentiment: template.sentiment,
      sentimentScore: template.sentimentScore,
      status: template.status,
      featureArea: template.featureArea,
      themeName: template.themeName,
      sourceRef: `${template.channel.substring(0, 3)}-${1000 + i}`,
      createdAt: createdDate,
    });
  }

  // Insert items & link theme join tables
  let count = 0;
  for (const item of fullSeedList) {
    const feedback = await prisma.feedback.create({
      data: {
        content: item.content,
        channel: item.channel,
        sourceRef: item.sourceRef,
        customerLabel: item.customerLabel,
        sentiment: item.sentiment,
        sentimentScore: item.sentimentScore,
        status: item.status,
        featureArea: item.featureArea,
        rationale: `AI auto-classified based on keywords related to ${item.themeName}.`,
        createdAt: item.createdAt,
        workspaceId: workspace.id,
      },
    });

    const themeId = createdThemes[item.themeName];
    if (themeId) {
      await prisma.feedbackTheme.create({
        data: {
          feedbackId: feedback.id,
          themeId: themeId,
          confidence: 0.92,
        },
      });
    }

    // Create simple keyword embedding representation
    const keywords = item.content.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    await prisma.embedding.create({
      data: {
        feedbackId: feedback.id,
        vectorJson: JSON.stringify(keywords),
      },
    });

    count++;
  }

  console.log(`✅ Seeded ${count} feedback items with embeddings and theme associations!`);

  // Create initial demo executive VoC Report
  const sampleReportData = {
    summary: "Customer sentiment over the past 30 days highlights strong satisfaction with platform speed and export features, but significant friction in team onboarding and billing invoicing timeouts.",
    metrics: {
      totalItems: count,
      negativeRatio: 0.42,
      positiveRatio: 0.45,
      neutralRatio: 0.13,
      topSpikeTheme: "Billing & Invoicing",
      spikePercentage: "+65% WoW",
    },
    quotes: [
      "Onboarding took forever — I couldn't figure out how to invite my team members.",
      "Billing page keeps timing out when I try to download an PDF invoice.",
      "Love the new export feature! Saved me an hour today.",
      "Prospect insists on SAML Okta SSO before signing the $50k contract.",
    ],
    recommendations: [
      "Fix billing invoice download endpoint timeouts immediately (P0).",
      "Simplify team member invitation flow during initial workspace onboarding.",
      "Prioritize SAML / Okta SSO integration to unblock Enterprise pipeline deals.",
      "Optimize mobile UI touch targets and iOS Safari responsive CSS.",
    ],
  };

  await prisma.report.create({
    data: {
      id: "demo-voc-report-1",
      title: "Monthly Voice of Customer Digest (July 2026)",
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(),
      contentJson: JSON.stringify(sampleReportData),
      workspaceId: workspace.id,
      generatedById: analyst.id,
    },
  });

  console.log("✅ Seeded demo VoC Report!");
  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
