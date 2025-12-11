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
import { Home as HomeIcon, MapPin, Calendar, Check, Shield, TrendingDown, Sparkles, Award, Handshake, Users, Hotel, Building, Waves, Mountain, TreePine, Wheat, Heart, BadgeCheck, Percent, HandCoins, FileCheck2, ThumbsUp, Star, Play, ArrowRight, ChevronRight, IndianRupee, Clock, MessageSquare } from "lucide-react";
import type { Property, Destination } from "@shared/schema";
import heroImage from "@assets/generated_images/luxury_villa_hero_image.png";
import { useEffect, useState } from "react";

function AnimatedCounter({ end, duration = 2000, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration]);
  
  return <span>{count.toLocaleString('en-IN')}{suffix}</span>;
}

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
      
      {/* Hero Section - Cinematic & Impressive */}
      <div className="relative min-h-[600px] md:min-h-[680px] flex items-center justify-center overflow-hidden">
        {/* Background with Parallax Effect */}
        <div 
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        {/* Dramatic Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-rose-900/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        
        <div className="relative z-10 container px-4 md:px-6 text-center py-12">
          {/* Premium Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-white/90 text-sm font-medium">India's First Zero Commission Platform</span>
          </div>

          {/* Main Headline with Gradient */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-tight tracking-tight">
            Book Hotels at Guaranteed Lowest Prices{" "}
            <span className="bg-gradient-to-r from-amber-400 via-rose-400 to-rose-500 bg-clip-text text-transparent">
              — Cheaper Than OTA Platforms
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto font-light">
            Direct booking. Zero commission. Zero convenience fees.{" "}
            <span className="font-semibold text-white">Save 15–25% instantly.</span>
          </p>

          {/* Glass Morphism Search Bar */}
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-white/95 dark:bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 p-3 md:p-4">
              <SearchBar onSearch={handleSearch} compact={false} showDates={true} showGuests={true} />
            </div>
          </div>

          {/* OTA Price Comparison Bar */}
          <div className="max-w-2xl mx-auto mb-10">
            <div className="bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30 rounded-full px-6 py-3 flex items-center justify-center gap-3">
              <span className="text-white font-semibold">Zecoho Price vs OTA</span>
              <span className="text-white/70">|</span>
              <span className="text-emerald-300 font-medium">Save up to ₹800 per night</span>
              <span className="text-white/60 text-sm">(real-time comparison)</span>
            </div>
          </div>

          {/* Animated Stats */}
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 mb-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">
                <AnimatedCounter end={56} suffix="+" />
              </div>
              <div className="text-white/70 text-sm">Verified Properties</div>
            </div>
            <div className="hidden md:block w-px h-12 bg-white/20" />
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">
                <AnimatedCounter end={65} suffix="+" />
              </div>
              <div className="text-white/70 text-sm">Indian Destinations</div>
            </div>
            <div className="hidden md:block w-px h-12 bg-white/20" />
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-amber-400 font-extrabold">
                0%
              </div>
              <div className="text-white/70 text-sm">Commission Fee</div>
            </div>
          </div>

          {/* Trust Badges - Simple + Powerful */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span className="text-white/90 text-sm">Direct from Hotel — No Middleman</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span className="text-white/90 text-sm">No Hidden Fees — No Convenience Charges</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span className="text-white/90 text-sm">Instant WhatsApp Confirmation</span>
            </div>
          </div>
        </div>
        
        {/* Bottom Fade for Smooth Transition */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* List Your Property CTA Banner - Premium Design */}
      <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white py-5 px-4 md:px-6 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <HomeIcon className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-bold text-xl">Become a Property Owner</h3>
              <p className="text-sm text-white/95">List your property and reach customers directly — zero commission for you too!</p>
            </div>
          </div>
          <Button 
            variant="secondary"
            size="lg"
            onClick={() => setLocation("/list-property")}
            data-testid="button-list-property-cta-top"
            className="whitespace-nowrap shadow-lg font-semibold group"
          >
            List Your Property FREE
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>

      {/* Explore by Category Section - Enhanced */}
      <div className="py-16 px-4 md:px-6 bg-background">
        <div className="container mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Explore by Category</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Find the perfect stay that matches your style and budget</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {categories.map((category, index) => {
              const gradients = [
                "from-rose-500 to-pink-600",
                "from-amber-500 to-orange-600",
                "from-emerald-500 to-teal-600",
                "from-blue-500 to-indigo-600",
                "from-purple-500 to-violet-600",
                "from-cyan-500 to-blue-600",
                "from-green-500 to-emerald-600",
                "from-pink-500 to-rose-600",
              ];
              return (
                <div
                  key={category.type}
                  className="group cursor-pointer"
                  onClick={() => setLocation(`/search?type=${category.type}`)}
                  data-testid={`category-${category.type}`}
                >
                  <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradients[index]} p-1 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl`}>
                    <div className="bg-background/95 dark:bg-background/90 backdrop-blur rounded-xl p-5 flex flex-col items-center">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${gradients[index]} mb-3 shadow-lg`}>
                        <category.icon className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-center">{category.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Why Choose ZECOHO Section - Premium Bento Grid */}
      <div className="py-20 px-4 md:px-6 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-0 px-4 py-1.5">
              Why Choose Us
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              The ZECOHO{" "}
              <span className="bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
                Advantage
              </span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Experience hotel booking the way it should be — transparent, direct, and commission-free
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Large Feature Card - Lowest & Honest Price */}
            <div className="lg:col-span-2 bg-gradient-to-br from-primary to-amber-600 rounded-3xl p-8 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
              <div className="relative z-10">
                <div className="p-4 bg-white/20 backdrop-blur rounded-2xl inline-flex mb-6">
                  <IndianRupee className="h-10 w-10" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold mb-3">Lowest & Honest Price</h3>
                <p className="text-white/90 text-lg mb-4 max-w-lg">
                  Skip the middleman and save big! We don't add any hidden charges or commissions. 
                  What you see is what you pay — true pricing, always.
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5" />
                    <span>Zero Commission</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5" />
                    <span>No Hidden Fees</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5" />
                    <span>Save 15-25% per booking</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Self Negotiation with Hotelier */}
            <Card className="rounded-3xl border-0 shadow-lg overflow-hidden group hover-elevate">
              <CardContent className="p-6">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl inline-flex mb-4">
                  <Handshake className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Negotiate Directly with Hotelier</h3>
                <p className="text-muted-foreground">Chat or call property owners directly to negotiate your best deal — you're in control!</p>
              </CardContent>
            </Card>
            
            {/* Honest Ratings & Reviews */}
            <Card className="rounded-3xl border-0 shadow-lg overflow-hidden group hover-elevate">
              <CardContent className="p-6">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl inline-flex mb-4">
                  <Star className="h-7 w-7 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Honest Ratings & Reviews</h3>
                <p className="text-muted-foreground">Real reviews from real guests — no fake ratings, no paid reviews, just the truth</p>
              </CardContent>
            </Card>
            
            {/* 100% Verified Properties */}
            <Card className="rounded-3xl border-0 shadow-lg overflow-hidden group hover-elevate">
              <CardContent className="p-6">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl inline-flex mb-4">
                  <BadgeCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">100% Verified Properties</h3>
                <p className="text-muted-foreground">Every property is personally verified for quality, safety, and authenticity — book with confidence</p>
              </CardContent>
            </Card>
            
            {/* 24 Hours Check-in */}
            <Card className="rounded-3xl border-0 shadow-lg overflow-hidden group hover-elevate">
              <CardContent className="p-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl inline-flex mb-4">
                  <Clock className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">24 Hours Check-in</h3>
                <p className="text-muted-foreground">Arrive anytime! Properties offer flexible 24-hour check-in for your convenience</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Discover India Section - Enhanced */}
      <div className="py-16 px-4 md:px-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <Badge className="mb-3 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-0 px-3 py-1">
                <MapPin className="h-3 w-3 mr-1" />
                Popular Destinations
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Discover Incredible India</h2>
              <p className="text-muted-foreground text-lg">From pristine beaches to majestic mountains — find your perfect escape</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/destinations")}
              data-testid="button-view-all-destinations"
              className="group self-start md:self-auto"
            >
              View All Destinations
              <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          {destinationsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[16/10] rounded-2xl" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : featuredDestinations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredDestinations.map((destination, index) => (
                <div 
                  key={destination.id} 
                  className={`group cursor-pointer ${index === 0 ? 'md:row-span-2' : ''}`}
                  onClick={() => setLocation(`/search?destination=${encodeURIComponent(destination.name)}`)}
                  data-testid={`card-destination-${destination.id}`}
                >
                  <div className={`relative overflow-hidden rounded-2xl ${index === 0 ? 'h-full min-h-[400px]' : 'aspect-[16/10]'}`}>
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                      style={{ backgroundImage: `url(${destination.imageUrl})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-white/20 backdrop-blur-sm text-white border-0 text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {destination.state}
                        </Badge>
                        {destination.bestSeason && (
                          <Badge className="bg-white/20 backdrop-blur-sm text-white border-0 text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            {destination.bestSeason}
                          </Badge>
                        )}
                      </div>
                      <h3 className={`font-bold text-white mb-2 ${index === 0 ? 'text-3xl' : 'text-xl'}`} data-testid={`text-destination-name-${destination.id}`}>
                        {destination.name}
                      </h3>
                      <p className={`text-white/80 ${index === 0 ? 'text-base line-clamp-3' : 'text-sm line-clamp-2'}`}>
                        {destination.shortDescription}
                      </p>
                      <div className="flex items-center gap-2 mt-3 text-white/90 text-sm font-medium group-hover:text-white transition-colors">
                        <span>Explore Properties</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-muted/30 rounded-2xl">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-lg">
                No featured destinations available yet. Check back soon!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Featured Properties - Enhanced */}
      <div className="py-16 px-4 md:px-6 bg-muted/20">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <Badge className="mb-3 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-0 px-3 py-1">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Hand-Picked
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Featured Stays</h2>
              <p className="text-muted-foreground text-lg">Curated properties with exceptional value and reviews</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/search")}
              className="group self-start md:self-auto"
              data-testid="button-view-all-properties"
            >
              View All Properties
              <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[4/3] rounded-2xl" />
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
            <div className="text-center py-16 bg-background rounded-2xl">
              <Hotel className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg text-muted-foreground">
                No properties available yet. Check back soon!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="py-20 px-4 md:px-6 bg-gradient-to-br from-rose-500 via-rose-600 to-amber-500 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Ready to Save on Your Next Trip?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of travelers who save 15-25% by booking directly with property owners
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => setLocation("/search")}
              className="font-semibold shadow-lg"
              data-testid="button-find-stay-cta"
            >
              Find Your Stay
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => setLocation("/list-property")}
              className="border-white/30 text-white hover:bg-white/10 font-semibold"
              data-testid="button-list-property-cta-bottom"
            >
              <HomeIcon className="mr-2 h-4 w-4" />
              List Your Property
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
