import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import { PropertyCard } from "@/components/PropertyCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building,
  Home as HomeIcon,
  Hotel,
  Mountain,
  Waves,
  TreePine,
  Wheat,
  Heart,
  MapPin,
  Calendar,
  Handshake,
  TrendingDown,
  Shield,
  Sparkles,
  Check,
  Percent,
  BadgeCheck,
  HandCoins,
  FileCheck2,
  Star,
  ArrowRight,
  ChevronRight,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { useLocation, Link } from "wouter";
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

export default function Landing() {
  const [, setLocation] = useLocation();
  const { isOwner, user } = useAuth();
  const { data: subStatus } = useQuery({
    queryKey: ["/api/owner/subscription-status", user?.id],
    queryFn: () =>
      fetch("/api/owner/subscription-status/" + user?.id, {
        credentials: "include",
      }).then((r) => r.json()),
    enabled: !!user?.id && !!isOwner,
  });
  const subExpired = isOwner && subStatus && !subStatus.isActive;

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<
    Property[]
  >({
    queryKey: ["/api/properties"],
    refetchInterval: 60000, // Refresh every 60 seconds for price/availability updates
  });

  const { data: featuredDestinations = [], isLoading: destinationsLoading } =
    useQuery<Destination[]>({
      queryKey: ["/api/destinations/featured"],
    });

  const featuredProperties = properties
    .filter((p) => p.status === "published")
    .slice(0, 8);

  const handleSearch = (params: any) => {
    const searchParams = new URLSearchParams();
    if (params.destination) searchParams.set("destination", params.destination);
    if (params.checkIn) searchParams.set("checkIn", params.checkIn);
    if (params.checkOut) searchParams.set("checkOut", params.checkOut);
    if (params.guests) searchParams.set("guests", params.guests.toString());
    if (params.adults) searchParams.set("adults", params.adults.toString());
    if (params.children !== undefined)
      searchParams.set("children", params.children.toString());
    if (params.rooms) searchParams.set("rooms", params.rooms.toString());
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
      {subExpired && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-300 px-4 py-3 text-center">
          <span className="text-amber-800 dark:text-amber-200 text-sm font-medium">
            ⚠️ No active subscription.{" "}
            <a
              href="/owner/subscription"
              className="font-semibold underline hover:text-amber-900"
            >
              Renew or activate your subscription →
            </a>
          </span>
        </div>
      )}
      {/* Hero Section - Clean Modern Design */}
      <div className="relative min-h-[450px] md:min-h-[480px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-rose-50 via-background to-amber-50 dark:from-rose-950/20 dark:via-background dark:to-amber-950/20">
        <div className="relative z-10 container px-4 md:px-6 text-center py-8">
          {/* MOBILE LAYOUT: Search First */}
          <div className="md:hidden">
            {/* Search Bar - First on Mobile */}
            <div className="mb-6">
              <div className="bg-background rounded-2xl shadow-xl border p-3">
                <SearchBar
                  onSearch={handleSearch}
                  compact={false}
                  showDates={true}
                  showGuests={true}
                  ctaText="Book Now"
                />
              </div>
            </div>

            {/* Tagline Section - Second on Mobile */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 mb-4">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  ZERO Commission Hotel Booking
                </span>
              </div>
              <h1
                className="text-2xl font-extrabold text-foreground tracking-tight mb-2"
                data-testid="text-hero-title-mobile"
              >
                Same Hotel. Same Room.
              </h1>
              <h1 className="text-xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 bg-clip-text text-transparent">
                15–25% Less Than Other OTAs
              </h1>
              <p className="text-sm text-muted-foreground font-normal leading-relaxed max-w-sm mx-auto">
                We don't charge hotels commission — so they pass the savings to
                you. No hidden fees. No surprises.
              </p>
            </div>

            {/* Mobile Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              <div className="flex items-center gap-1.5 bg-white/80 dark:bg-muted/50 px-3 py-1.5 rounded-full">
                <Percent className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-foreground/80 text-xs font-medium">
                  0% Commission
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/80 dark:bg-muted/50 px-3 py-1.5 rounded-full">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-foreground/80 text-xs font-medium">
                  Verified Properties
                </span>
              </div>
            </div>
          </div>

          {/* DESKTOP LAYOUT: Original Order */}
          <div className="hidden md:block">
            {/* Premium Badge - Subtle */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 mb-4">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                ZERO Commission Hotel Booking
              </span>
            </div>

            {/* Main Headline */}
            <h1
              className="text-hero-title font-extrabold text-foreground tracking-tight mb-2"
              data-testid="text-hero-title"
            >
              Same Hotel. Same Room.
            </h1>
            <h1 className="text-hero-subtitle font-extrabold tracking-tight mb-4 bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 bg-clip-text text-transparent">
              15–25% Less Than Other OTAs
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-muted-foreground font-normal leading-relaxed mb-8 max-w-xl mx-auto">
              We don't charge hotels commission — so they pass the savings to
              you. No hidden fees. No surprises.
            </p>

            {/* Search Bar */}
            <div className="max-w-4xl mx-auto mb-6">
              <div className="bg-background rounded-2xl shadow-xl border p-4">
                <SearchBar
                  onSearch={handleSearch}
                  compact={false}
                  showDates={true}
                  showGuests={true}
                  ctaText="Book Now"
                />
              </div>
            </div>

            {/* USPs Under Search Bar */}
            <div className="flex flex-wrap items-center justify-center gap-6">
              <div className="flex items-center gap-1.5 bg-white/80 dark:bg-muted/50 px-3 py-1.5 rounded-full">
                <Percent className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-foreground/80 text-xs font-medium">
                  0% Commission
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/80 dark:bg-muted/50 px-3 py-1.5 rounded-full">
                <MessageCircle className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-foreground/80 text-xs font-medium">
                  Direct Hotel Contact
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/80 dark:bg-muted/50 px-3 py-1.5 rounded-full">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-foreground/80 text-xs font-medium">
                  Verified Properties
                </span>
              </div>
            </div>
          </div>

          {/* Property Owner CTA — hidden for existing owners */}
          {!isOwner && (
            <div className="mt-5">
              <span
                className="text-muted-foreground text-sm hover:text-primary cursor-pointer transition-colors underline-offset-2 hover:underline"
                onClick={() => setLocation("/login?returnTo=/list-property")}
                data-testid="link-owner-cta-hero"
              >
                Are you a hotelier? List your property — 0% commission
              </span>
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
              <h2
                className="text-3xl md:text-4xl font-bold mb-2"
                data-testid="text-featured-stays-heading"
              >
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

          {propertiesLoading ? (
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
                <PropertyCard key={property.id} property={property} />
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

      {/* Popular Destinations Section - Single Grid */}
      <div className="py-16 px-4 md:px-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <Badge className="mb-3 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-0 px-3 py-1">
                <MapPin className="h-3 w-3 mr-1" />
                Popular Destinations
              </Badge>
              <h2
                className="text-3xl md:text-4xl font-bold mb-2"
                data-testid="text-discover-india-heading"
              >
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

          {/* Popular Destinations Grid - Light Overlay, White Text, Hover Zoom */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "Goa",
                price: "₹899",
                image:
                  "/attached_assets/stock_images/goa_beach_sunset_pal_1c0ebb32.jpg",
                desc: "Sun, sand & vibrant nightlife",
              },
              {
                name: "Himalayas",
                price: "₹1,199",
                image:
                  "/attached_assets/stock_images/himalayas_snow_mount_acec5fcd.jpg",
                desc: "Snow-capped peaks & adventure",
              },
              {
                name: "Rajasthan",
                price: "₹799",
                image:
                  "/attached_assets/stock_images/rajasthan_fort_palac_133a86f2.jpg",
                desc: "Royal palaces & rich heritage",
              },
              {
                name: "Rishikesh",
                price: "₹699",
                image:
                  "/attached_assets/stock_images/rishikesh_ganges_riv_d4cfd7b4.jpg",
                desc: "Yoga capital & river rafting",
              },
              {
                name: "Kerala",
                price: "₹999",
                image:
                  "/attached_assets/stock_images/kerala_backwaters_ho_d51783fa.jpg",
                desc: "Backwaters & houseboats",
              },
              {
                name: "Udaipur",
                price: "₹1,099",
                image:
                  "/attached_assets/stock_images/udaipur_lake_palace__716cd333.jpg",
                desc: "Lake city of romance",
              },
            ].map((destination) => (
              <div
                key={destination.name}
                className="group cursor-pointer overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300"
                onClick={() =>
                  setLocation(`/search?destination=${destination.name}`)
                }
                data-testid={`destination-card-${destination.name.toLowerCase()}`}
              >
                {/* Full-bleed image with hover zoom */}
                <div className="relative h-72 overflow-hidden">
                  <img
                    src={destination.image}
                    alt={destination.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {/* Light overlay (20-25%) for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-black/10" />
                  {/* White text overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3
                      className="text-2xl font-bold text-white mb-1"
                      style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
                    >
                      {destination.name}
                    </h3>
                    <p
                      className="text-white/90 text-sm mb-2"
                      style={{ textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}
                    >
                      {destination.desc}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-white font-bold text-base">
                        From {destination.price}/night
                      </p>
                      <div className="flex items-center gap-1 text-white font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Explore</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Why ZECOHO Beats OTAs - Clean, Minimal Design */}
      <div className="py-20 px-4 md:px-6 bg-background">
        <div className="container mx-auto max-w-5xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              data-testid="text-why-choose-heading"
            >
              Why ZECOHO Beats OTAs
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Transparent pricing. Direct access. Zero hidden fees.
            </p>
          </div>

          {/* Minimal Feature Grid - Icons Only, No Photos */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Percent,
                title: "Zero Commission",
                desc: "Hotels don't pay us commission, so they charge you less.",
                color: "text-emerald-600 dark:text-emerald-400",
              },
              {
                icon: HandCoins,
                title: "No Hidden Fees",
                desc: "No convenience fees. No service charges. What you see is what you pay.",
                color: "text-amber-600 dark:text-amber-400",
              },
              {
                icon: MessageCircle,
                title: "Direct Communication",
                desc: "Chat directly with the hotel. No middleman delays.",
                color: "text-blue-600 dark:text-blue-400",
              },
              {
                icon: TrendingDown,
                title: "15–25% Lower Prices",
                desc: "Same hotel, same room — just without the OTA markup.",
                color: "text-rose-600 dark:text-rose-400",
              },
              {
                icon: ShieldCheck,
                title: "Verified Properties",
                desc: "Every listing is manually verified for quality and authenticity.",
                color: "text-violet-600 dark:text-violet-400",
              },
              {
                icon: Handshake,
                title: "Negotiate Directly",
                desc: "Request special rates, upgrades, or flexible check-in times.",
                color: "text-cyan-600 dark:text-cyan-400",
              },
            ].map((feature, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0">
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ZECOHO vs OTAs - Detailed Comparison Table */}
      <div className="py-16 px-4 md:px-6 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              ZECOHO vs OTAs — Who Actually Saves You Money?
            </h2>
            <p className="text-muted-foreground">
              A side-by-side comparison of what you get
            </p>
          </div>

          {/* Comparison Table */}
          <Card className="rounded-2xl border shadow-lg overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-comparison">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-semibold">Feature</th>
                    <th className="text-center p-4">
                      <span className="font-bold text-lg text-primary">
                        ZECOHO
                      </span>
                    </th>
                    <th className="text-center p-4">
                      <span className="font-semibold text-muted-foreground">
                        Other OTAs
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium">Commission</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                        <Check className="h-5 w-5" />
                        0%
                      </span>
                    </td>
                    <td className="p-4 text-center text-rose-500 font-medium">
                      15–25%
                    </td>
                  </tr>
                  <tr className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium">Convenience Fee</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                        <Check className="h-5 w-5" />
                        ₹0
                      </span>
                    </td>
                    <td className="p-4 text-center text-rose-500 font-medium">
                      ₹200–₹400
                    </td>
                  </tr>
                  <tr className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium">Pricing Markup</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                        <Check className="h-5 w-5" />
                        None
                      </span>
                    </td>
                    <td className="p-4 text-center text-rose-500 font-medium">
                      Yes (Dynamic Pricing)
                    </td>
                  </tr>
                  <tr className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium">Direct Contact</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                        <Check className="h-5 w-5" />
                        Yes
                      </span>
                    </td>
                    <td className="p-4 text-center text-rose-500 font-medium">
                      No
                    </td>
                  </tr>
                  <tr className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium">Cancellation Clarity</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                        <Check className="h-5 w-5" />
                        High
                      </span>
                    </td>
                    <td className="p-4 text-center text-rose-500 font-medium">
                      Low
                    </td>
                  </tr>
                  <tr className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium">Hidden Charges</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                        <Check className="h-5 w-5" />
                        None
                      </span>
                    </td>
                    <td className="p-4 text-center text-rose-500 font-medium">
                      Many Cases
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium">Token-Based Booking</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                        <Check className="h-5 w-5" />
                        Yes
                      </span>
                    </td>
                    <td className="p-4 text-center text-rose-500 font-medium">
                      No
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* CTA Button */}
          <div className="text-center">
            <Button
              size="lg"
              onClick={() => setLocation("/search")}
              className="font-semibold group"
              data-testid="button-book-direct-comparison"
            >
              Book Direct & Save More
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 px-4 md:px-6 bg-white dark:bg-slate-900 border-t border-b border-border">
        <div className="container mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-white">
                <AnimatedCounter end={56} suffix="+" />
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Verified Properties
              </div>
            </div>
            <div className="hidden md:block w-px h-16 bg-slate-300 dark:bg-slate-600" />
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-white">
                <AnimatedCounter end={65} suffix="+" />
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Indian Destinations
              </div>
            </div>
            <div className="hidden md:block w-px h-16 bg-slate-300 dark:bg-slate-600" />
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-amber-500 dark:text-amber-400">
                0%
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Commission Fee
              </div>
            </div>
            <div className="hidden md:block w-px h-16 bg-slate-300 dark:bg-slate-600" />
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-emerald-500 dark:text-emerald-400">
                15-25%
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                You Save
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
