import { Router } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { requireAdmin, getRequestUserId, AuthenticatedRequest } from "./adminAuth";

const router = Router();

/* PUBLIC — get plans */
router.get("/subscription-plans", async (req, res) => {
  try {
    const plans = await storage.getAllSubscriptionPlans(false);
    res.json(plans);
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    res.status(500).json({ error: "Failed to fetch subscription plans" });
  }
});

/* ADMIN — get all plans including inactive */
router.get("/admin/subscription-plans", isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const plans = await storage.getAllSubscriptionPlans(includeInactive);
    res.json(plans);
  } catch (error) {
    console.error("Error fetching admin subscription plans:", error);
    res.status(500).json({ error: "Failed to fetch subscription plans" });
  }
});

/* OWNER — get subscription status */
router.get("/owner/subscription-status/:ownerId", async (req, res) => {
  try {
    const status = await storage.checkOwnerSubscriptionStatus(
      req.params.ownerId,
    );
    res.json(status);
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    res.status(500).json({ error: "Failed to fetch subscription status" });
  }
});

/* OWNER — get plan features for authenticated owner */
router.get("/owner/plan-features", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const ownerId = getRequestUserId(req as AuthenticatedRequest);
    const features = await storage.getOwnerActivePlanFeatures(ownerId);
    res.json(features ?? {
      bookingManagementEnabled: false,
      analyticsEnabled: false,
      priorityPlacement: false,
      additionalFeatures: [],
      maxProperties: 0,
      maxPhotosPerProperty: 0,
    });
  } catch (error) {
    console.error("Error fetching plan features:", error);
    res.status(500).json({ error: "Failed to fetch plan features" });
  }
});

/* ADMIN — create plan */
/* ADMIN — create plan */
router.post("/admin/subscription-plans", isAuthenticated, requireAdmin, async (req, res) => {
  try {
    console.log("Create plan payload:", req.body);
    const body = {
      ...req.body,
      price: String(req.body.price),
      cutoffPrice: req.body.cutoffPrice
        ? String(req.body.cutoffPrice)
        : undefined,
      duration: req.body.duration ?? "monthly",
    };
    const plan = await storage.createSubscriptionPlan(body);
    res.json(plan);
  } catch (error) {
    console.error(
      "Create subscription plan error:",
      error instanceof Error ? error.message : String(error),
    );
    console.error("Stack:", error instanceof Error ? error.stack : "");
    res.status(500).json({ error: "Failed to create subscription plan" });
  }
});

/* ADMIN — update plan */
router.patch("/admin/subscription-plans/:id", isAuthenticated, requireAdmin, async (req, res) => {
  try {
    console.log("PATCH plan id:", req.params.id);
    console.log("PATCH body received:", JSON.stringify(req.body));
    const body = {
      ...req.body,
      price: req.body.price ? String(req.body.price) : undefined,
      cutoffPrice: req.body.cutoffPrice
        ? String(req.body.cutoffPrice)
        : undefined,
    };
    console.log("PATCH body to save:", JSON.stringify(body));
    const plan = await storage.updateSubscriptionPlan(req.params.id, body);
    console.log("PATCH result:", JSON.stringify(plan));
    res.json(plan);
  } catch (error) {
    console.error(
      "Update plan error:",
      error instanceof Error ? error.message : String(error),
    );
    res.status(500).json({ error: "Failed to update subscription plan" });
  }
});
/* ADMIN — list owner subscriptions */
router.get("/admin/owner-subscriptions", isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const subs = await storage.getAllOwnerSubscriptionsForAdmin();
    res.json(subs);
  } catch (error) {
    console.error("Error fetching owner subscriptions:", error);
    res.status(500).json({ error: "Failed to fetch owner subscriptions" });
  }
});
/* OWNER — request subscription */
router.post("/owner/subscribe", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const {
      planId,
      tier,
      duration,
      pricePaid,
      transactionId,
      screenshotUrl,
      paymentMethod,
    } = req.body;
    const ownerId = getRequestUserId(req as AuthenticatedRequest);

    // Block submission if no payment proof provided
    if (!transactionId || !transactionId.trim()) {
      return res.status(400).json({
        error: "Transaction ID is required. Please complete payment first.",
      });
    }
    if (!screenshotUrl) {
      return res.status(400).json({
        error:
          "Payment screenshot is required. Please upload proof of payment.",
      });
    }

    const sub = await storage.createOwnerSubscription({
      ownerId,
      planId,
      tier,
      duration,
      pricePaid: String(pricePaid),
      status: "pending_payment",
    });

    // Save payment proof linked to this subscription
    const { db } = await import("./db");
    const { subscriptionPayments } = await import("../shared/schema");
    await db.insert(subscriptionPayments).values({
      subscriptionId: sub.id,
      ownerId,
      transactionId: transactionId.trim(),
      screenshotUrl: screenshotUrl || null,
      paymentMethod: paymentMethod || "upi",
      amount: String(pricePaid),
      status: "pending",
    });

    res.json(sub);
  } catch (error) {
    console.error(
      "Subscribe error:",
      error instanceof Error ? error.message : String(error),
    );
    res.status(500).json({ error: "Failed to submit subscription" });
  }
});
/* ADMIN — delete plan */
router.delete("/admin/subscription-plans/:id", isAuthenticated, requireAdmin, async (req, res) => {
  try {
    await storage.deleteSubscriptionPlan(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete plan" });
  }
});
/* ADMIN — activate */
router.post("/admin/owner-subscriptions/:id/extend", isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const { days } = req.body;
    if (!days || isNaN(Number(days)) || Number(days) < 1) {
      return res.status(400).json({ error: "Valid number of days required" });
    }
    // Get all subscriptions and find this one
    const allSubs = await storage.getAllOwnerSubscriptions();
    const sub = allSubs.find((s: any) => s.id === req.params.id);
    if (!sub) return res.status(404).json({ error: "Subscription not found" });

    const currentEnd = sub.endDate ? new Date(sub.endDate) : new Date();
    const newEnd = new Date(currentEnd);
    newEnd.setDate(newEnd.getDate() + Number(days));

    const updated = await storage.updateOwnerSubscriptionDates(
      req.params.id,
      sub.startDate ? new Date(sub.startDate) : new Date(),
      newEnd,
    );

    const { broadcastToUser } = await import("./routes");
    broadcastToUser((sub as any).ownerId, {
      type: "subscription_extended",
      message: `Your subscription has been extended by ${days} day(s). New expiry: ${newEnd.toLocaleDateString("en-IN")}`,
    });

    res.json({ ...updated, newEndDate: newEnd });
  } catch (error) {
    console.error("Extend subscription error:", error);
    res.status(500).json({ error: "Failed to extend subscription" });
  }
});
router.post("/admin/owner-subscriptions/:id/activate", isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const { note, startDate, endDate } = req.body;
    const adminId = getRequestUserId(req as AuthenticatedRequest);
    await storage.updateOwnerSubscriptionDates(
      req.params.id,
      new Date(startDate),
      new Date(endDate),
    );
    const sub = await storage.activateOwnerSubscription(
      req.params.id,
      adminId,
      note,
    );
    if (!sub) return res.status(404).json({ error: "Subscription not found" });

    // ── Generate GST Invoice ──────────────────────────────────────────
    try {
      const { createInvoice, generateInvoicePDF } = await import(
        "./invoiceService"
      );
      const { sendInvoiceEmail } = await import("./emailService");

      // Get payment proof for transaction ID
      const { db: invoiceDb } = await import("./db");
      const { subscriptionPayments } = await import("../shared/schema");
      const { eq: eqOp, desc: descOp } = await import("drizzle-orm");

      const proofs = await invoiceDb
        .select()
        .from(subscriptionPayments)
        .where(eqOp(subscriptionPayments.subscriptionId, req.params.id))
        .orderBy(descOp(subscriptionPayments.submittedAt))
        .limit(1);

      const proof = proofs[0];
      const owner = await storage.getUser(sub.ownerId);
      const plan = await storage.getSubscriptionPlan(sub.planId);

      if (owner && plan) {
        const invoice = await createInvoice({
          subscriptionId: sub.id,
          ownerId: sub.ownerId,
          planName: plan.name,
          planDuration: sub.duration,
          totalAmountPaid: Number(sub.pricePaid),
          transactionId: proof?.transactionId || undefined,
          createdBy: adminId,
        });

        // Generate PDF and email it
        const pdfBuffer = await generateInvoicePDF(invoice.id);

        if (owner.email) {
          await sendInvoiceEmail(
            owner.email,
            owner.firstName || "Property Owner",
            invoice.invoiceNumber,
            plan.name,
            invoice.totalAmount,
            pdfBuffer,
          );
          console.log(
            `[INVOICE] Sent ${invoice.invoiceNumber} to ${owner.email}`,
          );
        }
      }
    } catch (invoiceError) {
      // Don't fail activation if invoice generation fails
      console.error("[INVOICE] Generation failed:", invoiceError);
    }

    // Auto-approve all pending properties for this owner
    try {
      const ownerId = sub.ownerId;
      const owner = await storage.getUser(ownerId);

      // Only auto-approve if owner's KYC is verified
      if (owner?.kycStatus === "verified") {
        const allProperties = await storage.getProperties({
          ownerId,
          includeAllStatuses: true,
          adminView: true,
        });
        const pendingProperties = allProperties.filter(
          (p: any) => p.status === "pending",
        );

        for (const property of pendingProperties) {
          // Check property has GPS coordinates (required for publishing)
          if (!property.latitude || !property.longitude) {
            console.log(
              `[AUTO-APPROVE] Skipping ${property.title} — missing GPS coordinates`,
            );
            continue;
          }

          await storage.updateProperty(property.id, {
            status: "published",
            verificationNotes:
              `Auto-approved on subscription activation. ${note || ""}`.trim(),
            verifiedAt: new Date(),
            verifiedBy: adminId,
          });

          // Notify owner their property is live
          const { broadcastToUser } = await import("./routes");
          broadcastToUser(ownerId, {
            type: "property_status_update",
            propertyId: property.id,
            status: "published",
            message: `Great news! Your property "${property.title}" is now live on ZECOHO.`,
            propertyTitle: property.title,
          });

          // Send property live email to owner
          if (owner.email) {
            const { sendPropertyLiveEmail } = await import("./emailService");
            sendPropertyLiveEmail(
              owner.email,
              owner.firstName || "Property Owner",
              property.title,
            ).catch(console.error);
          }

          console.log(
            `[AUTO-APPROVE] Property "${property.title}" approved for owner ${ownerId}`,
          );
        }

        if (pendingProperties.length > 0) {
          console.log(
            `[AUTO-APPROVE] ${pendingProperties.length} properties auto-approved for owner ${ownerId}`,
          );
        }
      } else {
        console.log(
          `[AUTO-APPROVE] Skipped — owner KYC status: ${owner?.kycStatus}`,
        );
      }
    } catch (autoApproveError) {
      // Don't fail subscription activation if auto-approve fails
      console.error(
        "[AUTO-APPROVE] Error during auto-approval:",
        autoApproveError,
      );
    }

    // Trigger referral reward for the activated owner (fire-and-forget)
    try {
      const { db: refDb } = await import("./db");
      const { ownerReferrals } = await import("../shared/schema");
      const { eq: eqRef, and: andRef } = await import("drizzle-orm");
      const { broadcastToUser } = await import("./routes");

      const [pendingRef] = await refDb
        .select()
        .from(ownerReferrals)
        .where(
          andRef(
            eqRef(ownerReferrals.refereeId, sub.ownerId),
            eqRef(ownerReferrals.status, "signed_up"),
          ),
        )
        .limit(1);

      if (pendingRef) {
        const rewardCode = "ZREF" + Math.random().toString(36).substring(2, 8).toUpperCase();
        await refDb
          .update(ownerReferrals)
          .set({ status: "rewarded", rewardedAt: new Date(), rewardCode })
          .where(eqRef(ownerReferrals.id, pendingRef.id));

        broadcastToUser(pendingRef.referrerId, {
          type: "referral_reward",
          message: `Your referral has subscribed! Use code ${rewardCode} to claim 1 free month on your next renewal.`,
          rewardCode,
        });

        console.log(`[REFERRAL] Reward code ${rewardCode} issued to ${pendingRef.referrerId}`);
      }
    } catch (refErr) {
      console.error("[REFERRAL] Reward trigger failed:", refErr);
    }

    res.json(sub);
  } catch (error) {
    res.status(500).json({ error: "Failed to activate" });
  }
});

/* ADMIN — cancel */
router.post("/admin/owner-subscriptions/:id/cancel", isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const sub = await storage.cancelOwnerSubscription(
      req.params.id,
      req.body.reason,
    );
    res.json(sub);
  } catch (error) {
    res.status(500).json({ error: "Failed to cancel" });
  }
});

/* ADMIN — waive */
router.post("/admin/owner-subscriptions/:id/waive", isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const adminId = getRequestUserId(req as AuthenticatedRequest);
    const days = parseInt(req.body.days, 10);
    if (!days || days < 1 || days > 3650) {
      return res.status(400).json({ error: "days must be between 1 and 3650" });
    }
    const sub = await storage.waiveOwnerSubscription(
      req.params.id,
      adminId,
      req.body.note,
      days,
    );
    if (!sub) return res.status(404).json({ error: "Subscription not found" });

    // Auto-publish pending properties if KYC verified — mirrors activate flow.
    try {
      const owner = await storage.getUser(sub.ownerId);
      if (owner?.kycStatus === "verified") {
        const allProperties = await storage.getProperties({
          ownerId: sub.ownerId,
          includeAllStatuses: true,
          adminView: true,
        });
        const pendingProperties = allProperties.filter(
          (p: any) => p.status === "pending",
        );
        for (const property of pendingProperties) {
          if (!property.latitude || !property.longitude) continue;
          await storage.updateProperty(property.id, {
            status: "published",
            verificationNotes:
              `Auto-approved on subscription waiver. ${req.body.note || ""}`.trim(),
            verifiedAt: new Date(),
            verifiedBy: adminId,
          });
        }
      }
    } catch (publishError) {
      console.error("[WAIVE] auto-publish failed:", publishError);
    }

    res.json(sub);
  } catch (error) {
    res.status(500).json({ error: "Failed to waive" });
  }
});

/* ADMIN — create-and-waive (one-shot for KYC approval flow) */
router.post(
  "/admin/owner-subscriptions/create-and-waive",
  isAuthenticated,
  requireAdmin,
  async (req, res) => {
    try {
      const adminId = getRequestUserId(req as AuthenticatedRequest);
      const { ownerId, planId, days, note } = req.body ?? {};
      if (!ownerId || !planId) {
        return res
          .status(400)
          .json({ error: "ownerId and planId are required" });
      }
      const dayCount = parseInt(days, 10);
      if (!dayCount || dayCount < 1 || dayCount > 3650) {
        return res
          .status(400)
          .json({ error: "days must be between 1 and 3650" });
      }

      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) return res.status(404).json({ error: "Plan not found" });

      const owner = await storage.getUser(ownerId);
      if (!owner) return res.status(404).json({ error: "Owner not found" });

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + dayCount);

      const created = await storage.createOwnerSubscription({
        ownerId,
        planId,
        tier: plan.tier,
        duration: plan.duration,
        status: "active",
        isWaived: true,
        startDate,
        endDate,
        pricePaid: "0",
        activatedBy: adminId,
        activationNote: note || null,
      });

      // Auto-publish pending properties if KYC verified.
      try {
        if (owner.kycStatus === "verified") {
          const allProperties = await storage.getProperties({
            ownerId,
            includeAllStatuses: true,
            adminView: true,
          });
          const pendingProperties = allProperties.filter(
            (p: any) => p.status === "pending",
          );
          for (const property of pendingProperties) {
            if (!property.latitude || !property.longitude) continue;
            await storage.updateProperty(property.id, {
              status: "published",
              verificationNotes:
                `Auto-approved on subscription waiver. ${note || ""}`.trim(),
              verifiedAt: new Date(),
              verifiedBy: adminId,
            });
          }
        }
      } catch (publishError) {
        console.error(
          "[CREATE-AND-WAIVE] auto-publish failed:",
          publishError,
        );
      }

      res.json(created);
    } catch (error) {
      console.error("Create-and-waive error:", error);
      res.status(500).json({ error: "Failed to create-and-waive" });
    }
  },
);

export default router;
