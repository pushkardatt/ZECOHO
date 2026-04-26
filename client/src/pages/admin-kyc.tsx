import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Eye, FileText, Building, Home, IdCard, Shield, Flame, ExternalLink, User, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { KycApplication, KycSectionId, KycRejectionItem } from "@shared/schema";

const KYC_SECTIONS: Array<{ id: KycSectionId; label: string; icon: React.ComponentType<{ className?: string }>; reasons: string[] }> = [
  { 
    id: "personal", 
    label: "Personal Information", 
    icon: User,
    reasons: [
      "Name does not match identity documents",
      "Phone number appears invalid or unreachable",
      "Email domain not associated with business",
      "Incomplete personal details provided",
    ]
  },
  { 
    id: "business", 
    label: "Business Information", 
    icon: MapPin,
    reasons: [
      "Business address is incomplete or invalid",
      "PAN number format is incorrect",
      "GST number does not match business name",
      "Business name does not match registration documents",
      "PIN code does not match the city/state provided",
    ]
  },
  { 
    id: "propertyOwnership", 
    label: "Property Ownership Documents", 
    icon: Home,
    reasons: [
      "Property registration document is expired",
      "Ownership proof not clearly visible",
      "Property address does not match application",
      "Document appears to be edited or tampered",
      "Missing property ownership document",
    ]
  },
  { 
    id: "identityProof", 
    label: "Identity Proof Documents", 
    icon: IdCard,
    reasons: [
      "Government ID has expired",
      "Photo on ID does not match profile",
      "ID number is not clearly visible",
      "Document quality is too low to verify",
      "Name on ID does not match application",
      "Missing identity proof document",
    ]
  },
  { 
    id: "businessLicense", 
    label: "Business License Documents", 
    icon: Building,
    reasons: [
      "Trade license has expired",
      "Hotel/Lodge registration is required",
      "GST registration certificate needed",
      "Business license does not cover hospitality services",
      "License is for different business entity",
    ]
  },
  { 
    id: "noc", 
    label: "NOC Documents", 
    icon: Shield,
    reasons: [
      "NOC from property owner required",
      "Municipality NOC is expired",
      "NOC does not mention hotel/guest house operations",
      "NOC signature verification failed",
    ]
  },
  { 
    id: "safetyCertificates", 
    label: "Safety Certificate Documents", 
    icon: Flame,
    reasons: [
      "Fire safety certificate has expired",
      "Fire NOC from fire department required",
      "Electrical safety audit certificate needed",
      "Building safety compliance certificate required",
      "Safety certificates do not cover current property",
    ]
  },
];

const REVOCATION_REASONS = [
  { id: "policy_violation", label: "Policy Violation", description: "Violated platform terms and conditions or community guidelines" },
  { id: "fraudulent_activity", label: "Fraudulent Activity", description: "Engaged in fraudulent or deceptive practices" },
  { id: "fake_documents", label: "Fake/Forged Documents", description: "Submitted forged or falsified verification documents" },
  { id: "guest_complaints", label: "Multiple Guest Complaints", description: "Received multiple verified complaints from guests" },
  { id: "property_misrepresentation", label: "Property Misrepresentation", description: "Property details significantly differ from actual condition" },
  { id: "safety_concerns", label: "Safety Concerns", description: "Property fails to meet safety standards or poses risks to guests" },
  { id: "inactive_property", label: "Inactive/Abandoned Property", description: "Property has been inactive or unavailable for extended period" },
  { id: "legal_issues", label: "Legal Issues", description: "Involved in legal disputes or regulatory non-compliance" },
  { id: "other", label: "Other Reason", description: "Specify custom reason for revocation" },
];

interface KycDocument {
  url: string;
  documentType: string;
  fileName?: string;
  uploadedAt?: string;
}

interface DocumentCategoryProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  docs: KycDocument[] | null | undefined;
}

function DocumentCategory({ icon: Icon, title, docs }: DocumentCategoryProps) {
  const hasDocs = docs && Array.isArray(docs) && docs.length > 0;
  
  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">{title}</span>
        {hasDocs ? (
          <Badge variant="default" className="ml-auto">{docs.length} doc(s)</Badge>
        ) : (
          <Badge variant="secondary" className="ml-auto">Not provided</Badge>
        )}
      </div>
      
      {hasDocs && (
        <div className="space-y-2 mt-3">
          {docs.map((doc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {doc.fileName || `Document ${idx + 1}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Type: {doc.documentType?.replace(/_/g, ' ') || 'Unknown'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="ml-2 flex-shrink-0"
                data-testid={`button-view-doc-${idx}`}
              >
                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </a>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminKYC() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
  const [selectedApp, setSelectedApp] = useState<KycApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<"pending" | "verified" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRejectionSections, setSelectedRejectionSections] = useState<Record<KycSectionId, { selected: boolean; message: string; customMessage?: string }>>({
    personal: { selected: false, message: "" },
    business: { selected: false, message: "" },
    propertyOwnership: { selected: false, message: "" },
    identityProof: { selected: false, message: "" },
    businessLicense: { selected: false, message: "" },
    noc: { selected: false, message: "" },
    safetyCertificates: { selected: false, message: "" },
  });
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [selectedRevocationReasons, setSelectedRevocationReasons] = useState<Record<string, boolean>>({});
  const [customRevocationReason, setCustomRevocationReason] = useState("");

  // Post-approval subscription waive flow
  const [waiveDialogOpen, setWaiveDialogOpen] = useState(false);
  const [waiveStep, setWaiveStep] = useState<"ask" | "form">("ask");
  const [waiveOwnerId, setWaiveOwnerId] = useState<string | null>(null);
  const [waiveDays, setWaiveDays] = useState("365");
  const [waiveNote, setWaiveNote] = useState("");
  const [waivePlanId, setWaivePlanId] = useState<string>("");

  const resetRejectionForm = () => {
    setSelectedRejectionSections({
      personal: { selected: false, message: "" },
      business: { selected: false, message: "" },
      propertyOwnership: { selected: false, message: "" },
      identityProof: { selected: false, message: "" },
      businessLicense: { selected: false, message: "" },
      noc: { selected: false, message: "" },
      safetyCertificates: { selected: false, message: "" },
    });
    setShowRejectionForm(false);
    setReviewNotes("");
    setSelectedRevocationReasons({});
    setCustomRevocationReason("");
  };

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      toast({
        title: "Access Denied",
        description: "Only admins can access this page",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }, [isAuthenticated, authLoading, isAdmin, toast]);

  const { data: applications = [], isLoading, refetch } = useQuery<KycApplication[]>({
    queryKey: ["/api/admin/kyc"],
    enabled: !authLoading && isAuthenticated && isAdmin,
  });

  // Subscription plans — used to pick a plan for the post-approval waive flow.
  const { data: subscriptionPlans = [] } = useQuery<
    Array<{ id: string; name: string; tier: string; price: string }>
  >({
    queryKey: ["/api/subscription-plans"],
    enabled: isAuthenticated && isAdmin,
  });

  // Refetch when auth state changes
  useEffect(() => {
    if (!authLoading && isAuthenticated && isAdmin) {
      refetch();
    }
  }, [authLoading, isAuthenticated, isAdmin, refetch]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "verified" | "rejected" }) => {
      const payload: any = { reviewNotes };

      if (status === "rejected") {
        const rejectionItems: KycRejectionItem[] = [];
        for (const [sectionId, data] of Object.entries(selectedRejectionSections)) {
          if (data.selected) {
            const finalMessage = data.message === "custom"
              ? (data.customMessage || "Please review and correct this section")
              : (data.message || "Please review and correct this section");
            rejectionItems.push({
              sectionId: sectionId as KycSectionId,
              message: finalMessage,
            });
          }
        }
        payload.rejectionDetails = { sections: rejectionItems };
      }

      await apiRequest("PATCH", `/api/admin/kyc/${id}/${status}`, payload);
      return { status };
    },
    onSuccess: (result, variables) => {
      toast({
        title: "Status Updated",
        description: "KYC application status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc"] });

      // After approve: ask whether to also waive a subscription so the owner can go live immediately.
      if (variables.status === "verified" && selectedApp?.userId) {
        setWaiveOwnerId(selectedApp.userId);
        setWaiveStep("ask");
        setWaiveDialogOpen(true);
      }

      setSelectedApp(null);
      resetRejectionForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const createAndWaiveMutation = useMutation({
    mutationFn: async ({
      ownerId,
      planId,
      days,
      note,
    }: {
      ownerId: string;
      planId: string;
      days: number;
      note: string;
    }) => {
      await apiRequest(
        "POST",
        "/api/admin/owner-subscriptions/create-and-waive",
        { ownerId, planId, days, note },
      );
    },
    onSuccess: () => {
      toast({
        title: "Subscription activated",
        description: "Property will go live shortly.",
      });
      setWaiveDialogOpen(false);
      setWaiveOwnerId(null);
      setWaiveDays("365");
      setWaiveNote("");
      setWaivePlanId("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not waive subscription",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const revokeVerificationMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const selectedReasons = REVOCATION_REASONS.filter(r => selectedRevocationReasons[r.id]).map(r => ({
        id: r.id,
        label: r.label,
        description: r.id === "other" ? customRevocationReason : r.description,
      }));
      
      const reviewNotesText = selectedReasons.map(r => `${r.label}: ${r.description}`).join("\n");
      
      await apiRequest("PATCH", `/api/admin/kyc/${id}/revoke`, {
        reviewNotes: reviewNotesText || reviewNotes,
        revocationReasons: selectedReasons,
      });
    },
    onSuccess: () => {
      toast({
        title: "Verification Revoked",
        description: "User has been demoted to guest and their verification has been revoked.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc"] });
      setSelectedApp(null);
      resetRejectionForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke verification",
        variant: "destructive",
      });
    },
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen pb-16">
        <div className="container px-4 md:px-6 py-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  // Filter applications based on search query
  const filteredApplications = useMemo(() => {
    if (!searchQuery.trim()) return applications;
    const query = searchQuery.toLowerCase().trim();
    return applications.filter((app) =>
      app.firstName?.toLowerCase().includes(query) ||
      app.lastName?.toLowerCase().includes(query) ||
      app.businessName?.toLowerCase().includes(query) ||
      app.email?.toLowerCase().includes(query) ||
      app.city?.toLowerCase().includes(query) ||
      app.state?.toLowerCase().includes(query)
    );
  }, [applications, searchQuery]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive"; label: string }> = {
      pending: { variant: "secondary", label: "Pending Review" },
      verified: { variant: "default", label: "Verified" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen pb-16">
      <div className="container px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold mb-2 flex items-center gap-2">
              <FileText className="h-8 w-8" />
              KYC Applications
            </h1>
            <p className="text-muted-foreground">
              Review and verify property owner applications
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, business, email, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-kyc"
            />
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            onClick={() => setStatusFilter("pending")}
            data-testid="button-filter-pending"
          >
            Pending ({filteredApplications.filter(a => a.status === "pending").length})
          </Button>
          <Button
            variant={statusFilter === "verified" ? "default" : "outline"}
            onClick={() => setStatusFilter("verified")}
            data-testid="button-filter-verified"
          >
            Verified ({filteredApplications.filter(a => a.status === "verified").length})
          </Button>
          <Button
            variant={statusFilter === "rejected" ? "default" : "outline"}
            onClick={() => setStatusFilter("rejected")}
            data-testid="button-filter-rejected"
          >
            Rejected ({filteredApplications.filter(a => a.status === "rejected").length})
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Applications ({filteredApplications.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredApplications.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Owner Name</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.filter(app => app.status === statusFilter).map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">
                        {app.firstName} {app.lastName}
                      </TableCell>
                      <TableCell>{app.businessName}</TableCell>
                      <TableCell>{app.email}</TableCell>
                      <TableCell>
                        {app.city}, {app.state}
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell>
                        {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedApp(app)}
                          data-testid={`button-review-${app.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No {statusFilter} applications found
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedApp && (
          <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>KYC Application Details</DialogTitle>
                <DialogDescription>
                  Review application from {selectedApp.firstName} {selectedApp.lastName}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">First Name</Label>
                    <p className="font-medium">{selectedApp.firstName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Last Name</Label>
                    <p className="font-medium">{selectedApp.lastName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedApp.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{selectedApp.phone}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Business Name</Label>
                  <p className="font-medium">{selectedApp.businessName}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Business Address</Label>
                  <p className="font-medium">{selectedApp.streetAddress}</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground">City</Label>
                    <p className="font-medium">{selectedApp.city}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">State</Label>
                    <p className="font-medium">{selectedApp.state}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">PIN Code</Label>
                    <p className="font-medium">{selectedApp.pincode}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">PAN Number</Label>
                    <p className="font-medium">{selectedApp.panNumber}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">GST Number</Label>
                    <p className="font-medium">{selectedApp.gstNumber || "Not provided"}</p>
                  </div>
                </div>

                {/* KYC Documents Section */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Uploaded Documents
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Property Ownership Docs */}
                    <DocumentCategory
                      icon={Home}
                      title="Property Ownership Proof"
                      docs={selectedApp.propertyOwnershipDocs as any[]}
                    />
                    
                    {/* Identity Proof Docs */}
                    <DocumentCategory
                      icon={IdCard}
                      title="Owner Identity Proof"
                      docs={selectedApp.identityProofDocs as any[]}
                    />
                    
                    {/* Business License Docs */}
                    <DocumentCategory
                      icon={Building}
                      title="Business/Hotel License"
                      docs={selectedApp.businessLicenseDocs as any[]}
                    />
                    
                    {/* NOC Docs */}
                    <DocumentCategory
                      icon={Shield}
                      title="NOC (No Objection Certificate)"
                      docs={selectedApp.nocDocs as any[]}
                    />
                    
                    {/* Safety Certificate Docs */}
                    <DocumentCategory
                      icon={Flame}
                      title="Safety & Compliance Certificates"
                      docs={selectedApp.safetyCertificateDocs as any[]}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedApp.status)}</div>
                </div>

                {selectedApp.status === "pending" && !showRejectionForm && (
                  <div>
                    <Label htmlFor="review-notes">Review Notes (Optional)</Label>
                    <Textarea
                      id="review-notes"
                      placeholder="Add any notes about this application..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={3}
                      data-testid="input-review-notes"
                    />
                  </div>
                )}

                {selectedApp.status === "pending" && showRejectionForm && (
                  <div className="border-t pt-4 mt-4 space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg flex items-center gap-2 mb-3">
                        <XCircle className="h-5 w-5 text-destructive" />
                        Select Sections Needing Correction
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Choose the specific sections that need to be fixed and select a reason. The owner will only need to update the selected sections.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      {KYC_SECTIONS.map((section) => {
                        const Icon = section.icon;
                        return (
                          <div key={section.id} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id={`section-${section.id}`}
                                checked={selectedRejectionSections[section.id].selected}
                                onCheckedChange={(checked) => {
                                  setSelectedRejectionSections(prev => ({
                                    ...prev,
                                    [section.id]: { ...prev[section.id], selected: !!checked, message: "" }
                                  }));
                                }}
                                data-testid={`checkbox-section-${section.id}`}
                              />
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <label htmlFor={`section-${section.id}`} className="font-medium cursor-pointer flex-1">
                                {section.label}
                              </label>
                            </div>
                            
                            {selectedRejectionSections[section.id].selected && (
                              <div className="mt-2 space-y-2">
                                <Select
                                  value={selectedRejectionSections[section.id].message}
                                  onValueChange={(value) => {
                                    setSelectedRejectionSections(prev => ({
                                      ...prev,
                                      [section.id]: { ...prev[section.id], message: value }
                                    }));
                                  }}
                                >
                                  <SelectTrigger data-testid={`select-reason-${section.id}`}>
                                    <SelectValue placeholder="Select a reason..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {section.reasons.map((reason) => (
                                      <SelectItem key={reason} value={reason}>
                                        {reason}
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="custom">Other (specify below)</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                {selectedRejectionSections[section.id].message === "custom" && (
                                  <Textarea
                                    placeholder={`Describe what needs to be fixed in ${section.label}...`}
                                    value={selectedRejectionSections[section.id].customMessage || ""}
                                    onChange={(e) => {
                                      setSelectedRejectionSections(prev => ({
                                        ...prev,
                                        [section.id]: { ...prev[section.id], customMessage: e.target.value }
                                      }));
                                    }}
                                    rows={2}
                                    data-testid={`input-custom-reason-${section.id}`}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div>
                      <Label htmlFor="general-notes">Additional Notes (Optional)</Label>
                      <Textarea
                        id="general-notes"
                        placeholder="Any additional feedback for the applicant..."
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={2}
                        data-testid="input-rejection-notes"
                      />
                    </div>
                  </div>
                )}

                {selectedApp.reviewNotes && (
                  <div>
                    <Label className="text-muted-foreground">Admin Notes</Label>
                    <p className="text-sm">{selectedApp.reviewNotes}</p>
                  </div>
                )}
              </div>

              {selectedApp.status === "pending" && !showRejectionForm && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedApp(null)}
                    data-testid="button-cancel-review"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectionForm(true)}
                    data-testid="button-start-reject"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => updateStatusMutation.mutate({ id: selectedApp.id, status: "verified" })}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-approve"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </DialogFooter>
              )}

              {selectedApp.status === "pending" && showRejectionForm && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetRejectionForm();
                    }}
                    data-testid="button-cancel-rejection"
                  >
                    Back
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const hasSelectedSections = Object.values(selectedRejectionSections).some(s => s.selected);
                      if (!hasSelectedSections) {
                        toast({
                          title: "Select at least one section",
                          description: "Please select at least one section that needs correction.",
                          variant: "destructive",
                        });
                        return;
                      }
                      updateStatusMutation.mutate({ id: selectedApp.id, status: "rejected" });
                    }}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-confirm-reject"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Confirm Rejection
                  </Button>
                </DialogFooter>
              )}

              {selectedApp.status === "verified" && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Select Reason(s) for Revocation</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Choose one or more reasons why this verification is being revoked.
                    </p>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto border rounded-lg p-3">
                      {REVOCATION_REASONS.map((reason) => (
                        <div key={reason.id} className="flex items-start gap-3 p-2 rounded-md hover-elevate">
                          <Checkbox
                            id={`revoke-${reason.id}`}
                            checked={selectedRevocationReasons[reason.id] || false}
                            onCheckedChange={(checked) => {
                              setSelectedRevocationReasons(prev => ({
                                ...prev,
                                [reason.id]: checked === true
                              }));
                            }}
                            data-testid={`checkbox-revoke-${reason.id}`}
                          />
                          <div className="flex-1">
                            <Label 
                              htmlFor={`revoke-${reason.id}`} 
                              className="font-medium cursor-pointer"
                            >
                              {reason.label}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {reason.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {selectedRevocationReasons["other"] && (
                      <div className="mt-3">
                        <Label htmlFor="custom-revoke-reason">Specify Custom Reason</Label>
                        <Textarea
                          id="custom-revoke-reason"
                          placeholder="Enter the specific reason for revocation..."
                          value={customRevocationReason}
                          onChange={(e) => setCustomRevocationReason(e.target.value)}
                          rows={2}
                          className="mt-1"
                          data-testid="input-custom-revoke-reason"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="revoke-notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="revoke-notes"
                      placeholder="Add any additional context or notes..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={2}
                      data-testid="input-revoke-notes"
                    />
                  </div>
                  
                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedApp(null);
                        resetRejectionForm();
                      }}
                      data-testid="button-cancel-revoke"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        const hasSelectedReasons = Object.values(selectedRevocationReasons).some(v => v);
                        if (!hasSelectedReasons) {
                          toast({
                            title: "Select at least one reason",
                            description: "Please select at least one reason for revocation.",
                            variant: "destructive",
                          });
                          return;
                        }
                        if (selectedRevocationReasons["other"] && !customRevocationReason.trim()) {
                          toast({
                            title: "Custom reason required",
                            description: "Please enter a custom reason when 'Other Reason' is selected.",
                            variant: "destructive",
                          });
                          return;
                        }
                        revokeVerificationMutation.mutate({ id: selectedApp.id });
                      }}
                      disabled={revokeVerificationMutation.isPending}
                      data-testid="button-revoke"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Revoke Verification
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {selectedApp.status === "rejected" && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reapprove-notes">Notes for Re-approval</Label>
                    <Textarea
                      id="reapprove-notes"
                      placeholder="Add notes for why this application is being re-approved..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={3}
                      data-testid="input-reapprove-notes"
                    />
                  </div>
                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedApp(null)}
                      data-testid="button-cancel-reapprove"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => updateStatusMutation.mutate({ id: selectedApp.id, status: "verified" })}
                      disabled={updateStatusMutation.isPending}
                      data-testid="button-reapprove"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Re-approve & Verify
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}

        <Dialog
          open={waiveDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setWaiveDialogOpen(false);
              setWaiveStep("ask");
              setWaiveOwnerId(null);
              setWaiveDays("365");
              setWaiveNote("");
              setWaivePlanId("");
            }
          }}
        >
          <DialogContent data-testid="dialog-post-kyc-waive">
            {waiveStep === "ask" && (
              <>
                <DialogHeader>
                  <DialogTitle>Activate a subscription too?</DialogTitle>
                  <DialogDescription>
                    KYC is approved. Would you like to also activate a
                    subscription for this owner so their property can go live
                    immediately?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setWaiveDialogOpen(false)}
                    data-testid="button-skip-waive"
                  >
                    Skip — Owner will subscribe themselves
                  </Button>
                  <Button
                    onClick={() => {
                      const firstActivePlan = subscriptionPlans[0];
                      if (firstActivePlan) setWaivePlanId(firstActivePlan.id);
                      setWaiveStep("form");
                    }}
                    data-testid="button-open-waive-form"
                  >
                    Waive subscription fee
                  </Button>
                </DialogFooter>
              </>
            )}

            {waiveStep === "form" && (
              <>
                <DialogHeader>
                  <DialogTitle>Waive subscription fee</DialogTitle>
                  <DialogDescription>
                    Creates an active, free subscription. Pending properties
                    auto-publish if KYC is verified.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="waive-plan">Plan</Label>
                    <Select
                      value={waivePlanId}
                      onValueChange={setWaivePlanId}
                    >
                      <SelectTrigger
                        id="waive-plan"
                        data-testid="select-waive-plan"
                      >
                        <SelectValue placeholder="Select a plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {subscriptionPlans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.tier})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="waive-days">Duration in days</Label>
                    <Input
                      id="waive-days"
                      type="number"
                      min={1}
                      max={3650}
                      value={waiveDays}
                      onChange={(e) => setWaiveDays(e.target.value)}
                      data-testid="input-waive-days"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="waive-note">Note (optional)</Label>
                    <Textarea
                      id="waive-note"
                      value={waiveNote}
                      onChange={(e) => setWaiveNote(e.target.value)}
                      placeholder="Reason for waiving the fee"
                      data-testid="textarea-waive-note"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setWaiveStep("ask")}
                    data-testid="button-back-waive-form"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => {
                      const days = parseInt(waiveDays, 10);
                      if (!waiveOwnerId || !waivePlanId || !days) return;
                      createAndWaiveMutation.mutate({
                        ownerId: waiveOwnerId,
                        planId: waivePlanId,
                        days,
                        note: waiveNote,
                      });
                    }}
                    disabled={
                      !waiveOwnerId ||
                      !waivePlanId ||
                      !waiveDays ||
                      createAndWaiveMutation.isPending
                    }
                    data-testid="button-confirm-waive"
                  >
                    {createAndWaiveMutation.isPending
                      ? "Waiving..."
                      : "Confirm & Waive"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
