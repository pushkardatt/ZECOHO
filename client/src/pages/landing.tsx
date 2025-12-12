import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import { PropertyCard } from "@/components/PropertyCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building, Home as HomeIcon, Hotel, Mountain, Waves, TreePine, Wheat, Heart, MapPin, Calendar, Handshake, TrendingDown, Shield, Sparkles, Check, Percent, BadgeCheck, HandCoins, FileCheck2, Star, ArrowRight, ChevronRight, MessageCircle, ShieldCheck } from "lucide-react";
import { useLocation, Link } from "wouter";
import type { Property, Destination } from "@shared/schema";
import heroImage from "@assets/stock_images/luxury_resort_infini_49df439c.jpg";
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

export default function Landing() {
  const [, setLocation] = useLocation();
  const [showStickySearch, setShowStickySearch] = useState(false);

  // Track scroll position for sticky search bar
  useEffect(() => {
    const handleScroll = () => {
      // Show sticky bar after scrolling past 400px (past the hero search bar)
      setShowStickySearch(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      {/* Sticky Search Bar - Appears on Scroll */}
      <div 
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
          showStickySearch 
            ? "translate-y-0 opacity-100" 
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}
        data-testid="sticky-search-bar"
      >
        <div className="bg-white dark:bg-background border-b shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <Link href="/">
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0" data-testid="link-sticky-logo">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-lg">Z</span>
                  </div>
                  <span className="font-bold text-lg text-foreground hidden sm:block">ZECOHO</span>
                </div>
              </Link>
              {/* Compact Search Bar */}
              <div className="flex-1">
                <SearchBar onSearch={handleSearch} compact={true} showDates={true} showGuests={true} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Navigation Header with Logo */}
      <header className="absolute top-0 left-0 right-0 z-50 px-4 md:px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" data-testid="link-home-logo">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg">
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

      {/* Hero Section - Premium High-Impact Design */}
      <div className="relative min-h-[490px] md:min-h-[520px] flex items-center justify-center overflow-hidden">
        {/* Background - Soft Blurred Luxury Resort Pool */}
        <div 
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ 
            backgroundImage: `url(${heroImage})`,
            filter: 'blur(3px) brightness(1.06)',
          }}
        />
        {/* 45% Black Overlay for text readability */}
        <div className="absolute inset-0 bg-black/45" />
        
        <div className="relative z-10 container px-4 md:px-6 text-center py-12 pt-24">
          {/* Premium Badge - Subtle */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-white/90 text-xs font-medium">India's First Zero Commission Platform</span>
          </div>

          {/* Main Headline - Pixel Perfect Typography */}
          <h1 
            className="text-[28px] md:text-[54px] font-extrabold text-white leading-[1.2] md:leading-[1.1] tracking-tight mb-1" 
            data-testid="text-hero-title"
            style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
          >
            Book Hotels at True Prices —
          </h1>
          <h1 
            className="text-[32px] md:text-[58px] font-extrabold leading-[1.2] md:leading-[1.1] tracking-tight mb-2.5 md:mb-3"
            style={{ 
              background: 'linear-gradient(90deg, #FF7A00, #FF2768)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none'
            }}
          >
            Cheaper Than OTAs
          </h1>
          
          {/* Subheadline */}
          <p 
            className="text-base md:text-xl text-white font-normal md:font-medium leading-[1.4] mb-7 md:mb-8 max-w-2xl mx-auto"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}
          >
            Direct booking. Zero commission. Zero hidden fees. Save 15–25% instantly.
          </p>

          {/* Airbnb-Style Search Bar */}
          <div className="max-w-4xl mx-auto mb-6">
            <SearchBar 
              onSearch={handleSearch} 
              compact={false} 
              showDates={true} 
              showGuests={true} 
              ctaText="Find Lowest Direct Prices →"
            />
          </div>

          {/* Trust Badges Under Search Bar */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            <div className="flex items-center gap-1.5">
              <Hotel className="h-4 w-4 text-amber-400" />
              <span className="text-white/90 text-sm">Direct from Hotel</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-white/90 text-sm">No Hidden Fees</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4 text-green-400" />
              <span className="text-white/90 text-sm">WhatsApp Confirmation</span>
            </div>
          </div>
        </div>
        
        {/* Bottom Fade for Smooth Transition */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
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
              <h2 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-discover-india-heading">Discover Incredible India</h2>
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

          {/* Single Grid - Bright, Scenic Tiles (No Dark Overlay) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: "Goa", price: "₹899", image: "/attached_assets/stock_images/goa_beach_sunset_pal_1c0ebb32.jpg", desc: "Sun, sand & vibrant nightlife" },
              { name: "Himalayas", price: "₹1,199", image: "/attached_assets/stock_images/himalayas_snow_mount_acec5fcd.jpg", desc: "Snow-capped peaks & adventure" },
              { name: "Rajasthan", price: "₹799", image: "/attached_assets/stock_images/rajasthan_fort_palac_133a86f2.jpg", desc: "Royal palaces & rich heritage" },
              { name: "Rishikesh", price: "₹699", image: "/attached_assets/stock_images/rishikesh_ganges_riv_d4cfd7b4.jpg", desc: "Yoga capital & river rafting" },
              { name: "Kerala", price: "₹999", image: "/attached_assets/stock_images/kerala_backwaters_ho_d51783fa.jpg", desc: "Backwaters & houseboats" },
              { name: "Udaipur", price: "₹1,099", image: "/attached_assets/stock_images/udaipur_lake_palace__716cd333.jpg", desc: "Lake city of romance" },
            ].map((destination) => (
              <div
                key={destination.name}
                className="group cursor-pointer overflow-hidden rounded-2xl bg-white dark:bg-card shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                onClick={() => setLocation(`/search?destination=${destination.name}`)}
                data-testid={`destination-card-${destination.name.toLowerCase()}`}
              >
                {/* Bright image - no dark overlay */}
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={destination.image}
                    alt={destination.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                {/* Content below image - clean card style */}
                <div className="p-5">
                  <h3 className="text-xl font-bold text-foreground mb-1">{destination.name}</h3>
                  <p className="text-muted-foreground text-sm mb-3">{destination.desc}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-primary font-bold text-base">From {destination.price}/night</p>
                    <div className="flex items-center gap-1 text-primary font-semibold text-sm group-hover:gap-2 transition-all">
                      <span>Explore</span>
                      <ArrowRight className="h-4 w-4" />
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

      {/* Why Zecoho Beats OTAs - Comparison Table */}
      <div className="py-20 px-4 md:px-6 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-0 px-4 py-1.5">
              The Clear Choice
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4" data-testid="text-why-choose-heading">
              Why Zecoho{" "}
              <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                Beats OTAs
              </span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              See the difference — transparent pricing, direct access, zero hidden fees
            </p>
          </div>
          
          {/* Comparison Table */}
          <div className="max-w-4xl mx-auto mb-12">
            <Card className="rounded-2xl border shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-comparison">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-4 font-semibold text-muted-foreground">Feature</th>
                      <th className="text-center p-4">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-bold text-lg text-primary">Zecoho</span>
                        </div>
                      </th>
                      <th className="text-center p-4">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-semibold text-muted-foreground">Other OTA</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-medium">Commission Charged to Hotels</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                          <Check className="h-5 w-5" />
                          0%
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-rose-500 font-medium">15–25%</span>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-medium">Convenience Fee to User</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                          <Check className="h-5 w-5" />
                          ₹0
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-rose-500 font-medium">₹200–₹400</span>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-medium">Direct Hotel Contact</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                          <Check className="h-5 w-5" />
                          Yes
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-rose-500 font-medium">Hidden</span>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-medium">Direct Negotiation</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                          <Check className="h-5 w-5" />
                          Yes
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-rose-500 font-medium">No</span>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-medium">Real Price Transparency</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                          <Check className="h-5 w-5" />
                          Yes
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-rose-500 font-medium">Hidden charges</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-medium">WhatsApp Confirmation</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                          <Check className="h-5 w-5" />
                          Instant
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-rose-500 font-medium">Sometimes delayed</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
          
          {/* 3 Feature Cards Under Table */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="rounded-2xl border-0 shadow-lg overflow-hidden hover-elevate">
              <CardContent className="p-6 text-center">
                <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-xl inline-flex mb-4">
                  <HandCoins className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">Pay the Real Price</h3>
                <p className="text-muted-foreground text-sm">
                  No markup. No commission. No inflated OTA rates.
                </p>
              </CardContent>
            </Card>
            
            <Card className="rounded-2xl border-0 shadow-lg overflow-hidden hover-elevate">
              <CardContent className="p-6 text-center">
                <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-xl inline-flex mb-4">
                  <MessageCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">Chat Directly with Hotel</h3>
                <p className="text-muted-foreground text-sm">
                  Ask questions, request early check-in, confirm amenities.
                </p>
              </CardContent>
            </Card>
            
            <Card className="rounded-2xl border-0 shadow-lg overflow-hidden hover-elevate">
              <CardContent className="p-6 text-center">
                <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl inline-flex mb-4">
                  <ShieldCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">Verified Properties Only</h3>
                <p className="text-muted-foreground text-sm">
                  Manually verified for authenticity & quality.
                </p>
              </CardContent>
            </Card>
          </div>
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
              <h2 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-featured-stays-heading">Featured Stays</h2>
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
                <PropertyCard
                  key={property.id}
                  property={property}
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

      {/* Stats Section */}
      <div className="py-16 px-4 md:px-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white">
                <AnimatedCounter end={56} suffix="+" />
              </div>
              <div className="text-slate-400 text-sm mt-1">Verified Properties</div>
            </div>
            <div className="hidden md:block w-px h-16 bg-slate-600" />
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white">
                <AnimatedCounter end={65} suffix="+" />
              </div>
              <div className="text-slate-400 text-sm mt-1">Indian Destinations</div>
            </div>
            <div className="hidden md:block w-px h-16 bg-slate-600" />
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-amber-400">
                0%
              </div>
              <div className="text-slate-400 text-sm mt-1">Commission Fee</div>
            </div>
            <div className="hidden md:block w-px h-16 bg-slate-600" />
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-emerald-400">
                15-25%
              </div>
              <div className="text-slate-400 text-sm mt-1">You Save</div>
            </div>
          </div>
        </div>
      </div>

      {/* List Your Property CTA Banner - Near Footer */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white py-6 px-4 md:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
              <HomeIcon className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-bold text-xl">Own a Property?</h3>
              <p className="text-sm text-white/80">List your property and reach customers directly — zero commission for you too!</p>
            </div>
          </div>
          <Button 
            variant="secondary"
            size="lg"
            onClick={() => setLocation("/list-property")}
            data-testid="button-list-property-cta-footer"
            className="whitespace-nowrap shadow-lg font-semibold group"
          >
            List Your Property FREE
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
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
          <div className="flex flex-wrap gap-4 justify-center mb-6">
            <Button 
              size="lg" 
              variant="secondary"
              className="shadow-lg font-semibold group"
              onClick={() => setLocation("/search")}
              data-testid="button-cta-find-stay"
            >
              Find Your Stay
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 shadow-lg font-semibold group"
              onClick={() => setLocation("/list-property")}
              data-testid="button-cta-list-property"
            >
              List Your Property
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
          <p className="text-white/80 text-sm">
            Thousands of smart travelers are already booking direct and saving big.
          </p>
        </div>
      </div>
    </div>
  );
}
