import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Crown,
  Zap,
  Star,
  Calendar,
  AlertCircle,
  ArrowUpCircle,
  XCircle,
  Clock,
  Building2,
  Image,
  BarChart2,
  Rocket,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface SubscriptionPlan {
  id: string;
  name: string;
  tier: "basic" | "standard" | "premium";
  price: string;
  cutoffPrice?: string | null;
  duration: string;
  maxProperties: number;
  maxPhotosPerProperty: number;
  bookingManagementEnabled: boolean;
  priorityPlacement: boolean;
  analyticsEnabled: boolean;
  sortOrder: number;
  isActive: boolean;
}

interface SubscriptionStatus {
  isActive: boolean;
  tier: string | null;
  expiresAt: string | null;
  daysLeft: number | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const TIER_META: Record<
  string,
  { icon: React.ReactNode; gradient: string; accent: string; badge: string }
> = {
  basic: {
    icon: <Zap className="h-6 w-6" />,
    gradient:
      "from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900",
    accent: "text-slate-700 dark:text-slate-300",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  },
  standard: {
    icon: <Star className="h-6 w-6" />,
    gradient:
      "from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30",
    accent: "text-blue-700 dark:text-blue-300",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200",
  },
  premium: {
    icon: <Crown className="h-6 w-6" />,
    gradient:
      "from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30",
    accent: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-800 dark:text-amber-200",
  },
};

const PLAN_FEATURES = (plan: SubscriptionPlan) => [
  {
    icon: <Building2 className="h-4 w-4" />,
    label: `${plan.maxProperties === 999 ? "Unlimited" : plan.maxProperties} propert${plan.maxProperties === 1 ? "y" : "ies"}`,
  },
  {
    icon: <Image className="h-4 w-4" />,
    label: `${plan.maxPhotosPerProperty === 999 ? "Unlimited" : plan.maxPhotosPerProperty} photos per property`,
  },
  {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: "Booking management",
    enabled: plan.bookingManagementEnabled,
  },
  {
    icon: <Rocket className="h-4 w-4" />,
    label: "Priority placement",
    enabled: plan.priorityPlacement,
  },
  {
    icon: <BarChart2 className="h-4 w-4" />,
    label: "Analytics dashboard",
    enabled: plan.analyticsEnabled,
  },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── Status Banner ──────────────────────────────────────────────────────────
function StatusBanner({ status }: { status: SubscriptionStatus }) {
  if (!status.isActive) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-red-700 dark:text-red-400">
            No active subscription
          </p>
          <p className="text-sm text-red-600 dark:text-red-500 mt-0.5">
            Subscribe to a plan below to start listing your properties on
            ZECOHO.
          </p>
        </div>
      </div>
    );
  }

  const isWarning = status.daysLeft !== null && status.daysLeft <= 7;
  return (
    <div
      className={`rounded-xl border p-4 flex items-start gap-3 ${
        isWarning
          ? "border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800"
          : "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800"
      }`}
    >
      {isWarning ? (
        <Clock className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
      ) : (
        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p
            className={`font-semibold ${isWarning ? "text-amber-700 dark:text-amber-400" : "text-green-700 dark:text-green-400"}`}
          >
            {isWarning ? "Expiring soon!" : "Subscription active"}
          </p>
          <Badge className="capitalize">{status.tier} plan</Badge>
        </div>
        <p
          className={`text-sm mt-0.5 ${isWarning ? "text-amber-600 dark:text-amber-500" : "text-green-600 dark:text-green-500"}`}
        >
          {status.expiresAt
            ? `Expires on ${formatDate(status.expiresAt)}${status.daysLeft !== null ? ` · ${status.daysLeft} day${status.daysLeft === 1 ? "" : "s"} left` : ""}`
            : "No expiry date set"}
        </p>
      </div>
    </div>
  );
}

// ── Plan Card ──────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  currentTier,
  onSelect,
  isLoading,
}: {
  plan: SubscriptionPlan;
  currentTier: string | null;
  onSelect: (plan: SubscriptionPlan) => void;
  isLoading: boolean;
}) {
  const meta = TIER_META[plan.tier] ?? TIER_META.basic;
  const isCurrentPlan = currentTier === plan.tier;
  const isUpgrade =
    currentTier &&
    ["basic", "standard", "premium"].indexOf(plan.tier) >
      ["basic", "standard", "premium"].indexOf(currentTier);
  const isDowngrade =
    currentTier &&
    !isCurrentPlan &&
    ["basic", "standard", "premium"].indexOf(plan.tier) <
      ["basic", "standard", "premium"].indexOf(currentTier);

  const features = PLAN_FEATURES(plan);

  return (
    <div
      className={`relative rounded-2xl border-2 p-6 flex flex-col gap-5 transition-all duration-200 bg-gradient-to-br ${meta.gradient} ${
        isCurrentPlan
          ? "border-primary shadow-lg scale-[1.02]"
          : "border-border hover:border-primary/50 hover:shadow-md"
      }`}
    >
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full shadow">
            Current Plan
          </span>
        </div>
      )}

      {plan.tier === "standard" && !isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
            Most Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${meta.badge}`}
        >
          {meta.icon}
        </div>
        <div>
          <h3 className="font-bold text-lg leading-tight">{plan.name}</h3>
          <p className={`text-xs font-medium capitalize ${meta.accent}`}>
            {plan.tier} tier
          </p>
        </div>
      </div>

      {/* Price */}
      <div className="flex items-end gap-2">
        <span className="text-3xl font-extrabold tracking-tight">
          ₹{Number(plan.price).toLocaleString("en-IN")}
        </span>
        {plan.cutoffPrice && (
          <span className="text-base text-muted-foreground line-through mb-1">
            ₹{Number(plan.cutoffPrice).toLocaleString("en-IN")}
          </span>
        )}
        <span className="text-sm text-muted-foreground mb-1">
          /{plan.duration}
        </span>
      </div>

      {/* Features */}
      <ul className="space-y-2 flex-1">
        {features.map((f, i) => (
          <li
            key={i}
            className={`flex items-center gap-2 text-sm ${
              "enabled" in f && f.enabled === false
                ? "text-muted-foreground line-through opacity-50"
                : ""
            }`}
          >
            <span
              className={`flex-shrink-0 ${"enabled" in f && f.enabled === false ? "text-muted-foreground" : meta.accent}`}
            >
              {"enabled" in f && f.enabled === false ? (
                <XCircle className="h-4 w-4" />
              ) : (
                f.icon
              )}
            </span>
            {f.label}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Button
        className="w-full mt-2"
        variant={isCurrentPlan ? "outline" : "default"}
        disabled={isCurrentPlan || isLoading}
        onClick={() => !isCurrentPlan && onSelect(plan)}
      >
        {isCurrentPlan ? (
          "Current Plan"
        ) : isUpgrade ? (
          <>
            <ArrowUpCircle className="h-4 w-4 mr-2" /> Upgrade
          </>
        ) : isDowngrade ? (
          "Switch to this plan"
        ) : (
          "Subscribe"
        )}
      </Button>
    </div>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────
function ConfirmDialog({
  plan,
  open,
  onClose,
  onConfirm,
  isLoading,
}: {
  plan: SubscriptionPlan | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  if (!plan) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Subscription</DialogTitle>
          <DialogDescription>
            You are about to subscribe to the <strong>{plan.name}</strong> plan
            at{" "}
            <strong>
              ₹{Number(plan.price).toLocaleString("en-IN")}/{plan.duration}
            </strong>
            .
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border p-4 bg-muted/40 space-y-2 text-sm">
          <p className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Payment is manual — our team will activate your plan within 24 hours
            after payment confirmation.
          </p>
          <p className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            You can list up to{" "}
            <strong>
              {plan.maxProperties === 999 ? "unlimited" : plan.maxProperties}
            </strong>{" "}
            propert{plan.maxProperties === 1 ? "y" : "ies"}.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Submitting..." : "Confirm & Request Activation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function OwnerSubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: plans = [], isLoading: plansLoading } = useQuery<
    SubscriptionPlan[]
  >({
    queryKey: ["/api/subscription-plans"],
    queryFn: () =>
      apiRequest("GET", "/api/subscription-plans").then((r) => r.json()),
  });

  const { data: status, isLoading: statusLoading } =
    useQuery<SubscriptionStatus>({
      queryKey: ["/api/owner/subscription-status", user?.id],
      queryFn: () =>
        apiRequest("GET", `/api/owner/subscription-status/${user?.id}`).then(
          (r) => r.json(),
        ),
      enabled: !!user?.id,
    });

  const subscribeMutation = useMutation({
    mutationFn: async (plan: SubscriptionPlan) => {
      const res = await apiRequest("POST", "/api/owner/subscribe", {
        planId: plan.id,
        tier: plan.tier,
        duration: plan.duration,
        pricePaid: plan.price,
      });
      if (!res.ok) throw new Error("Failed to submit subscription request");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription request submitted!",
        description:
          "Our team will activate your plan within 24 hours after verifying payment.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/owner/subscription-status"],
      });
      setConfirmOpen(false);
      setSelectedPlan(null);
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description:
          "Could not submit your subscription request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (selectedPlan) subscribeMutation.mutate(selectedPlan);
  };

  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Subscription Plans
        </h1>
        <p className="text-muted-foreground mt-1">
          Choose a plan to start listing your properties on ZECOHO. Zero
          commission on bookings.
        </p>
      </div>

      {/* Status Banner */}
      {statusLoading ? (
        <div className="h-16 rounded-xl bg-muted animate-pulse" />
      ) : status ? (
        <StatusBanner status={status} />
      ) : null}

      {/* Plan Cards */}
      {plansLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : sortedPlans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No plans available at the moment. Please check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {sortedPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentTier={status?.isActive ? status.tier : null}
              onSelect={handleSelectPlan}
              isLoading={subscribeMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* FAQ note */}
      <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">How does activation work?</p>
        <p>
          After selecting a plan, our team reviews your request and activates it
          manually within 24 hours once payment is confirmed. You'll be notified
          once your plan is live.
        </p>
        <p className="mt-2">
          Need help? Contact us at{" "}
          <span className="text-primary font-medium">support@zecoho.com</span>
        </p>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        plan={selectedPlan}
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        isLoading={subscribeMutation.isPending}
      />
    </div>
  );
}
