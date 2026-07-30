import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthGuard } from "@/lib/auth";
import { classifyFeedback } from "@/lib/ai";

const SIMULATED_CHANNEL_DATA: Record<string, { channel: string; items: Array<{ content: string; label: string; refPrefix: string }> }> = {
  zendesk: {
    channel: "SUPPORT_TICKET",
    items: [
      { content: "Customer cannot reset 2FA password on login page. Button spins indefinitely.", label: "Enterprise Admin - Bank Corp", refPrefix: "ZD" },
      { content: "We are getting HTTP 504 errors on API endpoint /v1/ingest during peak morning hours.", label: "DevOps Engineer", refPrefix: "ZD" },
      { content: "Requesting dark mode theme support for the main analytics dashboard.", label: "Pro Plan User", refPrefix: "ZD" },
      { content: "Billing invoice PDF is missing VAT registration number for European compliance.", label: "Finance Manager", refPrefix: "ZD" },
      { content: "CSV export times out when downloading datasets with over 10,000 rows.", label: "Data Analyst", refPrefix: "ZD" },
    ],
  },
  appstore: {
    channel: "APP_STORE_REVIEW",
    items: [
      { content: "The newest mobile UI update is fast and sleek! Loving the instant sentiment filter.", label: "App Store User 5★", refPrefix: "AS" },
      { content: "App crashes when attempting to rotate device to landscape mode on iPad Pro.", label: "iPad User 2★", refPrefix: "AS" },
      { content: "Solid feedback tool, but push notifications for urgent negative spikes are missing.", label: "Product Manager 4★", refPrefix: "AS" },
      { content: "Font size is far too tiny on smaller iPhone screens. Hard to read during commute.", label: "Mobile Tester 3★", refPrefix: "AS" },
      { content: "Fantastic AI summary features! Grounded answers in Ask LOOP save our team hours.", label: "Founding Engineer 5★", refPrefix: "AS" },
    ],
  },
  surveymonkey: {
    channel: "NPS_SURVEY",
    items: [
      { content: "10/10 - LOOP turned our messy customer feedback spreadsheets into clear prioritized product actions.", label: "NPS Promoter (Score 10)", refPrefix: "NPS" },
      { content: "7/10 - Product is great overall, but missing SAML single sign-on support for Okta.", label: "NPS Passive (Score 7)", refPrefix: "NPS" },
      { content: "4/10 - Onboarding process was confusing. Needed support intervention to invite 15 members.", label: "NPS Detractor (Score 4)", refPrefix: "NPS" },
      { content: "9/10 - Very intuitive dashboard metrics and theme spike alerts.", label: "NPS Promoter (Score 9)", refPrefix: "NPS" },
      { content: "5/10 - Needs better integration connectors for Jira and Slack notifications.", label: "NPS Passive (Score 5)", refPrefix: "NPS" },
    ],
  },
  hubspot: {
    channel: "SALES_NOTE",
    items: [
      { content: "Prospect (ACME Corp, $80k ARR) will sign contract if we deliver SSO Okta integration by Q3.", label: "Senior AE - Sales Call", refPrefix: "HS" },
      { content: "Lead asked if data is isolated per tenant workspace and compliant with SOC2.", label: "Solutions Architect Note", refPrefix: "HS" },
      { content: "Client requested custom branding options for exported Voice of Customer PDF reports.", label: "Account Manager Update", refPrefix: "HS" },
      { content: "Prospect loved the live demo of Ask LOOP grounded Q&A! Highlighted it as key differentiator.", label: "Sales Presales Notes", refPrefix: "HS" },
      { content: "Competitor comparison: Client switching from Dovetail due to LOOP's faster AI classification.", label: "VP Sales Note", refPrefix: "HS" },
    ],
  },
};

export async function POST(req: Request) {
  const { user, error } = await requireAuthGuard(["ADMIN", "ANALYST"]);
  if (error) return error;

  try {
    const body = await req.json().catch(() => ({}));
    const channelKey = (body.source || "zendesk").toLowerCase();
    const sourceConfig = SIMULATED_CHANNEL_DATA[channelKey] || SIMULATED_CHANNEL_DATA.zendesk;

    const existingThemes = await prisma.theme.findMany({
      where: { workspaceId: user.workspaceId },
      select: { id: true, name: true },
    });

    const themeMap: Record<string, string> = {};
    existingThemes.forEach((t: any) => (themeMap[t.name.toLowerCase()] = t.id));

    const createdItems = [];

    for (let i = 0; i < sourceConfig.items.length; i++) {
      const template = sourceConfig.items[i];
      const classification = await classifyFeedback(template.content, Object.keys(themeMap));

      let themeId = themeMap[classification.themeName.toLowerCase()];
      if (!themeId) {
        const colors = ["#6366F1", "#EF4444", "#F59E0B", "#10B981", "#8B5CF6", "#06B6D4"];
        const newTheme = await prisma.theme.create({
          data: {
            name: classification.themeName,
            description: `Auto-created theme from ${sourceConfig.channel} integration.`,
            color: colors[Math.floor(Math.random() * colors.length)],
            workspaceId: user.workspaceId,
          },
        });
        themeId = newTheme.id;
        themeMap[classification.themeName.toLowerCase()] = newTheme.id;
      }

      const feedback = await prisma.feedback.create({
        data: {
          content: template.content,
          channel: sourceConfig.channel,
          sourceRef: `${template.refPrefix}-${Math.floor(1000 + Math.random() * 9000)}`,
          customerLabel: template.label,
          sentiment: classification.sentiment,
          sentimentScore: classification.sentimentScore,
          status: "NEW",
          featureArea: classification.featureArea,
          rationale: classification.rationale,
          workspaceId: user.workspaceId,
        },
      });

      await prisma.feedbackTheme.create({
        data: {
          feedbackId: feedback.id,
          themeId,
          confidence: 0.94,
        },
      });

      const keywords = template.content.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
      await prisma.embedding.create({
        data: {
          feedbackId: feedback.id,
          vectorJson: JSON.stringify(keywords),
        },
      });

      createdItems.push(feedback);
    }

    return NextResponse.json({
      success: true,
      count: createdItems.length,
      channel: sourceConfig.channel,
      items: createdItems,
    });
  } catch (err: any) {
    console.error("Simulated channel ingestion error:", err);
    return NextResponse.json({ error: "Failed to simulate channel ingestion." }, { status: 500 });
  }
}
