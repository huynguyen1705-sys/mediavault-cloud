import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getOrCreateUser } from "@/lib/get-user";
import { processChat } from "@/lib/ai-chat";

/**
 * POST /api/ai/chat — send a message, get AI response
 * Body: { message: string, conversationId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getOrCreateUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message, conversationId } = await request.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    let convoId = conversationId;

    // Create or get conversation
    if (!convoId) {
      const convo = await prisma.aiConversation.create({
        data: {
          userId: user.id,
          title: message.slice(0, 100),
        },
      });
      convoId = convo.id;
    } else {
      // Verify ownership
      const convo = await prisma.aiConversation.findFirst({
        where: { id: convoId, userId: user.id },
      });
      if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Save user message
    await prisma.aiMessage.create({
      data: {
        conversationId: convoId,
        role: "user",
        content: message,
      },
    });

    // Get conversation history
    const history = await prisma.aiMessage.findMany({
      where: { conversationId: convoId },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { role: true, content: true },
    });

    // Process with AI
    const result = await processChat(user.id, message, history);

    // Save assistant message
    await prisma.aiMessage.create({
      data: {
        conversationId: convoId,
        role: "assistant",
        content: result.reply,
        fileRefs: result.files.length > 0 ? (result.files as any) : undefined,
      },
    });

    // Update conversation title if it's the first message
    if (history.length <= 1) {
      await prisma.aiConversation.update({
        where: { id: convoId },
        data: { title: message.slice(0, 100) },
      });
    }

    return NextResponse.json({
      conversationId: convoId,
      reply: result.reply,
      files: result.files,
      action: result.action || null,
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
