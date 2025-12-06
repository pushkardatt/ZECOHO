import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Edit, Eye, MapPin, Trash2, AlertCircle, IndianRupee } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Property } from "@shared/schema";

export default function OwnerProperties() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [newPrice, setNewPrice] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/owner/properties"],
    enabled: isAuthenticated && !authLoading,
  });

  const deletePropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      await apiRequest("DELETE", `/api/properties/${propertyId}`, undefined);
    },
    onSuccess: () => {
      toast({
        title: "Property Deleted",
        description: "Your property has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/properties"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete property",
        variant: "destructive",
      });
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: async ({ propertyId, price }: { propertyId: string; price: number }) => {
      await apiRequest("PATCH", `/api/properties/${propertyId}/price`, { pricePerNight: price });
    },
    onSuccess: () => {
      toast({
        title: "Price Updated",
        description: "Property price has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/properties"] });
      setPriceDialogOpen(false);
      setEditingProperty(null);
      setNewPrice("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update price",
        variant: "destructive",
      });
    },
  });

  const openPriceDialog = (property: Property) => {
    setEditingProperty(property);
    setNewPrice(String(property.pricePerNight));
    setPriceDialogOpen(true);
  };

  const handlePriceUpdate = () => {
    if (!editingProperty || !newPrice) return;
    const price = Number(newPrice);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0",
        variant: "destructive",
      });
      return;
    }
    updatePriceMutation.mutate({ propertyId: editingProperty.id, price });
  };

  // Show loading state while auth is being verified
  if (authLoading) {
    return (
      <div className="min-h-screen pb-16">
        <div className="container px-4 md:px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="aspect-[4/3] rounded-t-lg" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
      published: { variant: "default", label: "Published" },
      draft: { variant: "secondary", label: "Draft" },
      pending: { variant: "outline", label: "Pending" },
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen pb-16">
      <div className="container px-4 md:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">My properties</h1>
          <p className="text-muted-foreground">
            Manage your property listings
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="aspect-[4/3] rounded-t-lg" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : properties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => {
              const mainImage = property.images?.[0] || "/placeholder-property.jpg";
              
              return (
                <Card key={property.id} className="overflow-hidden">
                  <div className="relative aspect-[4/3]">
                    <img
                      src={mainImage}
                      alt={property.title}
                      className="w-full h-full object-cover"
                      data-testid={`img-owner-property-${property.id}`}
                    />
                    <div className="absolute top-3 right-3">
                      {getStatusBadge(property.status)}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1" data-testid={`text-owner-title-${property.id}`}>
                      {property.title}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <MapPin className="h-4 w-4" />
                      <span className="line-clamp-1">{property.destination}</span>
                    </div>
                    
                    {property.status === "draft" && property.verificationNotes && (
                      <Alert variant="destructive" className="mb-3" data-testid={`alert-rejection-${property.id}`}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="text-sm font-medium">
                          {property.verifiedAt ? "Verification Revoked" : "Rejection Reason"}
                        </AlertTitle>
                        <AlertDescription className="text-xs mt-1">
                          {property.verificationNotes}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-semibold">
                          ₹{Number(property.pricePerNight).toLocaleString('en-IN')}
                        </span>
                        <span className="text-sm text-muted-foreground">/ night</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => openPriceDialog(property)}
                        data-testid={`button-edit-price-${property.id}`}
                      >
                        <IndianRupee className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="icon" data-testid={`button-view-${property.id}`}>
                        <Link href={`/properties/${property.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="icon" data-testid={`button-edit-${property.id}`}>
                        <Link href={`/owner/properties/${property.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon"
                            data-testid={`button-delete-${property.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Property?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{property.title}"? This action cannot be undone and will permanently remove the property from your listings.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`button-cancel-delete-${property.id}`}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePropertyMutation.mutate(property.id)}
                              className="bg-destructive hover:bg-destructive/90"
                              data-testid={`button-confirm-delete-${property.id}`}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No properties yet</h2>
            <p className="text-muted-foreground">
              Your property will appear here once your KYC is verified and property is approved.
            </p>
          </div>
        )}
      </div>

      {/* Price Edit Dialog */}
      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Price</DialogTitle>
            <DialogDescription>
              Change the price per night for "{editingProperty?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="price">Price per night (₹)</Label>
            <div className="relative mt-2">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="price"
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="pl-10"
                placeholder="Enter new price"
                min="1"
                data-testid="input-new-price"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setPriceDialogOpen(false)}
              data-testid="button-cancel-price"
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePriceUpdate}
              disabled={updatePriceMutation.isPending}
              data-testid="button-save-price"
            >
              {updatePriceMutation.isPending ? "Saving..." : "Save Price"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
