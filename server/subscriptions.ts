import { Router } from "express";
import { storage } from "./storage";
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
router.get("/admin/subscription-plans", async (req, res) => {
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

/* ADMIN — create plan */
/* ADMIN — create plan */
router.post("/admin/subscription-plans", async (req, res) => {
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
}); // ← this was missing

/* ADMIN — update plan */
router.patch("/admin/subscription-plans/:id", async (req, res) => {
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
router.get("/admin/owner-subscriptions", async (req, res) => {
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
    const ownerId = req.user?.claims?.sub || req.user?.id;

    // Block submission if no payment proof provided
    if (!transactionId || !transactionId.trim()) {
      return res
        .status(400)
        .json({
          error: "Transaction ID is required. Please complete payment first.",
        });
    }
    if (!screenshotUrl) {
      return res
        .status(400)
        .json({
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
router.delete("/admin/subscription-plans/:id", async (req, res) => {
  try {
    await storage.deleteSubscriptionPlan(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete plan" });
  }
});
/* ADMIN — activate */
router.post("/admin/owner-subscriptions/:id/activate", async (req, res) => {
  try {
    const { note, startDate, endDate } = req.body;
    const adminId = req.user?.claims?.sub || req.user?.id;
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
    res.json(sub);
  } catch (error) {
    res.status(500).json({ error: "Failed to activate" });
  }
});

/* ADMIN — cancel */
router.post("/admin/owner-subscriptions/:id/cancel", async (req, res) => {
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
router.post("/admin/owner-subscriptions/:id/waive", async (req, res) => {
  try {
    const adminId = req.user?.claims?.sub || req.user?.id;
    const sub = await storage.waiveOwnerSubscription(
      req.params.id,
      adminId,
      req.body.note,
    );
    res.json(sub);
  } catch (error) {
    res.status(500).json({ error: "Failed to waive" });
  }
});
export default router;
