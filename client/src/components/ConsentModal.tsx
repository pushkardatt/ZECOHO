import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Shield, FileText, Mail } from "lucide-react";

interface ConsentModalProps {
  open: boolean;
  userName?: string;
}

export function ConsentModal({ open, userName }: ConsentModalProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [communicationConsent, setCommunicationConsent] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const consentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/consent", {
        termsAccepted: true,
        privacyAccepted: true,
        consentCommunication: communicationConsent,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome to ZECOHO!",
        description: "Your preferences have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!termsAccepted || !privacyAccepted) {
      toast({
        title: "Required",
        description: "Please accept both Terms & Conditions and Privacy Policy to continue.",
        variant: "destructive",
      });
      return;
    }
    consentMutation.mutate();
  };

  const canSubmit = termsAccepted && privacyAccepted;

  return (
    <Dialog open={open}>
      <DialogContent 
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl" data-testid="text-consent-title">
            <Shield className="h-5 w-5 text-primary" />
            Welcome{userName ? `, ${userName}` : ""}!
          </DialogTitle>
          <DialogDescription>
            Before you start exploring, please review and accept our policies.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/30">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              data-testid="checkbox-terms"
            />
            <div className="space-y-1.5 leading-none">
              <Label
                htmlFor="terms"
                className="text-sm font-medium cursor-pointer flex items-center gap-2"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                I accept the Terms & Conditions
                <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                By checking this box, you agree to our{" "}
                <Link href="/terms" className="text-primary hover:underline" data-testid="link-terms">
                  Terms & Conditions
                </Link>
                {" "}governing the use of ZECOHO platform.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/30">
            <Checkbox
              id="privacy"
              checked={privacyAccepted}
              onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
              data-testid="checkbox-privacy"
            />
            <div className="space-y-1.5 leading-none">
              <Label
                htmlFor="privacy"
                className="text-sm font-medium cursor-pointer flex items-center gap-2"
              >
                <Shield className="h-4 w-4 text-muted-foreground" />
                I accept the Privacy Policy
                <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                By checking this box, you agree to our{" "}
                <Link href="/privacy" className="text-primary hover:underline" data-testid="link-privacy">
                  Privacy Policy
                </Link>
                {" "}explaining how we collect, use, and protect your data.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 border rounded-lg">
            <Checkbox
              id="communication"
              checked={communicationConsent}
              onCheckedChange={(checked) => setCommunicationConsent(checked === true)}
              data-testid="checkbox-communication"
            />
            <div className="space-y-1.5 leading-none">
              <Label
                htmlFor="communication"
                className="text-sm font-medium cursor-pointer flex items-center gap-2"
              >
                <Mail className="h-4 w-4 text-muted-foreground" />
                Receive promotional updates (optional)
              </Label>
              <p className="text-xs text-muted-foreground">
                Get notified about new features, exclusive offers, and travel tips. You can unsubscribe anytime.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || consentMutation.isPending}
            className="w-full"
            data-testid="button-accept-consent"
          >
            {consentMutation.isPending ? "Saving..." : "Continue to ZECOHO"}
          </Button>
          {!canSubmit && (
            <p className="text-xs text-center text-muted-foreground">
              Please accept both required policies to continue
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
