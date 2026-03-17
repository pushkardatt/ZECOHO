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
import { FileCheck, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OwnerAgreementConsentModalProps {
  open: boolean;
  userName?: string;
  isVersionUpdate?: boolean;
}

export function OwnerAgreementConsentModal({
  open,
  userName,
  isVersionUpdate = false,
}: OwnerAgreementConsentModalProps) {
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: agreementVersion } = useQuery<{ version: number | null }>({
    queryKey: ["/api/owner-agreement/version/current"],
    enabled: open,
  });

  const { data: agreement, isLoading: isLoadingAgreement } = useQuery<{
    title: string;
    content: string;
    version: number;
  }>({
    queryKey: ["/api/owner-agreement"],
    enabled: open,
  });

  const consentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/auth/owner-agreement-consent",
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: isVersionUpdate
          ? "Agreement Accepted"
          : "Welcome to ZECOHO Owners!",
        description: isVersionUpdate
          ? "Thank you for reviewing and accepting the updated Owner Agreement."
          : "You can now list and manage your properties.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description:
          error.message || "Failed to accept agreement. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!agreementAccepted) {
      toast({
        title: "Required",
        description: "Please accept the Property Owner Agreement to continue.",
        variant: "destructive",
      });
      return;
    }
    consentMutation.mutate();
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle
            className="flex items-center gap-2 text-xl"
            data-testid="text-owner-agreement-title"
          >
            {isVersionUpdate ? (
              <>
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Owner Agreement Update
              </>
            ) : (
              <>
                <FileCheck className="h-5 w-5 text-primary" />
                Property Owner Agreement
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isVersionUpdate
              ? "We've updated the Property Owner Agreement. Please review and accept to continue managing your properties."
              : `Welcome${userName ? `, ${userName}` : ""}! Before you can list and manage properties, please review and accept our Owner Agreement.`}
          </DialogDescription>
        </DialogHeader>

        {isVersionUpdate && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm flex-shrink-0">
            <p className="text-amber-800 dark:text-amber-200">
              The Owner Agreement has been updated. Please review the changes
              before continuing.
            </p>
          </div>
        )}

        {isLoadingAgreement ? (
          <div className="flex-1 overflow-hidden border rounded-lg flex items-center justify-center h-[250px]">
            <div className="text-center text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm">Loading agreement...</p>
            </div>
          </div>
        ) : agreement ? (
          <div className="flex-1 overflow-hidden border rounded-lg">
            <div className="bg-muted/30 px-4 py-2 border-b flex items-center justify-between">
              <span className="text-sm font-medium">{agreement.title}</span>
              <span className="text-xs text-muted-foreground">
                Version {agreement.version}
              </span>
            </div>
            <ScrollArea className="h-[250px]">
              <div className="p-4 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {agreement.content}
              </div>
            </ScrollArea>
          </div>
        ) : null}

        <div className="space-y-4 pt-4 flex-shrink-0">
          <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/30">
            <Checkbox
              id="owner-agreement"
              checked={agreementAccepted}
              onCheckedChange={(checked) =>
                setAgreementAccepted(checked === true)
              }
              data-testid="checkbox-owner-agreement"
            />
            <div className="space-y-1.5 leading-none">
              <Label
                htmlFor="owner-agreement"
                className="text-sm font-medium cursor-pointer flex items-center gap-2"
              >
                <FileCheck className="h-4 w-4 text-muted-foreground" />I accept
                the Property Owner Agreement
                <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                By checking this box, you agree to the{" "}
                <Link
                  href="/owner-agreement"
                  className="text-primary hover:underline"
                  target="_blank"
                  data-testid="link-owner-agreement"
                >
                  Property Owner Agreement
                </Link>
                {agreementVersion?.version && (
                  <span className="ml-1">
                    (Version {agreementVersion.version})
                  </span>
                )}{" "}
                governing your relationship with ZECOHO as a property
                owner/hotelier.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              onClick={handleSubmit}
              disabled={
                !agreementAccepted ||
                consentMutation.isPending ||
                isLoadingAgreement ||
                !agreement
              }
              className="min-w-[120px]"
              data-testid="button-accept-owner-agreement"
            >
              {consentMutation.isPending ? "Accepting..." : "Accept & Continue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
