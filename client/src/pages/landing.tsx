import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import { Card, CardContent } from "@/components/ui/card";
import { Building, Home as HomeIcon, Hotel, Mountain, Waves, TreePine, Wheat, Heart } from "lucide-react";
import { useLocation, Link } from "wouter";
import heroImage from "@assets/generated_images/luxury_villa_hero_image.png";

export default function Landing() {
  const [, setLocation] = useLocation();

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
            asChild
          >
            <a href="/api/login" data-testid="button-login-hero">
              Login / Sign Up
            </a>
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

      {/* Features Section */}
      <div className="bg-muted py-16">
        <div className="container px-4 md:px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Hotel className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">ZERO Commission</h3>
              <p className="text-muted-foreground">
                No platform fees, no booking charges. Pay only what the property owner charges — nothing more!
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <HomeIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Direct Connection</h3>
              <p className="text-muted-foreground">
                Book straight from property owners. No middleman markup, just genuine prices.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mountain className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Maximum Savings</h3>
              <p className="text-muted-foreground">
                Other platforms charge commission. We charge ZERO. Those savings go to YOU!
              </p>
            </div>
          </div>
        </div>
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
