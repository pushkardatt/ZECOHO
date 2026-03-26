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
import {
  Home as HomeIcon,
  MapPin,
  Calendar,
  Check,
  Shield,
  ShieldCheck,
  TrendingDown,
  Sparkles,
  Award,
  Handshake,
  Users,
  Hotel,
  Building,
  Waves,
  Mountain,
  TreePine,
  Wheat,
  Heart,
  BadgeCheck,
  Percent,
  HandCoins,
  FileCheck2,
  ThumbsUp,
  Star,
  Play,
  ArrowRight,
  ChevronRight,
  IndianRupee,
  Clock,
  MessageSquare,
  MessageCircle,
} from "lucide-react";
import type { Property, Destination } from "@shared/schema";
import { useEffect, useState } from "react";

function AnimatedCounter({
  end,
  duration = 2000,
  suffix = "",
}: {
  end: number;
  duration?: number;
  suffix?: string;
}) {
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

  return (
    <span>
      {count.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isOwner } = useAuth();

  const { data: subStatus } = useQuery({
    queryKey: ["/api/owner/subscription-status", user?.id],
    queryFn: () =>
      fetch("/api/owner/subscription-status/" + user?.id, {
        credentials: "include",
      }).then((r) => r.json()),
    enabled: !!user?.id && !!isOwner,
  });
  const subExpired = isOwner && subStatus && !subStatus.isActive;

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    refetchInterval: 300000, // Refresh every 60 seconds for price/availability updates
  });

  const { data: wishlists = [] } = useQuery<any[]>({
    queryKey: ["/api/wishlists"],
    enabled: user?.userRole === "guest",
  });

  const { data: featuredDestinations = [], isLoading: destinationsLoading } =
    useQuery<Destination[]>({
      queryKey: ["/api/destinations/featured"],
    });

  const wishlistedPropertyIds = new Set(
    wishlists.map((w: any) => w.propertyId),
  );

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

  const featuredProperties = properties
    .filter((p) => p.status === "published")
    .slice(0, 8);

  return (
    <div className="min-h-screen">
      {/* Location Permission Dialog - appears after login */}
      <LocationPermissionDialog isAuthenticated={isAuthenticated} />

      {subExpired && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-300 px-4 py-3 text-center">
          <span className="text-amber-800 dark:text-amber-200 text-sm font-medium">
            Your subscription is not active.{" "}
            <a
              href="/owner/subscription"
              className="font-semibold underline hover:text-amber-900"
            >
              Renew or activate your subscription
            </a>
          </span>
        </div>
      )}

      {/* Hero Section - Clean & Modern */}
      <div className="relative bg-gradient-to-br from-rose-50 via-background to-amber-50 dark:from-rose-950/20 dark:via-background dark:to-amber-950/20">
        <div className="relative z-10 container px-4 md:px-6 text-center py-6 md:py-12 overflow-visible">
          {/* Mobile Layout: Search First, then Tagline */}
          <div className="md:hidden">
            {/* Search Bar - First on Mobile */}
            <div className="mb-6">
              <div className="max-w-4xl mx-auto">
                <div
                  className="bg-background rounded-2xl shadow-xl border p-3 overflow-visible"
                  style={{ overflow: "visible" }}
                >
                  <SearchBar
                    onSearch={handleSearch}
                    compact={false}
                    showDates={true}
                    showGuests={true}
                  />
                </div>
              </div>
            </div>

            {/* Tagline Section - Second on Mobile */}
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <BadgeCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-foreground/80 text-xs font-medium">
                  ZERO Commission Hotel Booking
                </span>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Same Hotel. Same Room.
              </h2>
              <p className="text-lg font-semibold bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 bg-clip-text text-transparent mb-3">
                15–25% Less Than Other OTAs
              </p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                We don't charge hotels commission — so they pass the savings to
                you. No hidden fees. No surprises.
              </p>
            </div>

            {/* Mobile Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              <div className="flex items-center gap-1 bg-muted/50 rounded-full px-3 py-1.5">
                <Hotel className="h-3 w-3 text-amber-500" />
                <span className="text-foreground/80 text-xs">
                  Direct from Hotel
                </span>
              </div>
              <div className="flex items-center gap-1 bg-muted/50 rounded-full px-3 py-1.5">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                <span className="text-foreground/80 text-xs">
                  No Hidden Fees
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Layout: Original Order */}
          <div className="hidden md:block">
            {/* Premium Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-foreground/80 text-sm font-medium">
                India's First Zero Commission Platform
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-hero-title font-bold text-foreground mb-4 tracking-tight">
              Book Hotels at Guaranteed Lowest Prices{" "}
              <span className="bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 bg-clip-text text-transparent">
                — Cheaper Than OTAs
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              <span className="font-semibold text-foreground">
                Save 15–25% instantly.
              </span>{" "}
              Zero commission. Zero convenience fees.
            </p>

            {/* Desktop: Search Bar */}
            <div className="max-w-4xl mx-auto mb-4">
              <div
                className="bg-background rounded-2xl shadow-xl border p-4 overflow-visible"
                style={{ overflow: "visible" }}
              >
                <SearchBar
                  onSearch={handleSearch}
                  compact={false}
                  showDates={true}
                  showGuests={true}
                />
              </div>
            </div>

            {/* Trust Badges Under Search Bar */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-8">
              <div className="flex items-center gap-1.5">
                <BadgeCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-muted-foreground text-sm">
                  100% Verified Stays
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="text-muted-foreground text-sm">
                  Real Guest Ratings
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Hotel className="h-4 w-4 text-rose-500" />
                <span className="text-muted-foreground text-sm">
                  Direct Contact with Hotel
                </span>
              </div>
            </div>

            {/* Bottom Trust Icons */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              <div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
                <Hotel className="h-4 w-4 text-amber-500" />
                <span className="text-foreground/80 text-sm">
                  Direct from Hotel
                </span>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-foreground/80 text-sm">
                  No Hidden Fees
                </span>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
                <MessageCircle className="h-4 w-4 text-green-500" />
                <span className="text-foreground/80 text-sm">
                  WhatsApp Confirmation
                </span>
              </div>
            </div>
          </div>
        </div>
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
              <p className="text-sm text-white/95">
                List your property and reach customers directly — zero
                commission for you too!
              </p>
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

      {/* Popular Destinations Section */}
      <div className="py-16 px-4 md:px-6 bg-background">
        <div className="container mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Popular Destinations
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover amazing stays at India's most loved destinations
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "Goa",
                price: "₹899",
                image:
                  "/attached_assets/stock_images/goa_beach_india_suns_fcb832ea.jpg",
              },
              {
                name: "Manali",
                price: "₹1,199",
                image:
                  "/attached_assets/stock_images/manali_mountains_him_01ba7d34.jpg",
              },
              {
                name: "Jaipur",
                price: "₹799",
                image:
                  "/attached_assets/stock_images/jaipur_hawa_mahal_pi_f05b7750.jpg",
              },
              {
                name: "Rishikesh",
                price: "₹699",
                image:
                  "/attached_assets/stock_images/rishikesh_ganges_riv_88870393.jpg",
              },
              {
                name: "Ooty",
                price: "₹999",
                image:
                  "/attached_assets/stock_images/ooty_tea_gardens_hil_06b99c0a.jpg",
              },
              {
                name: "Udaipur",
                price: "₹1,099",
                image:
                  "/attached_assets/stock_images/udaipur_lake_palace__7af7058e.jpg",
              },
            ].map((destination) => (
              <div
                key={destination.name}
                className="group cursor-pointer overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() =>
                  setLocation(`/search?destination=${destination.name}`)
                }
                data-testid={`destination-card-${destination.name.toLowerCase()}`}
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={destination.image}
                    alt={destination.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="text-2xl font-bold text-white mb-1">
                      {destination.name}
                    </h3>
                    <p className="text-white/90 text-sm mb-3">
                      Stays from{" "}
                      <span className="font-semibold text-amber-400">
                        {destination.price}
                      </span>
                    </p>
                    <div className="flex items-center gap-1 text-white font-medium text-sm group-hover:text-amber-400 transition-colors">
                      View Stays{" "}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Explore by Category Section - Enhanced */}
      <div className="py-16 px-4 md:px-6 bg-background">
        <div className="container mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Explore by Category
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find the perfect stay that matches your style and budget
            </p>
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
                  <div
                    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradients[index]} p-1 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl`}
                  >
                    <div className="bg-background/95 dark:bg-background/90 backdrop-blur rounded-xl p-5 flex flex-col items-center">
                      <div
                        className={`p-3 rounded-xl bg-gradient-to-br ${gradients[index]} mb-3 shadow-lg`}
                      >
                        <category.icon className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-center">
                        {category.label}
                      </span>
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
              Experience hotel booking the way it should be — transparent,
              direct, and commission-free
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
                <h3 className="text-3xl md:text-4xl font-bold mb-3">
                  Lowest & Honest Price
                </h3>
                <p className="text-white/90 text-lg mb-4 max-w-lg">
                  Skip the middleman and save big! We don't add any hidden
                  charges or commissions. What you see is what you pay — true
                  pricing, always.
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
                <h3 className="text-xl font-bold mb-2">
                  Negotiate Directly with Hotelier
                </h3>
                <p className="text-muted-foreground">
                  Chat or call property owners directly to negotiate your best
                  deal — you're in control!
                </p>
              </CardContent>
            </Card>

            {/* Honest Ratings & Reviews */}
            <Card className="rounded-3xl border-0 shadow-lg overflow-hidden group hover-elevate">
              <CardContent className="p-6">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl inline-flex mb-4">
                  <Star className="h-7 w-7 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  Honest Ratings & Reviews
                </h3>
                <p className="text-muted-foreground">
                  Real reviews from real guests — no fake ratings, no paid
                  reviews, just the truth
                </p>
              </CardContent>
            </Card>

            {/* 100% Verified Properties */}
            <Card className="rounded-3xl border-0 shadow-lg overflow-hidden group hover-elevate">
              <CardContent className="p-6">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl inline-flex mb-4">
                  <BadgeCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  100% Verified Properties
                </h3>
                <p className="text-muted-foreground">
                  Every property is personally verified for quality, safety, and
                  authenticity — book with confidence
                </p>
              </CardContent>
            </Card>

            {/* 24 Hours Check-in */}
            <Card className="rounded-3xl border-0 shadow-lg overflow-hidden group hover-elevate">
              <CardContent className="p-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl inline-flex mb-4">
                  <Clock className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">24 Hours Check-in</h3>
                <p className="text-muted-foreground">
                  Arrive anytime! Properties offer flexible 24-hour check-in for
                  your convenience
                </p>
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
              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                Discover Incredible India
              </h2>
              <p className="text-muted-foreground text-lg">
                From pristine beaches to majestic mountains — find your perfect
                escape
              </p>
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
                  className={`group cursor-pointer ${index === 0 ? "md:row-span-2" : ""}`}
                  onClick={() =>
                    setLocation(
                      `/search?destination=${encodeURIComponent(destination.name)}`,
                    )
                  }
                  data-testid={`card-destination-${destination.id}`}
                >
                  <div
                    className={`relative overflow-hidden rounded-2xl ${index === 0 ? "h-full min-h-[400px]" : "aspect-[16/10]"}`}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                      style={{
                        backgroundImage: `url(${destination.imageUrl})`,
                      }}
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
                      <h3
                        className={`font-bold text-white mb-2 ${index === 0 ? "text-3xl" : "text-xl"}`}
                        data-testid={`text-destination-name-${destination.id}`}
                      >
                        {destination.name}
                      </h3>
                      <p
                        className={`text-white/80 ${index === 0 ? "text-base line-clamp-3" : "text-sm line-clamp-2"}`}
                      >
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
              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                Featured Stays
              </h2>
              <p className="text-muted-foreground text-lg">
                Curated properties with exceptional value and reviews
              </p>
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
    </div>
  );
}
