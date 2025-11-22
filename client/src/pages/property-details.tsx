import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Heart, 
  MapPin, 
  Star, 
  Users, 
  Bed, 
  Bath, 
  Wifi, 
  Car, 
  Coffee, 
  Wind,
  Check
} from "lucide-react";
import type { Property } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function PropertyDetails() {
  const [, params] = useRoute("/properties/:id");
  const propertyId = params?.id;
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: property, isLoading } = useQuery<Property>({
    queryKey: ["/api/properties", propertyId],
    enabled: !!propertyId,
  });

  const { data: wishlists = [] } = useQuery<any[]>({
    queryKey: ["/api/wishlists"],
    enabled: user?.userRole === "guest",
  });

  const isWishlisted = wishlists.some((w: any) => w.propertyId === propertyId);

  const wishlistMutation = useMutation({
    mutationFn: async () => {
      if (isWishlisted) {
        const wishlist = wishlists.find((w: any) => w.propertyId === propertyId);
        await apiRequest("DELETE", `/api/wishlists/${wishlist.id}`, undefined);
      } else {
        await apiRequest("POST", "/api/wishlists", { propertyId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlists"] });
      toast({
        title: isWishlisted ? "Removed from wishlist" : "Added to wishlist",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update wishlist",
        variant: "destructive",
      });
    },
  });

  const amenitiesData = [
    { icon: Wifi, label: "Wifi" },
    { icon: Car, label: "Free parking" },
    { icon: Coffee, label: "Kitchen" },
    { icon: Wind, label: "Air conditioning" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="container px-4 md:px-6 py-6">
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-6" />
          <Skeleton className="aspect-[2/1] rounded-lg mb-6" />
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Skeleton className="h-32" />
              <Skeleton className="h-64" />
            </div>
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Property not found</h1>
          <p className="text-muted-foreground">This property may have been removed</p>
        </div>
      </div>
    );
  }

  const mainImage = property.images?.[0] || "/placeholder-property.jpg";
  const additionalImages = property.images?.slice(1, 5) || [];

  return (
    <div className="min-h-screen pb-16">
      <div className="container px-4 md:px-6 py-6">
        {/* Title and Actions */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              <h1 className="text-3xl font-semibold mb-2" data-testid="text-property-title">
                {property.title}
              </h1>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{property.destination}</span>
                </div>
                {property.rating && Number(property.rating) > 0 && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-current text-yellow-500" />
                      <span className="font-semibold">{Number(property.rating).toFixed(1)}</span>
                      <span>({property.reviewCount} reviews)</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {user?.userRole === "guest" && (
              <Button
                variant={isWishlisted ? "default" : "outline"}
                onClick={() => wishlistMutation.mutate()}
                disabled={wishlistMutation.isPending}
                data-testid="button-wishlist-toggle"
              >
                <Heart className={`h-4 w-4 mr-2 ${isWishlisted ? "fill-current" : ""}`} />
                {isWishlisted ? "Saved" : "Save"}
              </Button>
            )}
          </div>
          <Badge>{property.propertyType}</Badge>
        </div>

        {/* Image Gallery */}
        <div className="mb-8">
          {additionalImages.length > 0 ? (
            <div className="grid grid-cols-4 gap-2 rounded-xl overflow-hidden h-[500px]">
              <div className="col-span-4 md:col-span-2 md:row-span-2">
                <img
                  src={mainImage}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {additionalImages.map((img, idx) => (
                <div key={idx} className="col-span-2 md:col-span-1">
                  <img
                    src={img}
                    alt={`${property.title} ${idx + 2}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="aspect-[2/1] rounded-xl overflow-hidden">
              <img
                src={mainImage}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* Quick Info */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Property details</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Guests</p>
                      <p className="font-semibold">{property.maxGuests}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Bedrooms</p>
                      <p className="font-semibold">{property.bedrooms}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Beds</p>
                      <p className="font-semibold">{property.beds}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bath className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Bathrooms</p>
                      <p className="font-semibold">{property.bathrooms}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <div>
              <h2 className="text-xl font-semibold mb-4">About this property</h2>
              <p className="text-muted-foreground leading-relaxed">
                {property.description}
              </p>
            </div>

            {/* Amenities */}
            <div>
              <h2 className="text-xl font-semibold mb-4">What this place offers</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {amenitiesData.map((amenity, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <amenity.icon className="h-5 w-5 text-muted-foreground" />
                    <span>{amenity.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Policies */}
            {property.policies && (
              <div>
                <h2 className="text-xl font-semibold mb-4">House rules</h2>
                <p className="text-muted-foreground">{property.policies}</p>
              </div>
            )}
          </div>

          {/* Booking Card */}
          <div className="md:sticky md:top-24 h-fit">
            <Card>
              <CardContent className="p-6">
                <div className="mb-6">
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-semibold" data-testid="text-price-detail">
                      ${Number(property.pricePerNight).toFixed(0)}
                    </span>
                    <span className="text-muted-foreground">/ night</span>
                  </div>
                  {property.rating && Number(property.rating) > 0 && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-current text-yellow-500" />
                      <span className="font-semibold">{Number(property.rating).toFixed(1)}</span>
                      <span className="text-muted-foreground">
                        ({property.reviewCount} reviews)
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-semibold block mb-2">Check-in</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border rounded-lg"
                      data-testid="input-checkin-booking"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-2">Check-out</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border rounded-lg"
                      data-testid="input-checkout-booking"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-2">Guests</label>
                    <input
                      type="number"
                      min="1"
                      max={property.maxGuests}
                      defaultValue="2"
                      className="w-full px-3 py-2 border rounded-lg"
                      data-testid="input-guests-booking"
                    />
                  </div>
                </div>

                <Button className="w-full" size="lg" data-testid="button-reserve">
                  Reserve
                </Button>
                
                <p className="text-sm text-center text-muted-foreground mt-4">
                  You won't be charged yet
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
