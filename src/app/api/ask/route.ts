import { NextResponse } from "next/server";
import { requireAuthGuard } from "@/lib/auth";
import { searchFeedbackSemantic } from "@/lib/search";
import { askLoopQuestion } from "@/lib/ai";

export async function POST(req: Request) {
  const { user, error } = await requireAuthGuard();
  if (error) return error;

  try {
    const body = await req.json();
    const { question } = body;

    if (!question || typeof question !== "string" || question.trim() === "") {
      return NextResponse.json({ error: "Question string is required." }, { status: 400 });
    }

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Retrieve top-K relevant feedback items scoped strictly to user workspaceId
    const contextItems = await searchFeedbackSemantic(user.workspaceId, question, 6);

    // Call grounded AI Q&A
    const result = await askLoopQuestion(
      question.trim(),
      contextItems.map((c) => ({
        id: c.id,
        content: c.content,
        channel: c.channel,
        sentiment: c.sentiment,
      }))
    );

    return NextResponse.json({
      answer: result.answer,
      citations: contextItems,
    });
  } catch (err: unknown) {
    console.error("Ask LOOP API error:", err);
    return NextResponse.json({ error: "Failed to answer question." }, { status: 500 });
  }
}
