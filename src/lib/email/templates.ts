import { NextRequest, NextResponse } from "next/server";

// Email templates
export function emailTemplates() {
  return {
    // File expiring soon (7 days)
    fileExpiringSoon: (data: { fileName: string; daysLeft: number; downloadUrl: string; ownerName: string }) => ({
      subject: `⚠️ Your file "${data.fileName}" will expire in ${data.daysLeft} days`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #e0e0e0; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #16213e; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a4a;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; color: white;">⚠️ File Expiring Soon</h1>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; line-height: 1.6;">Hi ${data.ownerName},</p>
      <p style="font-size: 16px; line-height: 1.6;">Your file <strong style="color: #f472b6;">"${data.fileName}"</strong> will expire in <strong style="color: #f472b6;">${data.daysLeft} days</strong>.</p>
      <p style="font-size: 16px; line-height: 1.6; color: #9ca3af;">After expiration, the file will be permanently deleted and cannot be recovered.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.downloadUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px;">Download / Extend</a>
      </div>
      <p style="font-size: 13px; color: #6b7280; text-align: center;">MediaVault Cloud Storage</p>
    </div>
  </div>
</body>
</html>`,
    }),

    // Storage almost full (80% quota)
    storageAlmostFull: (data: { usagePercent: number; usedGb: string; totalGb: string; planName: string }) => ({
      subject: `📦 Storage at ${data.usagePercent}% - ${data.planName} Plan`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #e0e0e0; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #16213e; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a4a;">
    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 32px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; color: white;">📦 Storage Almost Full</h1>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; line-height: 1.6;">Hi there,</p>
      <p style="font-size: 16px; line-height: 1.6;">Your storage is at <strong style="color: #f472b6;">${data.usagePercent}%</strong> capacity.</p>
      <div style="background: #0f1629; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #9ca3af;">Used</span>
          <span style="color: #f472b6; font-weight: 600;">${data.usedGb} / ${data.totalGb} GB</span>
        </div>
        <div style="background: #1e2a45; border-radius: 8px; height: 12px; overflow: hidden;">
          <div style="background: linear-gradient(90deg, #f093fb, #f5576c); height: 100%; width: ${data.usagePercent}%; border-radius: 8px;"></div>
        </div>
      </div>
      <p style="font-size: 15px; color: #9ca3af;">Consider upgrading your plan or removing unused files to free up space.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="#" style="display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px;">Upgrade Plan</a>
      </div>
      <p style="font-size: 13px; color: #6b7280; text-align: center;">MediaVault Cloud Storage</p>
    </div>
  </div>
</body>
</html>`,
    }),

    // Account suspended
    accountSuspended: (data: { reason: string; ownerName: string; supportEmail: string }) => ({
      subject: `🔒 Your MediaVault Account Has Been Suspended`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #e0e0e0; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #16213e; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a4a;">
    <div style="background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); padding: 32px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; color: white;">🔒 Account Suspended</h1>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; line-height: 1.6;">Dear ${data.ownerName},</p>
      <p style="font-size: 16px; line-height: 1.6;">Your MediaVault account has been <strong style="color: #f97316;">suspended</strong>.</p>
      <p style="font-size: 16px; line-height: 1.6; background: #0f1629; border-left: 4px solid #f97316; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <strong>Reason:</strong> ${data.reason}
      </p>
      <p style="font-size: 15px; color: #9ca3af;">If you believe this is a mistake, please contact our support team.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="mailto:${data.supportEmail}" style="display: inline-block; background: #f97316; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px;">Contact Support</a>
      </div>
      <p style="font-size: 13px; color: #6b7280; text-align: center;">MediaVault Cloud Storage</p>
    </div>
  </div>
</body>
</html>`,
    }),

    // Account banned
    accountBanned: (data: { reason: string; ownerName: string; supportEmail: string }) => ({
      subject: `🚫 Your MediaVault Account Has Been Banned`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #e0e0e0; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #16213e; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a4a;">
    <div style="background: #991b1b; padding: 32px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; color: white;">🚫 Account Banned</h1>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; line-height: 1.6;">Dear ${data.ownerName},</p>
      <p style="font-size: 16px; line-height: 1.6;">Your MediaVault account has been <strong style="color: #ef4444;">permanently banned</strong> and all data has been removed.</p>
      <p style="font-size: 16px; line-height: 1.6; background: #0f1629; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <strong>Reason:</strong> ${data.reason}
      </p>
      <p style="font-size: 15px; color: #9ca3af;">If you believe this is an error, you may contact our appeals team.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="mailto:${data.supportEmail}" style="display: inline-block; background: #991b1b; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px;">Appeal Decision</a>
      </div>
      <p style="font-size: 13px; color: #6b7280; text-align: center;">MediaVault Cloud Storage</p>
    </div>
  </div>
</body>
</html>`,
    }),
  };
}

export type EmailType = "fileExpiring" | "storageFull" | "accountSuspended" | "accountBanned";