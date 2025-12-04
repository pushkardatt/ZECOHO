import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { CheckCircle, XCircle, Trash2, Eye, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
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

export default function AdminProperties() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pending");

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

  const approveMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      return apiRequest("PATCH", `/api/admin/properties/${propertyId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/properties"] });
      toast({ title: "Success", description: "Property approved successfully" });
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
    mutationFn: async (propertyId: string) => {
      return apiRequest("PATCH", `/api/admin/properties/${propertyId}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/properties"] });
      toast({ title: "Success", description: "Property rejected successfully" });
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
      published: { variant: "default", label: "Published" },
      draft: { variant: "secondary", label: "Draft" },
      pending: { variant: "outline", label: "Pending Review" },
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const pendingProperties = properties.filter((p) => p.status === "pending");
  const publishedProperties = properties.filter((p) => p.status === "published");
  const draftProperties = properties.filter((p) => p.status === "draft");

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
                      onClick={() => approveMutation.mutate(property.id)}
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
                      onClick={() => rejectMutation.mutate(property.id)}
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
                      onClick={() => rejectMutation.mutate(property.id)}
                      disabled={rejectMutation.isPending}
                      data-testid={`button-disapprove-${property.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Disapprove
                    </Button>
                  </div>
                )}

                {property.status === "draft" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1"
                      onClick={() => approveMutation.mutate(property.id)}
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending Review ({pendingProperties.length})
            </TabsTrigger>
            <TabsTrigger value="published" data-testid="tab-published">
              Published ({publishedProperties.length})
            </TabsTrigger>
            <TabsTrigger value="draft" data-testid="tab-draft">
              Draft ({draftProperties.length})
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
        </Tabs>
      </div>

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
    </div>
  );
}
