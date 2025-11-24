import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import { Card, CardContent } from "@/components/ui/card";
import { Building, Home as HomeIcon, Hotel, Mountain, Waves, TreePine } from "lucide-react";
import { useLocation } from "wouter";
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
    { icon: Mountain, label: "Cabins", type: "cabin" },
    { icon: Building, label: "Apartments", type: "apartment" },
    { icon: Waves, label: "Resorts", type: "resort" },
    { icon: TreePine, label: "Lodges", type: "lodge" },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section with Search */}
      <div className="relative h-[600px] flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />
        </div>
        
        <div className="relative z-10 container px-4 md:px-6 text-center">
          <div className="flex justify-center gap-3 mb-6">
            <Button 
              size="sm"
              variant="outline" 
              className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
              asChild
            >
              <a href="/api/login" data-testid="button-login-top">
                Login
              </a>
            </Button>
            <Button 
              size="sm"
              variant="outline" 
              className="bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30"
              asChild
            >
              <a href="/api/login" data-testid="button-create-account-top">
                Create your account
              </a>
            </Button>
          </div>
          
          <div className="mb-6" data-testid="brand-logo">
            <h1 className="text-6xl md:text-7xl font-extrabold text-white tracking-tight mb-2">
              ZECOHO
            </h1>
            <p className="text-lg md:text-xl text-white/80 font-light tracking-wide">
              Your Journey, Our Passion
            </p>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" data-testid="text-hero-title">
            Ready to start your journey?
          </h2>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
            Discover unique accommodations from hotels to villas, hostels to resorts
          </p>
          
          <div className="flex justify-center mb-8">
            <SearchBar onSearch={handleSearch} />
          </div>
          
          <Button 
            size="lg" 
            variant="outline" 
            className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
            asChild
          >
            <a href="/api/login" data-testid="button-get-started">
              Get Started
            </a>
          </Button>
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
              <h3 className="text-xl font-semibold mb-2">Verified Properties</h3>
              <p className="text-muted-foreground">
                All properties are verified for quality and authenticity
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <HomeIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Best Prices</h3>
              <p className="text-muted-foreground">
                Find competitive rates with no hidden fees
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mountain className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Unique Experiences</h3>
              <p className="text-muted-foreground">
                Discover stays that create lasting memories
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container px-4 md:px-6 py-16 text-center">
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Join thousands of travelers finding their perfect stay
        </p>
        <Button size="lg" asChild data-testid="button-cta-login">
          <a href="/api/login">Create your account</a>
        </Button>
      </div>
    </div>
  );
}
