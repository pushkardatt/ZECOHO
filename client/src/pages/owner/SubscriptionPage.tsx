import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { OwnerLayout } from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertCircle,
  ArrowUpCircle,
  XCircle,
  Clock,
  Building2,
  Image,
  BarChart2,
  Rocket,
  Copy,
  Share2,
  Gift,
  Upload,
  IndianRupee,
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

// ── Referral Card ──────────────────────────────────────────────────────────
function ReferralCard() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { data: referralData } = useQuery({
    queryKey: ["/api/referral/my-code"],
    queryFn: () =>
      fetch("/api/referral/my-code", { credentials: "include" }).then((r) =>
        r.json(),
      ),
  });
  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralData?.referralCode || "");
    setCopied(true);
    toast({ title: "Referral code copied!" });
    setTimeout(() => setCopied(false), 2000);
  };
  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralData?.referralLink || "");
    setCopied(true);
    toast({ title: "Referral link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };
  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `Hey! I've been using ZECOHO to get direct hotel bookings with 0% commission. List your property for free here: ${referralData?.referralLink}`,
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };
  return (
    <div className="mt-8 rounded-2xl border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-6">
      <div className="flex items-center gap-2 mb-2">
        <Gift className="h-5 w-5 text-amber-600" />
        <h3 className="text-lg font-bold">
          Refer a Hotel Owner — Earn Free Months
        </h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Share your referral link with other hoteliers. When they subscribe, you
        get <strong>1 free month</strong> added to your plan.
      </p>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: "Hotels Referred",
            value: referralData?.stats?.totalReferred ?? 0,
          },
          {
            label: "Subscribed",
            value: referralData?.stats?.totalSubscribed ?? 0,
          },
          {
            label: "Free Months Earned",
            value: referralData?.stats?.totalMonthsEarned ?? 0,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-muted/50 rounded-xl p-4 text-center shadow-sm border"
          >
            <div className="text-2xl font-bold text-amber-600">
              {stat.value}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
      <div className="mb-4">
        <label className="text-xs font-semibold text-muted-foreground mb-1 block">
          YOUR REFERRAL CODE
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white dark:bg-muted/50 border rounded-lg px-4 py-3 font-mono font-bold text-lg tracking-widest text-center">
            {referralData?.referralCode || "Loading..."}
          </div>
          <button
            onClick={handleCopyCode}
            className="p-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
          >
            {copied ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleCopyLink}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-amber-400 text-amber-700 dark:text-amber-400 rounded-xl font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors text-sm"
        >
          <Copy className="h-4 w-4" /> Copy Referral Link
        </button>
        <button
          onClick={handleWhatsApp}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors text-sm"
        >
          <Share2 className="h-4 w-4" /> Share on WhatsApp
        </button>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-4">
        Reward credited when your referral activates a subscription
      </p>
    </div>
  );
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
      className={`rounded-xl border p-4 flex items-start gap-3 ${isWarning ? "border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800" : "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800"}`}
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
      className={`relative rounded-2xl border-2 p-6 flex flex-col gap-5 transition-all duration-200 bg-gradient-to-br ${meta.gradient} ${isCurrentPlan ? "border-primary shadow-lg scale-[1.02]" : "border-border hover:border-primary/50 hover:shadow-md"}`}
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
      <ul className="space-y-2 flex-1">
        {features.map((f, i) => (
          <li
            key={i}
            className={`flex items-center gap-2 text-sm ${"enabled" in f && f.enabled === false ? "text-muted-foreground line-through opacity-50" : ""}`}
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

// ── Payment Tabs ───────────────────────────────────────────────────────────
function PaymentTabs({
  upiAccounts,
  bankAccounts,
  plan,
  toast,
}: {
  upiAccounts: any[];
  bankAccounts: any[];
  plan: SubscriptionPlan;
  toast: any;
}) {
  const [enlargeQR, setEnlargeQR] = useState(false);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  const upiQRValue = (upiId: string, name: string) =>
    `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${plan.price}&cu=INR&tn=ZECOHOSubscription`;

  const upiApps = [
    {
      name: "GPay",
      emoji: "🟢",
      scheme: (upiId: string, name: string) =>
        isAndroid
          ? `intent://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${plan.price}&cu=INR&tn=ZECOHO#Intent;scheme=tez;package=com.google.android.apps.nbu.paisa.user;end`
          : `tez://upi/pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${plan.price}&cu=INR`,
    },
    {
      name: "PhonePe",
      emoji: "💜",
      scheme: (upiId: string, name: string) =>
        isAndroid
          ? `intent://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${plan.price}&cu=INR&tn=ZECOHO#Intent;scheme=phonepe;package=com.phonepe.app;end`
          : `phonepe://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${plan.price}&cu=INR`,
    },
    {
      name: "Paytm",
      emoji: "💙",
      scheme: (upiId: string, name: string) =>
        isAndroid
          ? `intent://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${plan.price}&cu=INR&tn=ZECOHO#Intent;scheme=paytmmp;package=net.one97.paytm;end`
          : `paytmmp://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${plan.price}&cu=INR`,
    },
    {
      name: "BHIM",
      emoji: "🇮🇳",
      scheme: (upiId: string, name: string) =>
        isAndroid
          ? `intent://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${plan.price}&cu=INR&tn=ZECOHO#Intent;scheme=upi;package=in.org.npci.upiapp;end`
          : `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${plan.price}&cu=INR`,
    },
    {
      name: "Amazon",
      emoji: "📦",
      scheme: (upiId: string, name: string) =>
        isAndroid
          ? `intent://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${plan.price}&cu=INR&tn=ZECOHO#Intent;scheme=upi;package=in.amazon.mShop.android.shopping;end`
          : `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${plan.price}&cu=INR`,
    },
  ];

  const majorBanks = [
    { name: "SBI", emoji: "🔵" },
    { name: "HDFC", emoji: "🔴" },
    { name: "ICICI", emoji: "🟠" },
    { name: "Axis", emoji: "🟣" },
    { name: "Kotak", emoji: "🔴" },
    { name: "Yes Bank", emoji: "🔵" },
    { name: "PNB", emoji: "🟤" },
    { name: "BOB", emoji: "🟡" },
  ];

  return (
    <div className="space-y-4">
      {/* UPI Section */}
      {upiAccounts.map((acc: any) => (
        <div key={acc.id} className="rounded-xl border overflow-hidden">
          <div className="bg-primary px-4 py-2.5 flex items-center gap-2">
            <span className="text-primary-foreground font-semibold text-sm">
              📱 UPI Payment
            </span>
            {acc.priority === "primary" && (
              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                Recommended
              </span>
            )}
          </div>
          <div className="p-4 space-y-4">
            {acc.upiId && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">
                  Scan to pay{" "}
                  <strong>₹{Number(plan.price).toLocaleString("en-IN")}</strong>{" "}
                  — amount is pre-filled
                </p>
                <div
                  className="inline-block cursor-pointer relative"
                  onClick={() => setEnlargeQR(true)}
                >
                  <div className="w-44 h-44 mx-auto rounded-xl border-2 border-primary/20 bg-white flex items-center justify-center p-2">
                    <QRCode
                      value={upiQRValue(acc.upiId, acc.accountName)}
                      size={160}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="absolute bottom-1 right-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                    Tap to enlarge
                  </div>
                </div>
                <p className="text-xs text-green-600 font-medium mt-1">
                  ✅ Amount ₹{Number(plan.price).toLocaleString("en-IN")}{" "}
                  auto-filled
                </p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t" />
              <span className="text-xs text-muted-foreground px-2">
                or pay via UPI app
              </span>
              <div className="flex-1 border-t" />
            </div>
            {acc.upiId &&
              (isMobile ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Tap your UPI app — ₹
                    {Number(plan.price).toLocaleString("en-IN")} will be
                    pre-filled
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {upiApps.map((app) => (
                      <a
                        key={app.name}
                        href={app.scheme(acc.upiId, acc.accountName)}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl border hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <span className="text-xl">{app.emoji}</span>
                        <span className="text-xs text-center font-medium leading-tight">
                          {app.name}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/40 p-3 text-center text-sm text-muted-foreground">
                  📱 Open on your <strong>mobile phone</strong> to pay directly
                  via UPI app. On desktop, scan the QR code above.
                </div>
              ))}
            {acc.upiId && (
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Or copy UPI ID manually
                </p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-sm font-bold flex-1 break-all">
                    {acc.upiId}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(acc.upiId);
                      toast({ title: "UPI ID copied!" });
                    }}
                    className="p-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Copy className="h-4 w-4 text-primary" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Bank Section */}
      {bankAccounts.map((acc: any) => (
        <div key={acc.id} className="rounded-xl border overflow-hidden">
          <div className="bg-blue-600 px-4 py-2.5">
            <span className="text-white font-semibold text-sm">
              🏦 Bank Transfer (NEFT / IMPS / RTGS)
            </span>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Open your bank app and transfer to this account
            </p>
            <div className="grid grid-cols-4 gap-2">
              {majorBanks.map((bank) => (
                <div
                  key={bank.name}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl border bg-muted/30 text-center"
                >
                  <span className="text-lg">{bank.emoji}</span>
                  <span className="text-xs font-medium">{bank.name}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[
                { label: "Account Name", value: acc.accountName },
                { label: "Bank Name", value: acc.bankName },
                {
                  label: "Account Number",
                  value: acc.accountNumber,
                  mono: true,
                },
                { label: "IFSC Code", value: acc.ifscCode, mono: true },
                { label: "Branch", value: acc.branchName },
              ]
                .filter((f) => f.value)
                .map((field) => (
                  <div
                    key={field.label}
                    className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {field.label}
                      </p>
                      <p
                        className={`text-sm font-medium ${field.mono ? "font-mono" : ""}`}
                      >
                        {field.value}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(field.value!);
                        toast({ title: `${field.label} copied!` });
                      }}
                      className="p-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5 text-primary" />
                    </button>
                  </div>
                ))}
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 p-3 text-xs text-amber-700 dark:text-amber-300">
              ⚠️ Transfer exactly{" "}
              <strong>₹{Number(plan.price).toLocaleString("en-IN")}</strong> —
              any other amount will delay activation.
            </div>
          </div>
        </div>
      ))}

      {/* QR Enlarge Modal */}
      {enlargeQR && upiAccounts[0]?.upiId && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setEnlargeQR(false)}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
            <p className="text-sm font-semibold mb-1">
              Scan to Pay ₹{Number(plan.price).toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-green-600 mb-4">
              ✅ Amount is pre-filled automatically
            </p>
            <div className="w-64 h-64 mx-auto rounded-xl border bg-white flex items-center justify-center p-3">
              <QRCode
                value={upiQRValue(
                  upiAccounts[0].upiId,
                  upiAccounts[0].accountName,
                )}
                size={220}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Tap anywhere to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Payment Dialog ─────────────────────────────────────────────────────────
function PaymentDialog({
  plan,
  open,
  onClose,
  onSubmit,
  isLoading,
}: {
  plan: SubscriptionPlan | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    transactionId: string;
    screenshotUrl: string;
    paymentMethod: string;
  }) => void;
  isLoading: boolean;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<"details" | "proof">("details");
  const [transactionId, setTransactionId] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sendMobile, setSendMobile] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("details");
      setTransactionId("");
      setScreenshotUrl("");
      setUploading(false);
      setSendMobile("");
      setSendSuccess(false);
    }
  }, [open]);

  const { data: paymentAccountsRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/payment-accounts", open],
    queryFn: () =>
      fetch("/api/payment-accounts", { credentials: "include" }).then((r) =>
        r.json(),
      ),
    enabled: open,
    staleTime: 0,
  });

  const paymentAccounts = paymentAccountsRaw
    .map((a: any) => ({
      id: a.id,
      accountType: a.accountType || a.account_type,
      accountName: a.accountName || a.account_name,
      upiId: a.upiId || a.upi_id,
      qrCodeUrl: a.qrCodeUrl || a.qr_code_url,
      bankName: a.bankName || a.bank_name,
      accountNumber: a.accountNumber || a.account_number,
      ifscCode: a.ifscCode || a.ifsc_code,
      branchName: a.branchName || a.branch_name,
      priority: a.priority,
      isActive: a.isActive ?? a.is_active,
    }))
    .filter((a: any) => a.isActive);

  const upiAccounts = paymentAccounts.filter(
    (a: any) => a.accountType === "upi",
  );
  const bankAccounts = paymentAccounts.filter(
    (a: any) => a.accountType === "bank",
  );

  const buildMsg = (rich: boolean) => {
    const upiAcc = upiAccounts[0];
    const bankAcc = bankAccounts[0];
    const br = rich ? "\n" : "\n";
    let msg = rich
      ? `*ZECOHO Payment Details*${br}${br}Plan: ${plan?.name}${br}Amount: ₹${Number(plan?.price).toLocaleString("en-IN")}/${plan?.duration}${br}${br}`
      : `ZECOHO Payment${br}Plan: ${plan?.name}${br}Amount: Rs.${Number(plan?.price).toLocaleString("en-IN")}/${plan?.duration}${br}`;
    if (upiAcc)
      msg += rich
        ? `*UPI Payment*${br}UPI ID: ${upiAcc.upiId}${br}Name: ${upiAcc.accountName}${br}${br}`
        : `UPI: ${upiAcc.upiId}${br}`;
    if (bankAcc)
      msg += rich
        ? `*Bank Transfer*${br}Name: ${bankAcc.accountName}${br}Bank: ${bankAcc.bankName}${br}Acc: ${bankAcc.accountNumber}${br}IFSC: ${bankAcc.ifscCode}${br}${br}`
        : `Bank: ${bankAcc.bankName} Acc: ${bankAcc.accountNumber} IFSC: ${bankAcc.ifscCode}${br}`;
    msg += rich
      ? `Submit transaction ID & screenshot on zecoho.com/owner/subscription`
      : `Visit: zecoho.com/owner/subscription`;
    return msg;
  };

  const handleSendWhatsApp = () => {
    window.open(
      `https://wa.me/91${sendMobile}?text=${encodeURIComponent(buildMsg(true))}`,
      "_blank",
    );
    setSendSuccess(true);
    setTimeout(() => setSendSuccess(false), 5000);
  };

  const handleSendSMS = () => {
    window.open(
      `sms:${sendMobile}?body=${encodeURIComponent(buildMsg(false))}`,
      "_blank",
    );
    setSendSuccess(true);
    setTimeout(() => setSendSuccess(false), 5000);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const uploadRes = await fetch("/api/objects/upload", {
        method: "POST",
        credentials: "include",
      });
      const { uploadURL, accessPath, aclToken } = await uploadRes.json();
      await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      await fetch("/api/objects/set-acl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ accessPath, aclToken, visibility: "public" }),
      });
      setScreenshotUrl(accessPath);
      toast({ title: "Screenshot uploaded!" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!transactionId.trim()) {
      toast({ title: "Transaction ID required", variant: "destructive" });
      return;
    }
    if (!screenshotUrl) {
      toast({ title: "Payment screenshot required", variant: "destructive" });
      return;
    }
    onSubmit({
      transactionId,
      screenshotUrl,
      paymentMethod: upiAccounts.length > 0 ? "upi" : "bank_transfer",
    });
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="sm:max-w-lg"
        style={{
          maxHeight: "85vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {step === "details" ? "Payment Details" : "Submit Payment Proof"}
          </DialogTitle>
          <DialogDescription>
            {plan.name} — ₹{Number(plan.price).toLocaleString("en-IN")}/
            {plan.duration}
          </DialogDescription>
        </DialogHeader>

        {step === "details" && (
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Amount Box */}
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                Amount to pay
              </p>
              <p className="text-3xl font-bold text-primary">
                ₹{Number(plan.price).toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {plan.name} · {plan.duration}
              </p>
            </div>

            {paymentAccounts.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm border rounded-xl">
                <IndianRupee className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Payment details not configured yet.</p>
                <p className="mt-1">
                  Contact{" "}
                  <span className="text-primary">support@zecoho.com</span>
                </p>
              </div>
            )}

            {paymentAccounts.length > 0 && (
              <PaymentTabs
                upiAccounts={upiAccounts}
                bankAccounts={bankAccounts}
                plan={plan}
                toast={toast}
              />
            )}

            {/* Send to Mobile */}
            <div className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">
                  Send Payment Details to Mobile
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter mobile number to receive UPI ID, QR and bank details
              </p>
              <div className="flex items-center border rounded-lg overflow-hidden">
                <span className="px-3 py-2 bg-muted text-sm font-medium border-r">
                  🇮🇳 +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="Enter 10-digit mobile number"
                  value={sendMobile}
                  onChange={(e) =>
                    setSendMobile(e.target.value.replace(/\D/g, ""))
                  }
                  className="flex-1 px-3 py-2 text-sm outline-none bg-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSendWhatsApp}
                  disabled={sendMobile.length !== 10}
                  className="flex-1 px-3 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Share2 className="h-3.5 w-3.5" /> WhatsApp
                </button>
                <button
                  onClick={handleSendSMS}
                  disabled={sendMobile.length !== 10}
                  className="flex-1 px-3 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Share2 className="h-3.5 w-3.5" /> SMS
                </button>
              </div>
              {sendSuccess && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Message app opened —
                  send it!
                </p>
              )}
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                ⚠️ Important
              </p>
              <p className="mt-1 text-amber-700 dark:text-amber-300">
                Save your transaction ID and screenshot after paying — you'll
                need them in the next step.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep("proof")}>
                I've Made the Payment →
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "proof" && (
          <div className="space-y-4 py-2 overflow-y-auto flex-1">
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 p-3 text-sm">
              <p className="font-medium text-green-800 dark:text-green-300">
                ✅ Great! Now submit your payment proof
              </p>
              <p className="text-green-700 dark:text-green-400 mt-0.5">
                Our team will verify and activate your plan within 24 hours.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Transaction ID / UTR Number *</Label>
              <Input
                placeholder="e.g. 412345678901"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Find this in your UPI app or bank statement
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Screenshot *</Label>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${screenshotUrl ? "border-green-400 bg-green-50 dark:bg-green-950/20" : "border-muted-foreground/30"}`}
              >
                {screenshotUrl ? (
                  <div>
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      Screenshot uploaded!
                    </p>
                    <button
                      onClick={() => setScreenshotUrl("")}
                      className="text-xs text-muted-foreground underline mt-1"
                    >
                      Remove & re-upload
                    </button>
                  </div>
                ) : uploading ? (
                  <div>
                    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Uploading...
                    </p>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload your payment confirmation screenshot
                    </p>
                    <label className="cursor-pointer">
                      <span className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                        Choose File
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(f);
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("details")}>
                ← Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !transactionId.trim() || !screenshotUrl}
              >
                {isLoading ? "Submitting..." : "Submit for Verification"}
              </Button>
            </DialogFooter>
          </div>
        )}
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
    mutationFn: async ({
      plan,
      transactionId,
      screenshotUrl,
      paymentMethod,
    }: {
      plan: SubscriptionPlan;
      transactionId: string;
      screenshotUrl: string;
      paymentMethod: string;
    }) => {
      const subRes = await apiRequest("POST", "/api/owner/subscribe", {
        planId: plan.id,
        tier: plan.tier,
        duration: plan.duration,
        pricePaid: plan.price,
        transactionId,
        screenshotUrl,
        paymentMethod,
      });
      if (!subRes.ok) {
        const err = await subRes.json();
        throw new Error(err.error || "Failed to submit");
      }
      return subRes.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment proof submitted!",
        description:
          "Our team will verify your payment and activate your plan within 24 hours.",
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
        description: "Could not submit your request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setConfirmOpen(true);
  };
  const handlePaymentSubmit = (data: {
    transactionId: string;
    screenshotUrl: string;
    paymentMethod: string;
  }) => {
    if (selectedPlan) subscribeMutation.mutate({ plan: selectedPlan, ...data });
  };
  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <OwnerLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Subscription Plans
          </h1>
          <p className="text-muted-foreground mt-1">
            Choose a plan to start listing your properties on ZECOHO. Zero
            commission on bookings.
          </p>
        </div>

        {statusLoading ? (
          <div className="h-16 rounded-xl bg-muted animate-pulse" />
        ) : status ? (
          <StatusBanner status={status} />
        ) : null}

        {plansLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-96 rounded-2xl bg-muted animate-pulse"
              />
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

        <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">
            How does activation work?
          </p>
          <p>
            After selecting a plan, our team reviews your request and activates
            it manually within 24 hours once payment is confirmed.
          </p>
          <p className="mt-2">
            Need help? Contact us at{" "}
            <span className="text-primary font-medium">support@zecoho.com</span>
          </p>
        </div>

        <PaymentDialog
          plan={selectedPlan}
          open={confirmOpen}
          onClose={() => {
            setConfirmOpen(false);
            setSelectedPlan(null);
          }}
          onSubmit={handlePaymentSubmit}
          isLoading={subscribeMutation.isPending}
        />

        <ReferralCard />
      </div>
    </OwnerLayout>
  );
}
