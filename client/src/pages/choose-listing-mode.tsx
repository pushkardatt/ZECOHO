import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Zap,
  Shield,
  Clock,
  CheckCircle,
  ArrowRight,
  Building2,
  MessageSquare,
  CalendarCheck,
  IndianRupee,
  Eye,
  XCircle,
} from "lucide-react";

export default function ChooseListingMode() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const selectModeMutation = useMutation({
    mutationFn: async (mode: "quick" | "full") => {
      return apiRequest("PATCH", "/api/user/listing-mode", { listingMode: mode });
    },
    onSuccess: (_, mode) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      if (mode === "quick") {
        navigate("/list-property?mode=quick");
      } else {
        navigate("/list-property");
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to set listing mode. Please try again.",
        variant: "destructive",
      });
    },
  });

  const quickListingFeatures = [
    { icon: Zap, text: "List in under 5 minutes" },
    { icon: Eye, text: "Limited visibility on platform" },
    { icon: MessageSquare, text: "Receive inquiries only", subtext: "No direct bookings" },
    { icon: Clock, text: "Upgrade anytime to full listing" },
  ];

  const quickListingLimitations = [
    { icon: XCircle, text: "No online bookings" },
    { icon: XCircle, text: "No payment processing" },
    { icon: XCircle, text: "Limited search visibility" },
  ];

  const fullApplicationFeatures = [
    { icon: Shield, text: "Verified property badge" },
    { icon: CalendarCheck, text: "Accept online bookings" },
    { icon: IndianRupee, text: "Secure payment processing" },
    { icon: MessageSquare, text: "Direct messaging with guests" },
    { icon: Eye, text: "Full visibility in search results" },
    { icon: Building2, text: "Complete property management" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3" data-testid="page-title">
            Choose Your Listing Mode
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Select how you want to list your property on ZECOHO. You can always upgrade later.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="relative overflow-hidden hover-elevate" data-testid="card-quick-listing">
            <div className="absolute top-4 right-4">
              <Badge variant="secondary">Fast & Easy</Badge>
            </div>
            <CardHeader className="pt-8">
              <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Quick Listing</CardTitle>
              <CardDescription className="text-base">
                Get started in minutes with basic property info. Perfect for testing the waters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {quickListingFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <feature.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="text-sm">{feature.text}</span>
                      {feature.subtext && (
                        <span className="text-xs text-muted-foreground block">{feature.subtext}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground mb-2">Limitations:</p>
                <div className="space-y-2">
                  {quickListingLimitations.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-muted-foreground">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="text-sm">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className="w-full"
                variant="outline"
                size="lg"
                onClick={() => selectModeMutation.mutate("quick")}
                disabled={selectModeMutation.isPending}
                data-testid="button-quick-listing"
              >
                Start Quick Listing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-primary/50 hover-elevate" data-testid="card-full-application">
            <div className="absolute top-4 right-4">
              <Badge variant="default">Recommended</Badge>
            </div>
            <CardHeader className="pt-8">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Full Application</CardTitle>
              <CardDescription className="text-base">
                Complete verification for maximum visibility and all platform features.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {fullApplicationFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-sm">{feature.text}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground mb-2">What you'll need:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Government ID (Aadhaar, PAN, etc.)</li>
                  <li>Property ownership documents</li>
                  <li>Business license (if applicable)</li>
                </ul>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => selectModeMutation.mutate("full")}
                disabled={selectModeMutation.isPending}
                data-testid="button-full-application"
              >
                Start Full Application
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Not sure? Start with Quick Listing and upgrade anytime to unlock all features.
        </p>
      </div>
    </div>
  );
}
