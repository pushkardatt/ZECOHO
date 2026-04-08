import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { OwnerLayout } from "@/components/OwnerLayout";
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
  Plus,
  Pencil,
  Trash2,
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
  ExternalLink,
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

      {/* Stats */}
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

      {/* Referral Code */}
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

      {/* Share Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleCopyLink}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-amber-400 text-amber-700 dark:text-amber-400 rounded-xl font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors text-sm"
        >
          <Copy className="h-4 w-4" />
          Copy Referral Link
        </button>
        <button
          onClick={handleWhatsApp}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors text-sm"
        >
          <Share2 className="h-4 w-4" />
          Share on WhatsApp
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        Reward credited when your referral activates a subscription
      </p>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
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

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setStep("details");
      setTransactionId("");
      setScreenshotUrl("");
      setUploading(false);
    }
  }, [open]);
  useEffect(() => {
    if (!open) {
      setStep("details");
      setTransactionId("");
      setScreenshotUrl("");
      setUploading(false);
    }
  }, [open]);

  const { data: paymentAccounts = [] } = useQuery<any[]>({
    queryKey: ["/api/payment-accounts"],
    queryFn: () => fetch("/api/payment-accounts").then((r) => r.json()),
    enabled: open,
  });

  const upiAccounts = paymentAccounts.filter((a) => a.accountType === "upi");
  const bankAccounts = paymentAccounts.filter((a) => a.accountType === "bank");

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

  const resetAndClose = () => {
    setStep("details");
    setTransactionId("");
    setScreenshotUrl("");
    onClose();
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && resetAndClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] min-h-[400px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "details" ? "How to Pay" : "Submit Payment Proof"}
          </DialogTitle>
          <DialogDescription>
            {plan.name} — ₹{Number(plan.price).toLocaleString("en-IN")}/
            {plan.duration}
          </DialogDescription>
        </DialogHeader>

        {step === "details" && (
          <div className="space-y-4">
            {/* Amount */}
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

            {/* UPI Accounts */}
            {upiAccounts.map((acc: any) => (
              <div
                key={acc.id}
                className={`rounded-xl border p-4 ${acc.priority === "primary" ? "border-primary bg-primary/5" : ""}`}
              >
                {acc.priority === "primary" && (
                  <Badge className="mb-2 text-xs bg-primary">Preferred</Badge>
                )}
                <div className="flex items-start gap-4">
                  {acc.qrCodeUrl && (
                    <img
                      src={acc.qrCodeUrl}
                      alt="QR"
                      className="w-20 h-20 rounded-lg border bg-white object-contain flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">UPI Payment</p>
                    <p className="font-semibold">{acc.accountName}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <code className="text-sm bg-muted px-2 py-0.5 rounded truncate">
                        {acc.upiId}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(acc.upiId);
                          toast({ title: "UPI ID copied!" });
                        }}
                      >
                        <Copy className="h-3.5 w-3.5 text-primary" />
                      </button>
                    </div>
                    {/* UPI Deep Link */}
                    <a
                      href={`upi://pay?pa=${encodeURIComponent(acc.upiId)}&pn=${encodeURIComponent(acc.accountName)}&am=${plan?.price}&cu=INR&tn=ZECOHO+Subscription`}
                      className="inline-flex items-center gap-1.5 mt-2 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      📱 Pay ₹
                      {plan
                        ? Number(plan.price).toLocaleString("en-IN")
                        : ""}{" "}
                      via UPI App
                    </a>
                    <p className="text-xs text-muted-foreground mt-1">
                      Open this page on your <strong>mobile phone</strong> to
                      pay directly via GPay / PhonePe / Paytm. On desktop, scan
                      the QR code or copy the UPI ID above.
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Bank Accounts */}
            {bankAccounts.map((acc: any) => (
              <div
                key={acc.id}
                className={`rounded-xl border p-4 ${acc.priority === "primary" && upiAccounts.length === 0 ? "border-primary bg-primary/5" : ""}`}
              >
                <p className="text-xs text-muted-foreground mb-2">
                  Bank Transfer
                </p>
                <p className="font-semibold mb-2">{acc.accountName}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {acc.bankName && (
                    <div>
                      <p className="text-xs text-muted-foreground">Bank</p>
                      <p>{acc.bankName}</p>
                    </div>
                  )}
                  {acc.accountNumber && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Account No.
                      </p>
                      <p className="font-mono">{acc.accountNumber}</p>
                    </div>
                  )}
                  {acc.ifscCode && (
                    <div>
                      <p className="text-xs text-muted-foreground">IFSC</p>
                      <p className="font-mono">{acc.ifscCode}</p>
                    </div>
                  )}
                  {acc.branchName && (
                    <div>
                      <p className="text-xs text-muted-foreground">Branch</p>
                      <p>{acc.branchName}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

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
              <Button variant="outline" onClick={resetAndClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep("proof")}
                disabled={paymentAccounts.length === 0}
              >
                I've Made the Payment →
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "proof" && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Transaction ID / UTR Number *</Label>
              <Input
                placeholder="e.g. 412345678901 or UPI reference number"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Find this in your UPI app or bank statement after payment
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
                ← Back to Payment Details
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

// ── Confirm Dialog (kept for reference, replaced by PaymentDialog) ──────────
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
      // Single call — backend validates proof and creates subscription together
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
        throw new Error(err.error || "Failed to submit subscription request");
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

        {/* FAQ note */}
        <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">
            How does activation work?
          </p>
          <p>
            After selecting a plan, our team reviews your request and activates
            it manually within 24 hours once payment is confirmed. You'll be
            notified once your plan is live.
          </p>
          <p className="mt-2">
            Need help? Contact us at{" "}
            <span className="text-primary font-medium">support@zecoho.com</span>
          </p>
        </div>

        {/* Payment Dialog */}
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

        {/* Referral Program */}
        <ReferralCard />
      </div>
    </OwnerLayout>
  );
}
