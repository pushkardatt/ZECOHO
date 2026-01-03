import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { CheckCircle, XCircle, Trash2, Eye, MapPin, AlertCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Property } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const REJECTION_REASONS = [
  { id: "incomplete_info", label: "Incomplete property information", description: "Missing essential details like description, amenities, or pricing" },
  { id: "poor_images", label: "Poor quality or insufficient images", description: "Images are blurry, low resolution, or don't adequately showcase the property" },
  { id: "inaccurate_info", label: "Inaccurate or misleading information", description: "Property details don't match actual conditions or are exaggerated" },
  { id: "policy_violation", label: "Policy violation", description: "Listing violates platform terms of service or community guidelines" },
  { id: "duplicate_listing", label: "Duplicate listing", description: "This property already exists as another listing on the platform" },
  { id: "unverified_ownership", label: "Ownership not verified", description: "Unable to confirm property ownership or authorization to list" },
  { id: "custom", label: "Other reason", description: "Specify a custom reason for rejection" },
];

const REVOCATION_REASONS = [
  { id: "guest_complaints", label: "Multiple guest complaints", description: "Received verified complaints from multiple guests" },
  { id: "safety_concerns", label: "Safety concerns", description: "Property has safety issues that need to be addressed" },
  { id: "policy_violation", label: "Policy violation", description: "Owner or property violated platform terms of service" },
  { id: "fraudulent_activity", label: "Fraudulent activity", description: "Evidence of fraudulent behavior or misrepresentation" },
  { id: "inaccurate_listing", label: "Inaccurate listing information", description: "Property doesn't match the listing description" },
  { id: "non_responsive", label: "Non-responsive owner", description: "Owner is not responding to guest inquiries or complaints" },
  { id: "custom", label: "Other reason", description: "Specify a custom reason for revocation" },
];

export default function AdminProperties() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  
  const [searchQuery, setSearchQuery] = useState("");
  
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [propertyToApprove, setPropertyToApprove] = useState<Property | null>(null);
  const [approveNotes, setApproveNotes] = useState("");
  
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [propertyToReject, setPropertyToReject] = useState<Property | null>(null);
  const [selectedReasonId, setSelectedReasonId] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isRevocation, setIsRevocation] = useState(false);

  const resetRejectForm = () => {
    setSelectedReasonId("");
    setCustomReason("");
    setPropertyToReject(null);
    setIsRevocation(false);
    setRejectDialogOpen(false);
  };

  const getRejectNotes = () => {
    const reasons = isRevocation ? REVOCATION_REASONS : REJECTION_REASONS;
    const selectedReason = reasons.find(r => r.id === selectedReasonId);
    if (!selectedReason) return "";
    
    if (selectedReasonId === "custom") {
      return customReason.trim();
    }
    return `${selectedReason.label}: ${selectedReason.description}`;
  };

  // Check if user is admin
  if (user?.userRole !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            You need admin privileges to access this panel.
          </p>
          <Button onClick={() => setLocation("/")} data-testid="button-back-home">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/admin/properties"],
  });

  // Fetch pending deactivation requests
  const { data: deactivationRequests = [], isLoading: isLoadingDeactivationRequests } = useQuery<any[]>({
    queryKey: ["/api/admin/deactivation-requests"],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ propertyId, notes }: { propertyId: string; notes: string }) => {
      return apiRequest("PATCH", `/api/admin/properties/${propertyId}/approve`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/properties"] });
      toast({ title: "Success", description: "Property approved successfully" });
      setApproveDialogOpen(false);
      setPropertyToApprove(null);
      setApproveNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ propertyId, notes }: { propertyId: string; notes: string }) => {
      return apiRequest("PATCH", `/api/admin/properties/${propertyId}/reject`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/properties"] });
      toast({ 
        title: "Success", 
        description: isRevocation ? "Property verification revoked" : "Property rejected successfully" 
      });
      resetRejectForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      return apiRequest("DELETE", `/api/admin/properties/${propertyId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/properties"] });
      toast({ title: "Success", description: "Property deleted successfully" });
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Deactivation request state and mutations
  const [deactivationDialogOpen, setDeactivationDialogOpen] = useState(false);
  const [selectedDeactivationRequest, setSelectedDeactivationRequest] = useState<any | null>(null);
  const [deactivationAction, setDeactivationAction] = useState<"approve" | "reject">("approve");
  const [deactivationAdminNotes, setDeactivationAdminNotes] = useState("");

  const approveDeactivationMutation = useMutation({
    mutationFn: async ({ requestId, adminNotes }: { requestId: string; adminNotes?: string }) => {
      return apiRequest("PATCH", `/api/admin/deactivation-requests/${requestId}/approve`, { adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deactivation-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/properties"] });
      const requestType = selectedDeactivationRequest?.requestType;
      const description = requestType === "reactivate" ? "Property reactivated successfully" :
                          requestType === "delete" ? "Property deleted successfully" :
                          "Property deactivated successfully";
      toast({ title: "Success", description });
      setDeactivationDialogOpen(false);
      setSelectedDeactivationRequest(null);
      setDeactivationAdminNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectDeactivationMutation = useMutation({
    mutationFn: async ({ requestId, adminNotes }: { requestId: string; adminNotes: string }) => {
      return apiRequest("PATCH", `/api/admin/deactivation-requests/${requestId}/reject`, { adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deactivation-requests"] });
      toast({ title: "Success", description: "Deactivation request rejected" });
      setDeactivationDialogOpen(false);
      setSelectedDeactivationRequest(null);
      setDeactivationAdminNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
      published: { variant: "default", label: "Published" },
      draft: { variant: "secondary", label: "Draft" },
      pending: { variant: "outline", label: "Pending Review" },
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Filter properties based on search query
  const filteredProperties = useMemo(() => {
    if (!searchQuery.trim()) return properties;
    const query = searchQuery.toLowerCase().trim();
    return properties.filter((p) =>
      p.title?.toLowerCase().includes(query) ||
      p.destination?.toLowerCase().includes(query) ||
      p.propCity?.toLowerCase().includes(query) ||
      p.ownerId?.toLowerCase().includes(query)
    );
  }, [properties, searchQuery]);

  const pendingProperties = filteredProperties.filter((p) => p.status === "pending");
  const publishedProperties = filteredProperties.filter((p) => p.status === "published");
  const draftProperties = filteredProperties.filter((p) => p.status === "draft");

  const renderPropertyCards = (props: Property[]) => {
    if (props.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No properties to display</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {props.map((property) => {
          const mainImage = property.images?.[0] || "/placeholder-property.jpg";
          return (
            <Card key={property.id} className="overflow-hidden">
              <div className="relative aspect-[4/3]">
                <img
                  src={mainImage}
                  alt={property.title}
                  className="w-full h-full object-cover"
                  data-testid={`img-property-${property.id}`}
                />
                <div className="absolute top-3 right-3">
                  {getStatusBadge(property.status)}
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2 line-clamp-1" data-testid={`text-title-${property.id}`}>
                  {property.title}
                </h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4" />
                  <span className="line-clamp-1">{property.destination}</span>
                </div>
                <div className="mb-4 text-sm text-muted-foreground">
                  Owner ID: <span className="font-mono">{property.ownerId.slice(0, 8)}...</span>
                </div>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-lg font-semibold">
                    ₹{Number(property.pricePerNight).toLocaleString('en-IN')}
                  </span>
                  <span className="text-sm text-muted-foreground">/ night</span>
                </div>

                {property.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1"
                      onClick={() => {
                        setPropertyToApprove(property);
                        setApproveNotes("");
                        setApproveDialogOpen(true);
                      }}
                      disabled={approveMutation.isPending}
                      data-testid={`button-approve-${property.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setPropertyToReject(property);
                        setSelectedReasonId("");
                        setCustomReason("");
                        setIsRevocation(false);
                        setRejectDialogOpen(true);
                      }}
                      disabled={rejectMutation.isPending}
                      data-testid={`button-reject-${property.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}

                {property.status === "published" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-destructive hover:text-destructive"
                      onClick={() => {
                        setPropertyToReject(property);
                        setSelectedReasonId("");
                        setCustomReason("");
                        setIsRevocation(true);
                        setRejectDialogOpen(true);
                      }}
                      disabled={rejectMutation.isPending}
                      data-testid={`button-disapprove-${property.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Revoke Verification
                    </Button>
                  </div>
                )}

                {property.status === "draft" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1"
                      onClick={() => {
                        setPropertyToApprove(property);
                        setApproveNotes("");
                        setApproveDialogOpen(true);
                      }}
                      disabled={approveMutation.isPending}
                      data-testid={`button-reapprove-${property.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Re-approve
                    </Button>
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <Button asChild variant="outline" size="sm" className="flex-1" data-testid={`button-view-${property.id}`}>
                    <a href={`/properties/${property.id}`} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive flex-1"
                    onClick={() => {
                      setPropertyToDelete(property.id);
                      setDeleteDialogOpen(true);
                    }}
                    data-testid={`button-delete-${property.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-16">
      <div className="container px-4 md:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage and review property listings
          </p>
        </div>

        {/* Search Input */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by property name, city, or owner ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-properties"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending Review ({pendingProperties.length})
            </TabsTrigger>
            <TabsTrigger value="published" data-testid="tab-published">
              Published ({publishedProperties.length})
            </TabsTrigger>
            <TabsTrigger value="draft" data-testid="tab-draft">
              Draft ({draftProperties.length})
            </TabsTrigger>
            <TabsTrigger value="deactivation-requests" data-testid="tab-deactivation-requests">
              Property Requests ({deactivationRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="aspect-[4/3]" />
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-8 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              renderPropertyCards(pendingProperties)
            )}
          </TabsContent>

          <TabsContent value="published" className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="aspect-[4/3]" />
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-8 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              renderPropertyCards(publishedProperties)
            )}
          </TabsContent>

          <TabsContent value="draft" className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="aspect-[4/3]" />
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-8 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              renderPropertyCards(draftProperties)
            )}
          </TabsContent>

          <TabsContent value="deactivation-requests" className="mt-6">
            {isLoadingDeactivationRequests ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : deactivationRequests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No pending property requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {deactivationRequests.map((request) => (
                  <Card 
                    key={request.id} 
                    className={request.requestType === "reactivate" 
                      ? "border-green-200 bg-green-50/50 dark:bg-green-950/20"
                      : "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20"
                    }
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{request.property?.title}</h3>
                            <Badge 
                              variant={
                                request.requestType === "delete" ? "destructive" : 
                                request.requestType === "reactivate" ? "default" : 
                                "secondary"
                              }
                            >
                              {request.requestType === "delete" ? "Delete Request" : 
                               request.requestType === "reactivate" ? "Reactivation Request" :
                               "Deactivation Request"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            <span className="font-medium">Owner:</span> {request.owner?.firstName} {request.owner?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground mb-2">
                            <span className="font-medium">Submitted:</span> {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                          <div className="bg-background/80 p-3 rounded-lg mt-3">
                            <p className="text-sm font-medium mb-1">Reason:</p>
                            <p className="text-sm text-muted-foreground">{request.reason}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedDeactivationRequest(request);
                              setDeactivationAction("approve");
                              setDeactivationDialogOpen(true);
                            }}
                            data-testid={`approve-deactivation-${request.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedDeactivationRequest(request);
                              setDeactivationAction("reject");
                              setDeactivationDialogOpen(true);
                            }}
                            data-testid={`reject-deactivation-${request.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setLocation(`/property/${request.propertyId}`)}
                            data-testid={`view-property-${request.propertyId}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={deactivationDialogOpen} onOpenChange={setDeactivationDialogOpen}>
        <DialogContent data-testid="dialog-deactivation-request">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {deactivationAction === "approve" ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Approve {selectedDeactivationRequest?.requestType === "delete" ? "Deletion" : 
                           selectedDeactivationRequest?.requestType === "reactivate" ? "Reactivation" : 
                           "Deactivation"} Request
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Reject {selectedDeactivationRequest?.requestType === "delete" ? "Deletion" : 
                          selectedDeactivationRequest?.requestType === "reactivate" ? "Reactivation" : 
                          "Deactivation"} Request
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {deactivationAction === "approve" 
                ? `This will ${selectedDeactivationRequest?.requestType === "delete" ? "permanently delete" : 
                              selectedDeactivationRequest?.requestType === "reactivate" ? "reactivate and publish" : 
                              "deactivate"} "${selectedDeactivationRequest?.property?.title}".`
                : "Please provide a reason for rejecting this request."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium mb-1">Owner's Reason:</p>
              <p className="text-sm text-muted-foreground">{selectedDeactivationRequest?.reason}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deactivation-notes">
                {deactivationAction === "approve" ? "Admin Notes (Optional)" : "Rejection Reason (Required)"}
              </Label>
              <Textarea
                id="deactivation-notes"
                placeholder={deactivationAction === "approve" ? "Add any notes..." : "Please explain why this request is being rejected..."}
                value={deactivationAdminNotes}
                onChange={(e) => setDeactivationAdminNotes(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-deactivation-admin-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeactivationDialogOpen(false);
                setSelectedDeactivationRequest(null);
                setDeactivationAdminNotes("");
              }}
              data-testid="button-cancel-deactivation-action"
            >
              Cancel
            </Button>
            {deactivationAction === "approve" ? (
              <Button
                variant={selectedDeactivationRequest?.requestType === "reactivate" ? "default" : "destructive"}
                onClick={() => {
                  if (selectedDeactivationRequest) {
                    approveDeactivationMutation.mutate({
                      requestId: selectedDeactivationRequest.id,
                      adminNotes: deactivationAdminNotes || undefined,
                    });
                  }
                }}
                disabled={approveDeactivationMutation.isPending}
                data-testid="button-confirm-approve-deactivation"
              >
                {approveDeactivationMutation.isPending ? "Processing..." : 
                 `Approve ${selectedDeactivationRequest?.requestType === "delete" ? "Deletion" : 
                           selectedDeactivationRequest?.requestType === "reactivate" ? "Reactivation" : 
                           "Deactivation"}`}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  if (selectedDeactivationRequest && deactivationAdminNotes.trim()) {
                    rejectDeactivationMutation.mutate({
                      requestId: selectedDeactivationRequest.id,
                      adminNotes: deactivationAdminNotes,
                    });
                  }
                }}
                disabled={!deactivationAdminNotes.trim() || rejectDeactivationMutation.isPending}
                data-testid="button-confirm-reject-deactivation"
              >
                {rejectDeactivationMutation.isPending ? "Processing..." : "Reject Request"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete-property">
          <DialogHeader>
            <DialogTitle>Delete Property</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this property? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => propertyToDelete && deleteMutation.mutate(propertyToDelete)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent data-testid="dialog-approve-property">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Approve Property
            </DialogTitle>
            <DialogDescription>
              You are about to verify and publish "{propertyToApprove?.title}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approve-notes">Verification Notes (Optional)</Label>
              <Textarea
                id="approve-notes"
                placeholder="Add any notes about this approval (e.g., verification details, comments)..."
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                className="min-h-[100px]"
                data-testid="textarea-approve-notes"
              />
              <p className="text-xs text-muted-foreground">
                These notes will be visible to the property owner.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setApproveDialogOpen(false)} 
              data-testid="button-cancel-approve"
            >
              Cancel
            </Button>
            <Button
              onClick={() => propertyToApprove && approveMutation.mutate({ 
                propertyId: propertyToApprove.id, 
                notes: approveNotes 
              })}
              disabled={approveMutation.isPending}
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending ? "Approving..." : "Approve Property"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={(open) => !open && resetRejectForm()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="dialog-reject-property">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {isRevocation ? "Revoke Property Verification" : "Reject Property"}
            </DialogTitle>
            <DialogDescription>
              {isRevocation 
                ? `You are about to revoke verification for "${propertyToReject?.title}". This will unpublish the property.`
                : `You are about to reject "${propertyToReject?.title}". Please select a reason.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="flex items-center gap-1">
                {isRevocation ? "Revocation Reason" : "Rejection Reason"}
                <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={selectedReasonId}
                onValueChange={setSelectedReasonId}
                className="space-y-2"
                data-testid="radiogroup-reasons"
              >
                {(isRevocation ? REVOCATION_REASONS : REJECTION_REASONS).map((reason) => (
                  <div
                    key={reason.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                      selectedReasonId === reason.id 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem 
                      value={reason.id} 
                      id={`reason-${reason.id}`}
                      className="mt-0.5"
                      data-testid={`radio-reason-${reason.id}`}
                    />
                    <div className="flex-1">
                      <Label 
                        htmlFor={`reason-${reason.id}`} 
                        className="font-medium cursor-pointer"
                      >
                        {reason.label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {reason.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
              
              {selectedReasonId === "custom" && (
                <div className="mt-3 space-y-2">
                  <Label htmlFor="custom-reason">
                    Custom Reason <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="custom-reason"
                    placeholder={isRevocation 
                      ? "Explain why the verification is being revoked..."
                      : "Explain why the property is being rejected..."
                    }
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="min-h-[100px]"
                    data-testid="textarea-custom-reason"
                  />
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                This reason will be visible to the property owner so they can address the issues.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={resetRejectForm}
              data-testid="button-cancel-reject"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => propertyToReject && rejectMutation.mutate({ 
                propertyId: propertyToReject.id, 
                notes: getRejectNotes()
              })}
              disabled={
                rejectMutation.isPending || 
                !selectedReasonId || 
                (selectedReasonId === "custom" && !customReason.trim())
              }
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending 
                ? (isRevocation ? "Revoking..." : "Rejecting...") 
                : (isRevocation ? "Revoke Verification" : "Reject Property")
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
