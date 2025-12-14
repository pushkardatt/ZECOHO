import { useQuery, useMutation } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/OwnerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  Phone,
  Mail,
  FileText,
  User,
  Building2,
  CreditCard,
  Shield,
  Flame,
} from "lucide-react";
import type { KycRejectionDetails, KycSectionId } from "@shared/schema";

interface KycStatusResponse {
  status: "not_started" | "pending" | "verified" | "rejected";
  hasActiveApplication: boolean;
  applicationId?: string;
  userId?: string;
  rejectionDetails?: KycRejectionDetails;
}

const sectionConfig: Record<KycSectionId, { label: string; icon: typeof User }> = {
  personal: { label: "Personal Information", icon: User },
  business: { label: "Business Information", icon: Building2 },
  propertyOwnership: { label: "Property Ownership Documents", icon: FileText },
  identityProof: { label: "Identity Proof", icon: CreditCard },
  businessLicense: { label: "Business License", icon: Building2 },
  noc: { label: "NOC Documents", icon: Shield },
  safetyCertificates: { label: "Safety Certificates", icon: Flame },
};

export default function OwnerKyc() {
  const { user } = useAuth();

  const { data: kycStatus, isLoading } = useQuery<KycStatusResponse>({
    queryKey: ["/api/kyc/status"],
  });

  const currentStatus = kycStatus?.status ?? user?.kycStatus;
  const isRejected = currentStatus === "rejected";
  const isPending = currentStatus === "pending";
  const isVerified = currentStatus === "verified";
  const isNotStarted = currentStatus === "not_started";

  const rejectionDetails = kycStatus?.rejectionDetails;
  const rejectedSections = rejectionDetails?.sections || [];

  const getRejectedSectionIds = (): KycSectionId[] => {
    return rejectedSections.map(s => s.sectionId);
  };

  const isSectionRejected = (sectionId: KycSectionId): boolean => {
    return getRejectedSectionIds().includes(sectionId);
  };

  const getSectionMessage = (sectionId: KycSectionId): string | null => {
    const section = rejectedSections.find(s => s.sectionId === sectionId);
    return section?.message || null;
  };

  if (isLoading) {
    return (
      <OwnerLayout>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="space-y-6" data-testid="owner-kyc-page">
        {isRejected && (
          <>
            <div 
              className="flex items-center gap-3 p-4 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
              data-testid="kyc-rejected-banner"
            >
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-red-800 dark:text-red-200">
                  KYC Rejected — Action Required
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Your listing is not live. Please review the reasons below and resubmit documents.
                </p>
              </div>
            </div>

            <Card data-testid="rejection-reason-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Reason for Rejection
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rejectedSections.length > 0 ? (
                  <ul className="space-y-2">
                    {rejectedSections.map((section, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>
                          <strong>{sectionConfig[section.sectionId]?.label || section.sectionId}:</strong>{" "}
                          {section.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">
                    Please contact support for clarification on the rejection reason.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="document-checklist">
              <CardHeader>
                <CardTitle>Document Verification Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(Object.keys(sectionConfig) as KycSectionId[]).map((sectionId) => {
                  const config = sectionConfig[sectionId];
                  const isRejectedSection = isSectionRejected(sectionId);
                  const message = getSectionMessage(sectionId);
                  const Icon = config.icon;

                  return (
                    <div
                      key={sectionId}
                      className={`flex items-start gap-4 p-3 rounded-md border ${
                        isRejectedSection
                          ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                          : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                      }`}
                      data-testid={`section-${sectionId}`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {isRejectedSection ? (
                          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{config.label}</span>
                        </div>
                        {isRejectedSection && message && (
                          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                            {message}
                          </p>
                        )}
                      </div>
                      {isRejectedSection && (
                        <div className="flex-shrink-0">
                          <Badge variant="destructive" className="text-xs">
                            Re-upload Required
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/list-property">
                <Button className="w-full sm:w-auto" data-testid="btn-resubmit">
                  <Upload className="h-4 w-4 mr-2" />
                  Re-upload Documents & Resubmit
                </Button>
              </Link>
              <Button variant="outline" className="w-full sm:w-auto" data-testid="btn-contact-support">
                <Phone className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </>
        )}

        {isPending && (
          <>
            <div 
              className="flex items-center gap-3 p-4 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
              data-testid="kyc-pending-banner"
            >
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-blue-800 dark:text-blue-200">
                  KYC Under Review
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Our team is reviewing your documents. This usually takes 24-48 hours.
                </p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>What happens next?</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Our team reviews your documents (24-48 hrs)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Once approved, your property goes live</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>You'll start receiving booking requests</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </>
        )}

        {isVerified && (
          <div 
            className="flex items-center gap-3 p-4 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
            data-testid="kyc-verified-banner"
          >
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-green-800 dark:text-green-200">
                KYC Verified
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your identity has been verified. Your property is eligible to go live.
              </p>
            </div>
            <Link href="/owner/dashboard">
              <Button variant="outline" size="sm">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        )}

        {isNotStarted && (
          <>
            <div 
              className="flex items-center gap-3 p-4 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
              data-testid="kyc-not-started-banner"
            >
              <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-amber-800 dark:text-amber-200">
                  Complete KYC to Go Live
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Submit your documents to get your property verified and listed.
                </p>
              </div>
            </div>

            <Link href="/list-property">
              <Button data-testid="btn-start-kyc">
                <Upload className="h-4 w-4 mr-2" />
                Start KYC Process
              </Button>
            </Link>
          </>
        )}

        <Card data-testid="support-card">
          <CardHeader>
            <CardTitle>Need help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Our support team is here to help you with the verification process.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="justify-start" data-testid="btn-call-support-2">
                <Phone className="h-4 w-4 mr-2" />
                Call / WhatsApp Support
              </Button>
              <Button variant="outline" className="justify-start" data-testid="btn-raise-ticket">
                <Mail className="h-4 w-4 mr-2" />
                Raise a ticket
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </OwnerLayout>
  );
}
