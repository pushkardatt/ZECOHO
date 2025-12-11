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
import heroImage from "@assets/generated_images/mountain_resort_balcony_view.png";
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

      {/* Hero Section - Cinematic & Impressive */}
      <div className="relative min-h-[600px] md:min-h-[680px] flex items-center justify-center overflow-hidden">
        {/* Background with Parallax Effect */}
        <div 
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        {/* Dramatic Gradient Overlay - Darkened for better text contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-rose-900/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20" />
        
        <div className="relative z-10 container px-4 md:px-6 text-center py-12 pt-24">
          {/* Premium Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-white/90 text-sm font-medium">India's First Zero Commission Platform</span>
          </div>

          {/* Main Headline with Gradient */}
          <h1 
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-tight tracking-tight" 
            data-testid="text-hero-title"
            style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5), 0 4px 40px rgba(0,0,0,0.3)' }}
          >
            Book Hotels at Guaranteed Lowest Prices{" "}
            <span className="bg-gradient-to-r from-amber-400 via-rose-400 to-rose-500 bg-clip-text text-transparent drop-shadow-lg">
              — Cheaper Than OTA Platforms
            </span>
          </h1>
          <p 
            className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto font-light"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}
          >
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

          {/* Trust Badges - Simple + Powerful */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
              <Hotel className="h-4 w-4 text-amber-400" />
              <span className="text-white/90 text-sm">Direct from Hotel — No Middleman</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-white/90 text-sm">No Hidden Fees — No Convenience Charges</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
              <MessageCircle className="h-4 w-4 text-green-400" />
              <span className="text-white/90 text-sm">Instant WhatsApp Confirmation</span>
            </div>
          </div>
        </div>
        
        {/* Bottom Fade for Smooth Transition */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Discover India Section - Enhanced (Moved to top for inspiration) */}
      <div className="py-16 px-4 md:px-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <Badge className="mb-3 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-0 px-3 py-1">
                <MapPin className="h-3 w-3 mr-1" />
                Explore India
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

      {/* Popular Destinations Section */}
      <div className="py-16 px-4 md:px-6 bg-background">
        <div className="container mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Popular Destinations</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Discover amazing stays at India's most loved destinations</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: "Goa", price: "₹899", image: "/attached_assets/stock_images/goa_beach_india_suns_fcb832ea.jpg" },
              { name: "Manali", price: "₹1,199", image: "/attached_assets/stock_images/manali_mountains_him_01ba7d34.jpg" },
              { name: "Jaipur", price: "₹799", image: "/attached_assets/stock_images/jaipur_hawa_mahal_pi_f05b7750.jpg" },
              { name: "Rishikesh", price: "₹699", image: "/attached_assets/stock_images/rishikesh_ganges_riv_88870393.jpg" },
              { name: "Ooty", price: "₹999", image: "/attached_assets/stock_images/ooty_tea_gardens_hil_06b99c0a.jpg" },
              { name: "Udaipur", price: "₹1,099", image: "/attached_assets/stock_images/udaipur_lake_palace__7af7058e.jpg" },
            ].map((destination) => (
              <div
                key={destination.name}
                className="group cursor-pointer overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => setLocation(`/search?destination=${destination.name}`)}
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
                    <h3 className="text-2xl font-bold text-white mb-1">{destination.name}</h3>
                    <p className="text-white/90 text-sm mb-3">Stays from <span className="font-semibold text-amber-400">{destination.price}</span></p>
                    <div className="flex items-center gap-1 text-white font-medium text-sm group-hover:text-amber-400 transition-colors">
                      View Stays <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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
          <div className="flex flex-wrap gap-4 justify-center">
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
        </div>
      </div>
    </div>
  );
}
