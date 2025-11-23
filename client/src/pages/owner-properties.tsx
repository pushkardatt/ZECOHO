import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Eye, MapPin } from "lucide-react";
import { Link } from "wouter";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Property } from "@shared/schema";

export default function OwnerProperties() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold mb-2">My properties</h1>
            <p className="text-muted-foreground">
              Manage your property listings
            </p>
          </div>
          <Button asChild data-testid="button-add-property">
            <Link href="/owner/properties/new">
              <Plus className="h-4 w-4 mr-2" />
              Add property
            </Link>
          </Button>
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
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                      <MapPin className="h-4 w-4" />
                      <span className="line-clamp-1">{property.destination}</span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-xl font-semibold">
                        ₹{Number(property.pricePerNight).toLocaleString('en-IN')}
                      </span>
                      <span className="text-sm text-muted-foreground">/ night</span>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" className="flex-1" data-testid={`button-view-${property.id}`}>
                        <Link href={`/properties/${property.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Link>
                      </Button>
                      <Button asChild className="flex-1" data-testid={`button-edit-${property.id}`}>
                        <Link href={`/owner/properties/${property.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No properties yet</h2>
            <p className="text-muted-foreground mb-6">
              Start by adding your first property listing
            </p>
            <Button asChild>
              <Link href="/owner/properties/new">
                <Plus className="h-4 w-4 mr-2" />
                Add your first property
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
