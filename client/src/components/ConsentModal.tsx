import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Shield, Mail, AlertCircle } from "lucide-react";

interface ConsentModalProps {
  open: boolean;
  userName?: string;
  isVersionUpdate?: boolean;
}

export function ConsentModal({
  open,
  userName,
  isVersionUpdate = false,
}: ConsentModalProps) {
  const [allAccepted, setAllAccepted] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: policyVersions } = useQuery<{
    termsVersion: number | null;
    privacyVersion: number | null;
  }>({
    queryKey: ["/api/policies/versions/current"],
    enabled: open,
  });

  const consentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/consent-v2", {
        consentCommunication: true,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: isVersionUpdate ? "Policies Accepted" : "Welcome to ZECOHO!",
        description: isVersionUpdate
          ? "Thank you for reviewing and accepting the updated policies."
          : "Your preferences have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description:
          error.message || "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!allAccepted) {
      toast({
        title: "Required",
        description:
          "Please accept all policies and communications to continue.",
        variant: "destructive",
      });
      return;
    }
    consentMutation.mutate();
  };

  const canSubmit = allAccepted;

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2 text-xl"
            data-testid="text-consent-title"
          >
            {isVersionUpdate ? (
              <>
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Policy Update
              </>
            ) : (
              <>
                <Shield className="h-5 w-5 text-primary" />
                Welcome{userName ? `, ${userName}` : ""}!
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isVersionUpdate
              ? "We've updated our policies. Please review and accept them to continue using ZECOHO."
              : "Before you start exploring, please review and accept our policies."}
          </DialogDescription>
        </DialogHeader>

        {isVersionUpdate && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
            <p className="text-amber-800 dark:text-amber-200">
              Our policies have been updated. Please take a moment to review the
              changes before continuing.
            </p>
          </div>
        )}

        <div className="space-y-4 py-4">
          <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/30">
            <Checkbox
              id="all-policies"
              checked={allAccepted}
              onCheckedChange={(checked) => setAllAccepted(checked === true)}
              data-testid="checkbox-all-policies"
            />
            <div className="space-y-2 leading-none">
              <Label
                htmlFor="all-policies"
                className="text-sm font-medium cursor-pointer flex items-center gap-2"
              >
                <Shield className="h-4 w-4 text-muted-foreground" />I accept all
                policies and communications
                <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                By checking this box, you agree to:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1.5 pl-4 list-disc">
                <li>
                  <Link
                    href="/terms"
                    className="text-primary hover:underline"
                    data-testid="link-terms"
                  >
                    Terms & Conditions
                  </Link>
                  {policyVersions?.termsVersion && (
                    <span className="ml-1">
                      (v{policyVersions.termsVersion})
                    </span>
                  )}{" "}
                  - governing the use of ZECOHO platform
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-primary hover:underline"
                    data-testid="link-privacy"
                  >
                    Privacy Policy
                  </Link>
                  {policyVersions?.privacyVersion && (
                    <span className="ml-1">
                      (v{policyVersions.privacyVersion})
                    </span>
                  )}{" "}
                  - how we collect, use, and protect your data
                </li>
                <li>
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Promotional communications - receive updates about new
                    features, exclusive offers, and travel tips
                  </span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground pt-1">
                You can unsubscribe from promotional emails anytime via account
                settings.
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
            {consentMutation.isPending
              ? "Saving..."
              : isVersionUpdate
                ? "Accept & Continue"
                : "Continue to ZECOHO"}
          </Button>
          {!canSubmit && (
            <p className="text-xs text-center text-muted-foreground">
              Please accept all policies and communications to continue
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
