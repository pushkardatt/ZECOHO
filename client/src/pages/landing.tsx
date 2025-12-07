import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import { PropertyCard } from "@/components/PropertyCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building, Home as HomeIcon, Hotel, Mountain, Waves, TreePine, Wheat, Heart, MapPin, Calendar, Handshake, TrendingDown, Shield } from "lucide-react";
import { useLocation, Link } from "wouter";
import type { Property, Destination } from "@shared/schema";
import heroImage from "@assets/generated_images/mountain_resort_balcony_view.png";

export default function Landing() {
  const [, setLocation] = useLocation();

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: featuredDestinations = [], isLoading: destinationsLoading } = useQuery<Destination[]>({
    queryKey: ["/api/destinations/featured"],
  });

  const featuredProperties = properties.filter(p => p.status === "published").slice(0, 8);

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

  return (
    <div className="min-h-screen">
      {/* Top Navigation Header with Logo */}
      <header className="absolute top-0 left-0 right-0 z-50 px-4 md:px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" data-testid="link-home-logo">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">Z</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold text-2xl text-white drop-shadow-md tracking-tight">
                  ZECOHO
                </span>
                <span className="font-bold text-lg bg-gradient-to-r from-rose-400 to-amber-400 bg-clip-text text-transparent drop-shadow-md">.com</span>
              </div>
            </div>
          </Link>
          <Button 
            size="default"
            variant="outline" 
            className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
            onClick={() => setLocation("/login")}
            data-testid="button-login-hero"
          >
            Login / Sign Up
          </Button>
        </div>
      </header>

      {/* Hero Section with Search */}
      <div className="relative h-[600px] flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />
        </div>
        
        <div className="relative z-10 container px-4 md:px-6 text-center pt-16">
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2" data-testid="text-hero-title">
            Book Direct. Pay Less. ZERO Commission.
          </h1>
          <p className="text-base md:text-lg text-white/90 mb-5 whitespace-nowrap">
            Connect Directly With Property Owners — No middleman, no hidden fees.
          </p>
          
          <div className="flex justify-center">
            <SearchBar onSearch={handleSearch} compact={true} showDates={false} showGuests={false} />
          </div>
          
          {/* Popular Cities Quick Search */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-4 mt-6">
            {["Bangalore", "Pune", "Hyderabad", "Chennai", "Kolkata", "Mumbai", "New Delhi", "Nagpur", "Noida", "Visakhapatnam"].map((city) => (
              <button
                key={city}
                onClick={() => setLocation(`/search?destination=${encodeURIComponent(city)}`)}
                className="text-white/90 hover:text-white text-sm font-medium hover:underline transition-colors"
                data-testid={`link-quick-city-${city.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {city}
              </button>
            ))}
            <button
              onClick={() => setLocation("/destinations")}
              className="text-primary font-semibold text-sm hover:underline transition-colors"
              data-testid="link-all-cities"
            >
              All Cities
            </button>
          </div>
        </div>
      </div>

      {/* Explore by Category */}
      <div className="container px-4 md:px-6 py-16">
        <h2 className="text-3xl font-semibold mb-8">Explore by category</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Card 
              key={category.type} 
              className="hover-elevate active-elevate-2 cursor-pointer"
              onClick={() => setLocation(`/search?propertyType=${category.type}`)}
              data-testid={`card-category-${category.type}`}
            >
              <CardContent className="p-6 text-center">
                <category.icon className="h-10 w-10 mx-auto mb-3 text-primary" />
                <p className="font-semibold">{category.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Why Choose ZECOHO Section */}
      <div className="bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background py-16 px-4 md:px-6">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3" data-testid="text-why-choose-heading">Why Choose ZECOHO?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect Directly With Property Owners. Experience the difference of commission-free booking. Your journey, our passion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="text-center p-6 border-2 border-emerald-100 dark:border-emerald-900">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-emerald-100 dark:bg-emerald-900 p-4">
                  <Handshake className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Direct Connection to Property Owners</h3>
              <p className="text-muted-foreground">
                No middleman. Connect directly with property owners and build genuine relationships. Book at the source!
              </p>
            </Card>

            <Card className="text-center p-6 border-2 border-emerald-100 dark:border-emerald-900">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-emerald-100 dark:bg-emerald-900 p-4">
                  <TrendingDown className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Save 15-20% Per Booking</h3>
              <p className="text-muted-foreground">
                Other platforms charge hotels 15-25% commission. We charge ZERO. Those savings go directly to you!
              </p>
            </Card>

            <Card className="text-center p-6 border-2 border-emerald-100 dark:border-emerald-900">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-emerald-100 dark:bg-emerald-900 p-4">
                  <Shield className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">100% Transparent Pricing</h3>
              <p className="text-muted-foreground">
                What you see is what you pay. No service fees, booking fees, or surprise charges at checkout.
              </p>
            </Card>
          </div>

          {/* See The Difference - Savings Example */}
          <div className="mt-12 max-w-3xl mx-auto">
            <Card className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2" data-testid="text-see-difference-heading">See The Difference</h3>
                  <p className="text-white/90 mb-4">Booking a ₹10,000/night property for 3 nights:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span>Other Platforms:</span>
                      <span className="font-semibold line-through">₹36,000 + ₹5,400 fees = ₹41,400</span>
                    </div>
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-bold">ZECOHO:</span>
                      <span className="font-bold">₹30,000 (₹0 fees)</span>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-white text-emerald-600 rounded-lg px-6 py-4">
                    <p className="text-sm font-semibold mb-1">You Save</p>
                    <p className="text-4xl font-bold">₹11,400</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Discover India Section */}
      <div className="container px-4 md:px-6 py-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-semibold mb-2" data-testid="text-discover-india-heading">Discover India</h2>
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

      {/* Featured Stays Section */}
      <div className="container px-4 md:px-6 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-semibold" data-testid="text-featured-stays-heading">Featured stays</h2>
        </div>

        {propertiesLoading ? (
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
                property={property}
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

      {/* CTA Section */}
      <div className="container px-4 md:px-6 py-16 text-center">
        <h3 className="text-3xl font-bold mb-4">Start Saving Today</h3>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Join thousands of smart travelers booking directly with property owners and saving on every stay
        </p>
        <Button size="lg" asChild data-testid="button-cta-login">
          <a href="/api/login">Start Booking at ZERO Commission</a>
        </Button>
      </div>
    </div>
  );
}
