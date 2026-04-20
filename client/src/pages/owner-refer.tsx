import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/OwnerLayout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Gift,
  Copy,
  Share2,
  CheckCircle2,
  Users,
  Crown,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function OwnerRefer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const { data: referralData, isLoading: referralLoading } = useQuery<any>({
    queryKey: ["/api/referral/my-code"],
    queryFn: () =>
      fetch("/api/referral/my-code", { credentials: "include" }).then((r) =>
        r.json(),
      ),
    enabled: !!user,
  });

  const { data: rewards = [], refetch: refetchRewards } = useQuery<any[]>({
    queryKey: ["/api/referral/my-rewards"],
    queryFn: () =>
      fetch("/api/referral/my-rewards", { credentials: "include" }).then((r) =>
        r.json(),
      ),
    enabled: !!user,
  });

  const pendingRewards = rewards.filter((r: any) => !r.rewardRedeemedAt);
  const redeemedRewards = rewards.filter((r: any) => r.rewardRedeemedAt);

  const copyCode = () => {
    navigator.clipboard.writeText(referralData?.referralCode || "");
    toast({ title: "Referral code copied!" });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralData?.referralLink || "");
    toast({ title: "Referral link copied!" });
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(
      `Hey! I've been using ZECOHO to get direct hotel bookings with 0% commission. List your property for free here: ${referralData?.referralLink}`,
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setRedeeming(true);
    try {
      const res = await fetch("/api/referral/redeem", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardCode: redeemCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to redeem");
      toast({
        title: "Reward redeemed!",
        description: "1 free month has been activated on your account.",
      });
      setRedeemCode("");
      refetchRewards();
    } catch (err: any) {
      toast({
        title: "Redemption failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <OwnerLayout>
      <div className="max-w-2xl mx-auto space-y-6 py-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6 text-amber-500" />
            Refer & Earn
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Refer fellow hotel owners to Zecoho. When they subscribe, you earn a
            free month on your plan.
          </p>
        </div>

        {/* How it works */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                {
                  icon: Share2,
                  step: "1",
                  label: "Share your link",
                  desc: "Send your referral link to another hotelier",
                },
                {
                  icon: Users,
                  step: "2",
                  label: "They list & subscribe",
                  desc: "They sign up and activate a subscription",
                },
                {
                  icon: Crown,
                  step: "3",
                  label: "You get a reward code",
                  desc: "Redeem it for 1 free month on the same plan",
                },
              ].map(({ icon: Icon, step, label, desc }) => (
                <div key={step} className="space-y-2">
                  <div className="mx-auto w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-amber-600" />
                  </div>
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {referralLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                icon: Users,
                label: "Referred",
                value: referralData?.stats?.totalReferred ?? 0,
              },
              {
                icon: CheckCircle2,
                label: "Subscribed",
                value: referralData?.stats?.totalSubscribed ?? 0,
              },
              {
                icon: Clock,
                label: "Free Months",
                value: referralData?.stats?.totalMonthsEarned ?? 0,
              },
            ].map(({ icon: Icon, label, value }) => (
              <Card key={label}>
                <CardContent className="p-4 text-center">
                  <Icon className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Your referral code */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your Referral Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {referralLoading ? (
              <Skeleton className="h-14 w-full rounded-lg" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted/50 border rounded-lg px-4 py-3 font-mono font-bold text-xl tracking-widest text-center">
                  {referralData?.referralCode || "—"}
                </div>
                <Button size="icon" variant="outline" onClick={copyCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={copyLink}
                disabled={referralLoading}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Referral Link
              </Button>
              <Button
                className="flex-1 bg-green-500 hover:bg-green-600"
                onClick={shareWhatsApp}
                disabled={referralLoading}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share on WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending reward codes */}
        {pendingRewards.length > 0 && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-green-700 dark:text-green-400 flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Reward Codes Ready to Use ({pendingRewards.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-green-700 dark:text-green-400">
                Your referral subscribed! Redeem this code to activate 1 free month on your current plan.
              </p>
              {pendingRewards.map((r: any) => (
                <div
                  key={r.rewardCode}
                  className="flex items-center gap-2 bg-white dark:bg-muted/30 border border-green-200 rounded-lg px-3 py-2"
                >
                  <span className="font-mono font-bold tracking-widest text-green-800 dark:text-green-300 flex-1">
                    {r.rewardCode}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(r.rewardCode);
                      toast({ title: "Reward code copied!" });
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setRedeemCode(r.rewardCode)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Use this code
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Redeem a reward code */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Redeem Reward Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter your reward code to activate 1 free month on your last subscription plan.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. ZREFAB12XY"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                className="font-mono tracking-widest"
              />
              <Button
                onClick={handleRedeem}
                disabled={redeeming || !redeemCode.trim()}
              >
                {redeeming ? "Redeeming..." : "Redeem"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Past redeemed rewards */}
        {redeemedRewards.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-muted-foreground">
                Redeemed Rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {redeemedRewards.map((r: any) => (
                  <div
                    key={r.rewardCode}
                    className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
                  >
                    <span className="font-mono text-muted-foreground">
                      {r.rewardCode}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Redeemed{" "}
                      {new Date(r.rewardRedeemedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </OwnerLayout>
  );
}
