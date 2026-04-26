import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, AlertTriangle } from "lucide-react";

interface PlatformSettings {
  id: string;
  gstInclusive: boolean;
  platformFeePercent: string;
  advancePaymentPercent: string;
}

export default function AdminPlatformSettings() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [gstInclusive, setGstInclusive] = useState(true);
  const [platformFeePercent, setPlatformFeePercent] = useState("0");
  const [advancePaymentPercent, setAdvancePaymentPercent] = useState("0");

  const { data: settings, isLoading } = useQuery<PlatformSettings>({
    queryKey: ["/api/platform-settings"],
    enabled: user?.userRole === "admin",
    staleTime: 0,
  });

  useEffect(() => {
    if (settings) {
      setGstInclusive(!!settings.gstInclusive);
      setPlatformFeePercent(String(settings.platformFeePercent ?? "0"));
      setAdvancePaymentPercent(String(settings.advancePaymentPercent ?? "0"));
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", "/api/admin/platform-settings", {
        gstInclusive,
        platformFeePercent,
        advancePaymentPercent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-settings"] });
      toast({
        title: "Platform settings saved",
        description: "Changes apply to all future bookings.",
      });
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "Could not save platform settings.",
        variant: "destructive",
      });
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (user?.userRole !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Admin access required.
          </p>
          <Button onClick={() => setLocation("/")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const platformFeeNum = Number(platformFeePercent);
  const advanceNum = Number(advancePaymentPercent);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold"
          data-testid="text-platform-settings-title"
        >
          Platform Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          GST behaviour, platform fee, and advance-payment percentage. Applies
          to all future bookings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GST Settings</CardTitle>
          <CardDescription>How GST is treated for room pricing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="gst-inclusive">
                GST Inclusive in room price
              </Label>
              <p className="text-xs text-muted-foreground max-w-md">
                When enabled, GST is extracted from the displayed price. Guests
                see the same total — GST breakdown shown separately.
              </p>
            </div>
            <Switch
              id="gst-inclusive"
              checked={gstInclusive}
              onCheckedChange={setGstInclusive}
              data-testid="switch-gst-inclusive"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Platform Fee</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="platform-fee">Platform Fee %</Label>
            <Input
              id="platform-fee"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={platformFeePercent}
              onChange={(e) => setPlatformFeePercent(e.target.value)}
              data-testid="input-platform-fee-percent"
            />
            <p className="text-xs text-muted-foreground">
              Currently set to {platformFeeNum}% —{" "}
              {platformFeeNum === 0 ? "Zero Commission model" : "non-zero"}.
            </p>
          </div>
          {platformFeeNum > 0 && (
            <Alert
              className="bg-amber-50 dark:bg-amber-950/30 border-amber-300"
              data-testid="alert-platform-fee-warning"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                Changing this affects all future bookings.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Advance Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="advance-percent">Advance Payment %</Label>
            <Input
              id="advance-percent"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={advancePaymentPercent}
              onChange={(e) => setAdvancePaymentPercent(e.target.value)}
              data-testid="input-advance-percent"
            />
            <p className="text-xs text-muted-foreground">
              % of total collected at booking. {advanceNum === 0
                ? "0 = pay at hotel model."
                : `${advanceNum}% paid upfront.`}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          data-testid="button-save-platform-settings"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
