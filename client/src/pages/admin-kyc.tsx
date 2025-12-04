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
import { CheckCircle, XCircle, Eye, FileText, Building, Home, IdCard, Shield, Flame, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { KycApplication } from "@shared/schema";

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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedApp, setSelectedApp] = useState<KycApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<"pending" | "verified" | "rejected">("pending");

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.userRole !== "admin")) {
      toast({
        title: "Access Denied",
        description: "Only admins can access this page",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }, [isAuthenticated, authLoading, user, toast]);

  const { data: applications = [], isLoading, refetch } = useQuery<KycApplication[]>({
    queryKey: ["/api/admin/kyc"],
    enabled: !authLoading && isAuthenticated && user?.userRole === "admin",
  });

  // Refetch when auth state changes
  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.userRole === "admin") {
      refetch();
    }
  }, [authLoading, isAuthenticated, user?.userRole, refetch]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "verified" | "rejected" }) => {
      await apiRequest("PATCH", `/api/admin/kyc/${id}/${status}`, {
        reviewNotes,
      });
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "KYC application status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc"] });
      setSelectedApp(null);
      setReviewNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const revokeVerificationMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await apiRequest("PATCH", `/api/admin/kyc/${id}/revoke`, {
        reviewNotes,
      });
    },
    onSuccess: () => {
      toast({
        title: "Verification Revoked",
        description: "User has been demoted to guest and their verification has been revoked.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc"] });
      setSelectedApp(null);
      setReviewNotes("");
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

        <div className="flex gap-2 mb-6">
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            onClick={() => setStatusFilter("pending")}
            data-testid="button-filter-pending"
          >
            Pending ({applications.filter(a => a.status === "pending").length})
          </Button>
          <Button
            variant={statusFilter === "verified" ? "default" : "outline"}
            onClick={() => setStatusFilter("verified")}
            data-testid="button-filter-verified"
          >
            Verified ({applications.filter(a => a.status === "verified").length})
          </Button>
          <Button
            variant={statusFilter === "rejected" ? "default" : "outline"}
            onClick={() => setStatusFilter("rejected")}
            data-testid="button-filter-rejected"
          >
            Rejected ({applications.filter(a => a.status === "rejected").length})
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Applications ({applications.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : applications.length > 0 ? (
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
                  {applications.filter(app => app.status === statusFilter).map((app) => (
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
                  <p className="font-medium">{selectedApp.businessAddress}</p>
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

                {selectedApp.status === "pending" && (
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

                {selectedApp.reviewNotes && (
                  <div>
                    <Label className="text-muted-foreground">Admin Notes</Label>
                    <p className="text-sm">{selectedApp.reviewNotes}</p>
                  </div>
                )}
              </div>

              {selectedApp.status === "pending" && (
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
                    onClick={() => updateStatusMutation.mutate({ id: selectedApp.id, status: "rejected" })}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-reject"
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

              {selectedApp.status === "verified" && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="revoke-notes">Reason for Revocation</Label>
                    <Textarea
                      id="revoke-notes"
                      placeholder="Enter reason for revoking verification (e.g., policy violation, fraudulent activity)..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={3}
                      data-testid="input-revoke-notes"
                    />
                  </div>
                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedApp(null)}
                      data-testid="button-cancel-revoke"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => revokeVerificationMutation.mutate({ id: selectedApp.id })}
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
      </div>
    </div>
  );
}
