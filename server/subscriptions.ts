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
    const { planId, tier, duration, pricePaid } = req.body;
    const ownerId = req.user?.claims?.sub || req.user?.id;
    const sub = await storage.createOwnerSubscription({
      ownerId,
      planId,
      tier,
      duration,
      pricePaid: String(pricePaid),
      status: "pending_payment",
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
export default router;
