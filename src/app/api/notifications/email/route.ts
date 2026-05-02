import { NextRequest, NextResponse } from "next/server";
import { emailTemplates } from "@/lib/email/templates";
import crypto from "crypto";

// Simple password hashing using SHA256
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, to, data } = body;

    if (!type || !to) {
      return NextResponse.json({ error: "Missing type or to" }, { status: 400 });
    }

    const templates = emailTemplates();
    let emailData: { subject: string; html: string } | null = null;

    switch (type) {
      case "fileExpiring": {
        if (!data?.fileName || !data?.daysLeft) {
          return NextResponse.json({ error: "Missing fileName or daysLeft" }, { status: 400 });
        }
        emailData = templates.fileExpiringSoon({
          fileName: data.fileName,
          daysLeft: data.daysLeft,
          downloadUrl: data.downloadUrl || "https://fii.one/files",
          ownerName: data.ownerName || "User",
        });
        break;
      }
      case "storageFull": {
        if (!data?.usagePercent || !data?.usedGb || !data?.totalGb) {
          return NextResponse.json({ error: "Missing storage data" }, { status: 400 });
        }
        emailData = templates.storageAlmostFull({
          usagePercent: data.usagePercent,
          usedGb: data.usedGb,
          totalGb: data.totalGb,
          planName: data.planName || "Free",
        });
        break;
      }
      case "accountSuspended": {
        if (!data?.reason) {
          return NextResponse.json({ error: "Missing reason" }, { status: 400 });
        }
        emailData = templates.accountSuspended({
          reason: data.reason,
          ownerName: data.ownerName || "User",
          supportEmail: data.supportEmail || "support@fii.one",
        });
        break;
      }
      case "accountBanned": {
        if (!data?.reason) {
          return NextResponse.json({ error: "Missing reason" }, { status: 400 });
        }
        emailData = templates.accountBanned({
          reason: data.reason,
          ownerName: data.ownerName || "User",
          supportEmail: data.supportEmail || "support@fii.one",
        });
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown email type" }, { status: 400 });
    }

    // Send via Resend (or any SMTP provider)
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.warn("[Email] RESEND_API_KEY not set — logging email instead of sending");
      console.log("[Email] To:", to);
      console.log("[Email] Subject:", emailData.subject);
      console.log("[Email] Preview length:", emailData.html.length, "chars");
      return NextResponse.json({
        success: true,
        mode: "log",
        message: "Email API key not configured. Email content logged to console.",
        preview: { to, subject: emailData.subject },
      });
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "fii.one <noreply@fii.one>",
        to,
        subject: emailData.subject,
        html: emailData.html,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      console.error("[Email] Resend API error:", err);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    const result = await resendRes.json();
    return NextResponse.json({ success: true, messageId: result.id });
  } catch (error) {
    console.error("[Email] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}