import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  FileText,
  Building2,
  CreditCard,
  HelpCircle,
  Phone,
  Mail,
  Eye,
  ImagePlus,
  Edit,
  Lock,
  Zap,
  ArrowRight,
  Shield,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KycStatusResponse {
  status: "not_started" | "pending" | "verified" | "rejected";
  hasActiveApplication: boolean;
  applicationId?: string;
  userId?: string;
}

interface PropertySummary {
  id: string;
  title: string;
  city: string;
  status: string;
}

interface PreApprovalDashboardProps {
  user: {
    firstName?: string | null;
    lastName?: string | null;
    kycStatus: string;
    listingMode?: string;
  };
}

export function PreApprovalDashboard({ user }: PreApprovalDashboardProps) {
  const { data: kycStatusData, isLoading: kycLoading } = useQuery<KycStatusResponse>({
    queryKey: ["/api/kyc/status"],
  });

  const { data: properties, isLoading: propertiesLoading } = useQuery<PropertySummary[]>({
    queryKey: ["/api/owner/properties"],
  });

  const currentKycStatus = kycStatusData?.status ?? user.kycStatus;
  const isQuickListing = user.listingMode === "quick";

  const isActionRequired = currentKycStatus === "not_started" || currentKycStatus === "rejected";
  const isUnderReview = currentKycStatus === "pending";

  const getKycStepStatus = () => {
    if (currentKycStatus === "verified") return "complete";
    if (currentKycStatus === "pending") return "reviewing";
    if (currentKycStatus === "rejected") return "action_required";
    return "incomplete";
  };

  const getPropertyStepStatus = () => {
    if (properties && properties.length > 0) return "complete";
    return "incomplete";
  };

  const kycStepStatus = getKycStepStatus();
  const propertyStepStatus = getPropertyStepStatus();
  const bankDetailsAdded = false;

  const completedSteps = [
    propertyStepStatus === "complete",
    kycStepStatus === "complete",
    bankDetailsAdded,
  ].filter(Boolean).length;
  const stepsRemaining = 3 - completedSteps;

  return (
    <div className="space-y-6" data-testid="pre-approval-dashboard">
      {isActionRequired && (
        <div 
          className="flex items-center gap-3 p-4 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
          data-testid="banner-action-required"
        >
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-200">
              Action required to go live
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Please complete the highlighted steps below.
            </p>
          </div>
        </div>
      )}

      {isUnderReview && (
        <div 
          className="flex items-center gap-3 p-4 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
          data-testid="banner-under-review"
        >
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-blue-800 dark:text-blue-200">
              Your property is under review
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Our team is verifying your details. This usually takes 24–48 hours.
            </p>
          </div>
        </div>
      )}

      {isQuickListing && (
        <Card className="border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10" data-testid="upgrade-cta-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg">Quick Listing Mode</h3>
                  <Badge variant="secondary">Limited</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  You're currently in Quick Listing mode. Complete KYC verification to unlock online bookings, 
                  secure payments, and full visibility in search results.
                </p>
              </div>
              <div className="flex-shrink-0">
                <Link href="/list-property">
                  <Button data-testid="btn-upgrade-to-full">
                    <Shield className="h-4 w-4 mr-2" />
                    Complete KYC
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-primary/20">
              <p className="text-xs text-muted-foreground mb-2">Unlock with full verification:</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Online bookings
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Secure payments
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Full search visibility
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Guest messaging
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="progress-checklist">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Get Your Property Live
            {stepsRemaining > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stepsRemaining} step{stepsRemaining !== 1 ? "s" : ""} left
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div 
            className={`flex items-start gap-4 p-4 rounded-md border ${
              propertyStepStatus === "complete" 
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" 
                : "bg-muted/50"
            }`}
            data-testid="step-property-details"
          >
            <div className="flex-shrink-0 mt-0.5">
              {propertyStepStatus === "complete" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <Building2 className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">Step 1: Property Details</p>
              <p className="text-sm text-muted-foreground">
                {propertyStepStatus === "complete" 
                  ? "Property details submitted" 
                  : "Add your property information to get started"}
              </p>
            </div>
            <div className="flex-shrink-0">
              {propertyStepStatus === "complete" ? (
                <Link href="/owner/property">
                  <Button variant="outline" size="sm" data-testid="btn-view-property">
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </Link>
              ) : (
                <Link href="/list-property">
                  <Button size="sm" data-testid="btn-add-property">
                    Add Property
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div 
            className={`flex items-start gap-4 p-4 rounded-md border ${
              kycStepStatus === "complete" 
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                : kycStepStatus === "reviewing"
                ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                : kycStepStatus === "action_required"
                ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                : "bg-muted/50"
            }`}
            data-testid="step-kyc-documents"
          >
            <div className="flex-shrink-0 mt-0.5">
              {kycStepStatus === "complete" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : kycStepStatus === "reviewing" ? (
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              ) : kycStepStatus === "action_required" ? (
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <FileText className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">Step 2: KYC Documents</p>
              <p className="text-sm text-muted-foreground">
                {kycStepStatus === "complete" 
                  ? "Documents verified"
                  : kycStepStatus === "reviewing"
                  ? "Documents under review"
                  : kycStepStatus === "action_required"
                  ? "Upload required documents. PAN and property ownership proof required to go live."
                  : "Upload required documents to verify your identity"}
              </p>
            </div>
            <div className="flex-shrink-0">
              {kycStepStatus === "complete" ? (
                <Badge variant="default" className="bg-green-600">Verified</Badge>
              ) : kycStepStatus === "reviewing" ? (
                <Badge variant="secondary">Under Review</Badge>
              ) : (
                <Link href="/list-property">
                  <Button size="sm" variant={kycStepStatus === "action_required" ? "default" : "outline"} data-testid="btn-upload-documents">
                    Upload Documents
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div 
            className={`flex items-start gap-4 p-4 rounded-md border ${
              bankDetailsAdded 
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                : "bg-muted/50"
            }`}
            data-testid="step-bank-details"
          >
            <div className="flex-shrink-0 mt-0.5">
              {bankDetailsAdded ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">Step 3: Bank Details</p>
              <p className="text-sm text-muted-foreground">
                {bankDetailsAdded 
                  ? "Bank details added"
                  : "Add bank details for payouts. You'll receive payments once bookings start."}
              </p>
            </div>
            <div className="flex-shrink-0">
              {bankDetailsAdded ? (
                <Badge variant="default" className="bg-green-600">Added</Badge>
              ) : (
                <Link href="/owner/settings">
                  <Button size="sm" variant="outline" data-testid="btn-add-bank">
                    Add Bank Details
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {propertiesLoading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ) : properties && properties.length > 0 ? (
        <Card data-testid="property-card-limited">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>{properties[0].title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{properties[0].city}</p>
              </div>
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                Under Review
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/owner/property">
                <Button variant="outline" size="sm" data-testid="btn-edit-property">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Property
                </Button>
              </Link>
              <Link href="/owner/property">
                <Button variant="outline" size="sm" data-testid="btn-upload-photos">
                  <ImagePlus className="h-4 w-4 mr-2" />
                  Upload Photos
                </Button>
              </Link>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button variant="ghost" size="sm" disabled className="opacity-50" data-testid="btn-change-price-disabled">
                      <Lock className="h-4 w-4 mr-2" />
                      Change Price
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Available after approval</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button variant="ghost" size="sm" disabled className="opacity-50" data-testid="btn-view-bookings-disabled">
                      <Lock className="h-4 w-4 mr-2" />
                      View Bookings
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Available after approval</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button variant="ghost" size="sm" disabled className="opacity-50" data-testid="btn-go-live-disabled">
                      <Lock className="h-4 w-4 mr-2" />
                      Go Live
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Available after approval</TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="what-happens-next">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              What happens next?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Our team reviews your details (24–48 hrs)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Once approved, your property goes live</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>You'll start receiving booking requests</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Payments are released after guest check-in</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card data-testid="support-card">
          <CardHeader>
            <CardTitle>Need help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Our support team is here to help you get started.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="justify-start" data-testid="btn-call-support">
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
    </div>
  );
}
