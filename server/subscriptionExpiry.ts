import { db } from "./db";
import {
  ownerSubscriptions,
  subscriptionPlans,
  properties,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { storage } from "./storage";
import { broadcastToUser } from "./routes";
import { createNotification } from "./services/notificationService";

// ─────────────────────────────────────────────────────────────────────────────
// Email helpers
// ─────────────────────────────────────────────────────────────────────────────

async function sendExpiryWarningEmail(
  email: string,
  firstName: string,
  planName: string,
  daysLeft: number,
  endDate: Date,
): Promise<void> {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "ZECOHO <onboarding@resend.dev>";
    const endDateStr = endDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const isExpiring = daysLeft === 0;

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: isExpiring
        ? `⚠️ Your ZECOHO ${planName} subscription expires TODAY`
        : `⚠️ Your ZECOHO ${planName} subscription expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${isExpiring ? "#dc2626" : "#f59e0b"}; padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">ZECOHO</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0;">
              Subscription ${isExpiring ? "Expiring Today" : "Expiry Notice"}
            </p>
          </div>
          <div style="background: #fff; border: 1px solid #e0e0e0; border-top: none; padding: 28px; border-radius: 0 0 8px 8px;">
            <p style="color: #333;">Dear <strong>${firstName}</strong>,</p>
            ${
              isExpiring
                ? `<p style="color: #dc2626; font-weight: bold;">Your <strong>${planName}</strong> subscription expires <u>TODAY</u> (${endDateStr}).</p>
                   <p style="color: #555;">Renew now to keep your properties visible and continue receiving bookings.</p>`
                : `<p style="color: #555;">Your <strong>${planName}</strong> subscription will expire on <strong>${endDateStr}</strong> (${daysLeft} day${daysLeft === 1 ? "" : "s"} from now).</p>
                   <p style="color: #555;">Please renew your subscription before it expires to avoid any disruption.</p>`
            }
            <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="color: #92400e; margin: 0; font-weight: 500;">What happens when your subscription expires:</p>
              <ul style="color: #a16207; margin: 8px 0 0; padding-left: 20px; font-size: 14px;">
                <li>Your properties will be hidden from search results</li>
                <li>No new bookings will be accepted</li>
                <li>Existing confirmed bookings will continue as normal</li>
              </ul>
            </div>
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://www.zecoho.com/owner/subscription"
                 style="background: #E67E22; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                Renew Subscription Now
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
            <p style="color: #aaa; font-size: 11px; text-align: center;">
              ZECOHO TECHNOLOGIES PRIVATE LIMITED | GSTIN: 09AACCZ8890L1ZC
            </p>
          </div>
        </div>
      `,
    });
    console.log(
      `[EXPIRY] Warning email sent to ${email} (${daysLeft} days left)`,
    );
  } catch (error) {
    console.error("[EXPIRY] Failed to send warning email:", error);
  }
}

async function sendExpiredEmail(
  email: string,
  firstName: string,
  planName: string,
): Promise<void> {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "ZECOHO <onboarding@resend.dev>";

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Your ZECOHO subscription has expired — properties paused`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc2626; padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">ZECOHO</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0;">Subscription Expired</p>
          </div>
          <div style="background: #fff; border: 1px solid #e0e0e0; border-top: none; padding: 28px; border-radius: 0 0 8px 8px;">
            <p style="color: #333;">Dear <strong>${firstName}</strong>,</p>
            <p style="color: #dc2626; font-weight: bold;">
              Your <strong>${planName}</strong> subscription has expired.
            </p>
            <p style="color: #555;">
              Your properties have been temporarily hidden from search results and new bookings have been paused.
              All existing confirmed bookings will continue as normal.
            </p>
            <div style="background: #fee2e2; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <p style="color: #991b1b; margin: 0; font-weight: 500;">To restore your listings immediately:</p>
              <ul style="color: #b91c1c; margin: 8px 0 0; padding-left: 20px; font-size: 14px;">
                <li>Renew your subscription from the Owner Portal</li>
                <li>Your properties will be made live again automatically</li>
              </ul>
            </div>
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://www.zecoho.com/owner/subscription"
                 style="background: #dc2626; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                Renew Now
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
            <p style="color: #aaa; font-size: 11px; text-align: center;">
              ZECOHO TECHNOLOGIES PRIVATE LIMITED | GSTIN: 09AACCZ8890L1ZC
            </p>
          </div>
        </div>
      `,
    });
    console.log(`[EXPIRY] Expiry confirmation email sent to ${email}`);
  } catch (error) {
    console.error("[EXPIRY] Failed to send expired email:", error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SMS stub — activate when SMS package is ready
// ─────────────────────────────────────────────────────────────────────────────
// async function sendExpirySms(phone: string, firstName: string, planName: string, daysLeft: number): Promise<void> {
//   // TODO: Integrate SMS provider (e.g. Twilio, MSG91, Exotel) when package is activated
//   // const message = daysLeft === 0
//   //   ? `[ZECOHO] Hi ${firstName}, your ${planName} subscription expires TODAY. Renew at zecoho.com/owner/subscription`
//   //   : `[ZECOHO] Hi ${firstName}, your ${planName} subscription expires in ${daysLeft} day(s). Renew at zecoho.com/owner/subscription`;
//   // await smsClient.send({ to: phone, message });
//   console.log(`[SMS-STUB] Would send SMS to ${phone}: ${daysLeft}d warning`);
// }

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp stub — activate when WhatsApp Business API is ready
// ─────────────────────────────────────────────────────────────────────────────
// async function sendExpiryWhatsApp(phone: string, firstName: string, planName: string, daysLeft: number): Promise<void> {
//   // TODO: Integrate WhatsApp Business API (e.g. Interakt, Wati, Meta Cloud API) when package is activated
//   // Use a pre-approved template, e.g.:
//   //   Template: "subscription_expiry_warning"
//   //   Params:   [firstName, planName, daysLeft, "zecoho.com/owner/subscription"]
//   console.log(`[WA-STUB] Would send WhatsApp to ${phone}: ${daysLeft}d warning`);
// }

// ─────────────────────────────────────────────────────────────────────────────
// Main expiry check — runs daily at 9 AM IST via cron in app.ts
// ─────────────────────────────────────────────────────────────────────────────
export async function checkSubscriptionExpiry(): Promise<void> {
  console.log("[EXPIRY] Running subscription expiry check...");

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  try {
    // Join subscriptions with plans to get the real plan name
    const activeSubs = await db
      .select({
        id: ownerSubscriptions.id,
        ownerId: ownerSubscriptions.ownerId,
        planId: ownerSubscriptions.planId,
        tier: ownerSubscriptions.tier,
        status: ownerSubscriptions.status,
        endDate: ownerSubscriptions.endDate,
        startDate: ownerSubscriptions.startDate,
        planName: subscriptionPlans.name,
      })
      .from(ownerSubscriptions)
      .leftJoin(
        subscriptionPlans,
        eq(ownerSubscriptions.planId, subscriptionPlans.id),
      )
      .where(eq(ownerSubscriptions.status, "active"));

    for (const sub of activeSubs) {
      if (!sub.endDate) continue;

      const endDate = new Date(sub.endDate);
      endDate.setHours(23, 59, 59, 999);

      const daysLeft = Math.ceil(
        (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      const owner = await storage.getUser(sub.ownerId);
      if (!owner) continue;

      const planName = sub.planName || "Subscription";

      // ── EXPIRED — mark expired and hide properties ───────────────────
      if (daysLeft < 0) {
        console.log(
          `[EXPIRY] Subscription expired for ${owner.email} — hiding properties`,
        );

        await db
          .update(ownerSubscriptions)
          .set({ status: "expired" })
          .where(eq(ownerSubscriptions.id, sub.id));

        // Pause all published properties
        const ownerProps = await storage.getProperties({
          ownerId: sub.ownerId,
          includeAllStatuses: true,
        });
        for (const property of ownerProps) {
          if (property.status === "published") {
            await storage.updateProperty(property.id, { status: "paused" });
            console.log(`[EXPIRY] Property "${property.title}" paused`);
          }
        }

        // In-app WebSocket + notification bell
        broadcastToUser(sub.ownerId, {
          type: "subscription_expired",
          message:
            "Your subscription has expired. Your properties have been paused. Please renew to go live again.",
        });
        await createNotification({
          userId: sub.ownerId,
          title: "Subscription Expired",
          body: "Your subscription has expired. Your properties are now paused. Renew now to continue receiving bookings.",
          type: "subscription_expired",
          entityId: sub.id,
          entityType: "subscription",
        });

        // Push notification (works when owner is offline / tab closed)
        try {
          const { sendPushNotification } = await import("./services/pushService");
          await sendPushNotification(sub.ownerId, {
            title: "Subscription Expired",
            body: `Your ${planName} plan has expired. Properties paused — renew now.`,
            tag: `sub-expired-${sub.id}`,
            data: { url: "/owner/subscription" },
            urgency: "high",
            requireInteraction: true,
          });
        } catch {}

        // Email
        if (owner.email) {
          await sendExpiredEmail(
            owner.email,
            owner.firstName || "Property Owner",
            planName,
          );
        }

        // SMS stub (uncomment when SMS package activated)
        // if (owner.phone) await sendExpirySms(owner.phone, owner.firstName || "Owner", planName, -1);

        // WhatsApp stub (uncomment when WhatsApp package activated)
        // if (owner.phone) await sendExpiryWhatsApp(owner.phone, owner.firstName || "Owner", planName, -1);

        continue;
      }

      // ── 2-DAY WARNING ────────────────────────────────────────────────
      if (daysLeft === 2) {
        console.log(`[EXPIRY] 2-day warning for ${owner.email}`);

        if (owner.email) {
          await sendExpiryWarningEmail(
            owner.email,
            owner.firstName || "Property Owner",
            planName,
            2,
            endDate,
          );
        }

        await createNotification({
          userId: sub.ownerId,
          title: "Subscription Expiring Soon",
          body: `Your ${planName} subscription expires in 2 days. Renew now to keep your properties visible.`,
          type: "subscription_expiring",
          entityId: sub.id,
          entityType: "subscription",
        });
        broadcastToUser(sub.ownerId, {
          type: "subscription_expiring",
          daysLeft: 2,
          message: `Your ${planName} subscription expires in 2 days!`,
        });

        try {
          const { sendPushNotification } = await import("./services/pushService");
          await sendPushNotification(sub.ownerId, {
            title: "Subscription Expiring in 2 Days",
            body: `Your ${planName} plan expires in 2 days. Renew now to keep listings live.`,
            tag: `sub-expiring-2d-${sub.id}`,
            data: { url: "/owner/subscription" },
            urgency: "normal",
          });
        } catch {}

        // SMS stub (uncomment when SMS package activated)
        // if (owner.phone) await sendExpirySms(owner.phone, owner.firstName || "Owner", planName, 2);

        // WhatsApp stub (uncomment when WhatsApp package activated)
        // if (owner.phone) await sendExpiryWhatsApp(owner.phone, owner.firstName || "Owner", planName, 2);
      }

      // ── EXPIRY DAY WARNING ───────────────────────────────────────────
      if (daysLeft === 0) {
        console.log(`[EXPIRY] Expiry day warning for ${owner.email}`);

        if (owner.email) {
          await sendExpiryWarningEmail(
            owner.email,
            owner.firstName || "Property Owner",
            planName,
            0,
            endDate,
          );
        }

        await createNotification({
          userId: sub.ownerId,
          title: "Subscription Expires Today!",
          body: `Your ${planName} subscription expires today. Renew immediately to avoid your properties being paused.`,
          type: "subscription_expiring",
          entityId: sub.id,
          entityType: "subscription",
        });
        broadcastToUser(sub.ownerId, {
          type: "subscription_expiring",
          daysLeft: 0,
          message: `Your ${planName} subscription expires today! Please renew now.`,
        });

        try {
          const { sendPushNotification } = await import("./services/pushService");
          await sendPushNotification(sub.ownerId, {
            title: "Subscription Expires TODAY",
            body: `Your ${planName} plan expires today. Renew now to avoid disruption.`,
            tag: `sub-expiring-0d-${sub.id}`,
            data: { url: "/owner/subscription" },
            urgency: "high",
            requireInteraction: true,
          });
        } catch {}

        // SMS stub (uncomment when SMS package activated)
        // if (owner.phone) await sendExpirySms(owner.phone, owner.firstName || "Owner", planName, 0);

        // WhatsApp stub (uncomment when WhatsApp package activated)
        // if (owner.phone) await sendExpiryWhatsApp(owner.phone, owner.firstName || "Owner", planName, 0);
      }
    }

    console.log("[EXPIRY] Check complete");
  } catch (error) {
    console.error("[EXPIRY] Error during expiry check:", error);
  }
}
