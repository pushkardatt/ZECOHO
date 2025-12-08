import { useQuery } from "@tanstack/react-query";
import { PropertyCard } from "@/components/PropertyCard";
import { SearchBar } from "@/components/SearchBar";
import { LocationPermissionDialog } from "@/components/LocationPermissionDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Home as HomeIcon, MapPin, Calendar, Check, Shield, TrendingDown, Sparkles, Award, Handshake, Users, Hotel, Building, Waves, Mountain, TreePine, Wheat, Heart, BadgeCheck, Percent, HandCoins, FileCheck2, ThumbsUp } from "lucide-react";
import type { Property, Destination } from "@shared/schema";
import heroImage from "@assets/generated_images/luxury_villa_hero_image.png";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: wishlists = [] } = useQuery<any[]>({
    queryKey: ["/api/wishlists"],
    enabled: user?.userRole === "guest",
  });

  const { data: featuredDestinations = [], isLoading: destinationsLoading } = useQuery<Destination[]>({
    queryKey: ["/api/destinations/featured"],
  });

  const wishlistedPropertyIds = new Set(wishlists.map((w: any) => w.propertyId));

  const handleSearch = (params: any) => {
    const searchParams = new URLSearchParams();
    if (params.destination) searchParams.set("destination", params.destination);
    if (params.checkIn) searchParams.set("checkIn", params.checkIn);
    if (params.checkOut) searchParams.set("checkOut", params.checkOut);
    if (params.guests) searchParams.set("guests", params.guests.toString());
    setLocation(`/search?${searchParams.toString()}`);
  };

  const categories = [
    { icon: Hotel, label: "Hotels", type: "hotel" },
    { icon: HomeIcon, label: "Villas", type: "villa" },
    { icon: Building, label: "Apartments", type: "apartment" },
    { icon: Waves, label: "Resorts", type: "resort" },
    { icon: Mountain, label: "Hostels", type: "hostel" },
    { icon: TreePine, label: "Lodges", type: "lodge" },
    { icon: Wheat, label: "Farmhouses", type: "farmhouse" },
    { icon: Heart, label: "Homestays", type: "homestay" },
  ];

  const featuredProperties = properties.filter(p => p.status === "published").slice(0, 8);

  return (
    <div className="min-h-screen">
      {/* Location Permission Dialog - appears after login */}
      <LocationPermissionDialog isAuthenticated={isAuthenticated} />
      
      {/* Hero Section with ZERO Commission Focus */}
      <div className="relative h-[480px] flex items-center justify-center mb-4">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
        </div>
        
        <div className="relative z-10 container px-4 md:px-6 text-center pt-4">
          {/* Search Bar - Top Priority */}
          <div className="flex justify-center mb-3">
            <SearchBar onSearch={handleSearch} compact={true} showDates={false} showGuests={false} />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-1 leading-tight">
            Connect Directly With Property Owners
          </h1>
          <p className="text-lg md:text-xl text-white/95 mb-1 font-semibold">
            Book at True Prices • No Middleman • No Commission
          </p>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-white/90 text-sm">
            <div className="flex items-center gap-2">
              <Handshake className="h-4 w-4 text-emerald-400" />
              <span>Direct Contact With Property Owners</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>100% Transparent Pricing</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>Instant Confirmation</span>
            </div>
          </div>
        </div>
      </div>

      {/* List Your Property CTA Banner - Top */}
      <div className="bg-primary text-white py-4 px-4 md:px-6">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <HomeIcon className="h-6 w-6" />
            <div>
              <h3 className="font-semibold text-lg">Become a Property Owner</h3>
              <p className="text-sm text-white/90">List your property and reach customers directly — zero commission for you too!</p>
            </div>
          </div>
          <Button 
            variant="secondary"
            size="lg"
            onClick={() => setLocation("/list-property")}
            data-testid="button-list-property-cta-top"
            className="whitespace-nowrap"
          >
            List Your Property FREE
          </Button>
        </div>
      </div>

      {/* Explore by Category Section */}
      <div className="py-12 px-4 md:px-6 bg-background">
        <div className="container mx-auto">
          <h2 className="text-3xl font-semibold mb-8">Explore by category</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Card 
                key={category.type}
                className="cursor-pointer hover-elevate transition-all"
                onClick={() => setLocation(`/search?type=${category.type}`)}
                data-testid={`category-${category.type}`}
              >
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <category.icon className="h-8 w-8 mb-3 text-primary" />
                  <span className="text-sm font-medium text-center">{category.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Your Seamless Stay Section */}
      <div className="relative py-16 px-4 md:px-6 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80')" }}
        >
          <div className="absolute inset-0 bg-white/85 dark:bg-background/90" />
        </div>
        
        <div className="container mx-auto relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center md:text-left">
            Your Seamless Stay Starts Here
          </h2>
          
          <div className="space-y-6 max-w-xl">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <BadgeCheck className="h-8 w-8 text-blue-500" />
              </div>
              <span className="text-lg font-medium">100% Verified Properties</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Percent className="h-8 w-8 text-blue-500" />
              </div>
              <span className="text-lg font-medium">Zero Commission</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <HandCoins className="h-8 w-8 text-blue-500" />
              </div>
              <span className="text-lg font-medium">Lowest & Honest price - Self negotiation</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <FileCheck2 className="h-8 w-8 text-blue-500" />
              </div>
              <span className="text-lg font-medium">0% Check-in Denial</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <ThumbsUp className="h-8 w-8 text-blue-500" />
              </div>
              <span className="text-lg font-medium">Honest Ratings and Reviews</span>
            </div>
          </div>
        </div>
      </div>

      {/* Discover India Section */}
      <div className="container px-4 md:px-6 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-semibold mb-2">Discover India</h2>
            <p className="text-muted-foreground">Explore the best places to visit across incredible India</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setLocation("/destinations")}
            data-testid="button-view-all-destinations"
          >
            View All
          </Button>
        </div>

        {destinationsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[16/9] rounded-lg" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : featuredDestinations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredDestinations.map((destination) => (
              <Card 
                key={destination.id} 
                className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer transition-all"
                onClick={() => setLocation(`/search?destination=${encodeURIComponent(destination.name)}`)}
                data-testid={`card-destination-${destination.id}`}
              >
                <div 
                  className="h-48 bg-cover bg-center relative"
                  style={{ backgroundImage: `url(${destination.imageUrl})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-xl font-bold text-white mb-1" data-testid={`text-destination-name-${destination.id}`}>
                      {destination.name}
                    </h3>
                    <div className="flex items-center gap-1 text-white/90 text-sm">
                      <MapPin className="h-3 w-3" />
                      <span>{destination.state}</span>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {destination.shortDescription}
                  </p>
                  {destination.bestSeason && (
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="h-3 w-3 text-primary" />
                      <span className="text-muted-foreground">Best time: {destination.bestSeason}</span>
                    </div>
                  )}
                  <div className="mt-3">
                    <Badge variant="secondary" className="text-xs">
                      Explore Properties
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground">
              No featured destinations available yet. Check back soon!
            </p>
          </div>
        )}
      </div>

      {/* Featured Properties */}
      <div className="container px-4 md:px-6 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-semibold">Featured stays</h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/3] rounded-lg" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : featuredProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={{
                  ...property,
                  isWishlisted: wishlistedPropertyIds.has(property.id),
                }}
                onWishlistToggle={(id) => setLocation(`/properties/${id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground">
              No properties available yet. Check back soon!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
