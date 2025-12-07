import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { MapPin, Calendar, ArrowLeft, Sparkles, Star, Building, Landmark, Camera, UtensilsCrossed, Mountain, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Destination, Property } from "@shared/schema";

export default function DestinationDetails() {
  const [, params] = useRoute("/destinations/:id");
  const [, setLocation] = useLocation();
  const destinationId = params?.id;

  const { data: destination, isLoading } = useQuery<Destination>({
    queryKey: ["/api/destinations", destinationId],
    enabled: !!destinationId,
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const destinationProperties = destination
    ? properties.filter(
        (p) =>
          p.destination.toLowerCase() === destination.name.toLowerCase() ||
          p.destination.toLowerCase() === destination.state.toLowerCase()
      )
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container px-4 md:px-6 py-8">
          <Skeleton className="h-8 w-24 mb-6" />
          <Skeleton className="aspect-[21/9] rounded-lg mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-4">
              <Skeleton className="h-48 rounded-lg" />
              <Skeleton className="h-48 rounded-lg" />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!destination) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Destination not found</h2>
          <p className="text-muted-foreground mb-6">
            The destination you're looking for doesn't exist.
          </p>
          <Button onClick={() => setLocation("/destinations")} data-testid="button-back-to-destinations">
            Back to Destinations
          </Button>
        </div>
      </div>
    );
  }

  const famousForItems = destination.famousFor && destination.famousFor.length > 0
    ? destination.famousFor
    : generateFamousFor(destination);

  const thingsToDoItems = destination.thingsToDo && destination.thingsToDo.length > 0
    ? destination.thingsToDo
    : generateThingsToDo(destination);

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 md:px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => setLocation("/destinations")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Destinations
        </Button>

        <div
          className="h-80 rounded-lg bg-cover bg-center relative mb-8"
          style={{ backgroundImage: `url(${destination.imageUrl})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-lg" />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2" data-testid="text-destination-name">
                  {destination.name}
                </h1>
                <div className="flex items-center gap-2 text-white/90 text-lg">
                  <MapPin className="h-5 w-5" />
                  <span>{destination.state}</span>
                </div>
              </div>
              {destination.isFeatured && (
                <Badge variant="secondary" className="bg-yellow-500/90 text-white border-0">
                  <Sparkles className="h-4 w-4 mr-1" />
                  Featured
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6 order-2 lg:order-1">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">
                    {destinationProperties.length > 0
                      ? `${destinationProperties.length} Properties Available`
                      : "Available Hotels"}
                  </h3>
                </div>
                
                {destinationProperties.length > 0 ? (
                  <div className="space-y-4">
                    {destinationProperties.slice(0, 4).map((property) => (
                      <div
                        key={property.id}
                        className="flex gap-3 p-3 rounded-lg border hover-elevate cursor-pointer"
                        onClick={() => setLocation(`/properties/${property.id}`)}
                        data-testid={`card-property-${property.id}`}
                      >
                        <div
                          className="w-20 h-20 rounded-md bg-cover bg-center flex-shrink-0"
                          style={{
                            backgroundImage: property.images?.[0]
                              ? `url(${property.images[0]})`
                              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{property.name}</h4>
                          <p className="text-sm text-muted-foreground capitalize">{property.propertyType}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{property.rating || "New"}</span>
                          </div>
                          <p className="text-sm font-semibold text-primary mt-1">
                            From ₹{property.startingPrice?.toLocaleString() || "N/A"}/night
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {destinationProperties.length > 4 && (
                      <p className="text-sm text-muted-foreground text-center">
                        +{destinationProperties.length - 4} more properties
                      </p>
                    )}
                    
                    <Button
                      onClick={() =>
                        setLocation(`/search?destination=${encodeURIComponent(destination.name)}`)
                      }
                      className="w-full"
                      data-testid="button-view-all-properties"
                    >
                      View All Properties
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Building className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground mb-4">
                      No properties listed in {destination.name} yet.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setLocation(`/search?destination=${encodeURIComponent(destination.name)}`)}
                      data-testid="button-search-nearby"
                    >
                      Search Nearby
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {destination.bestSeason && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Best Time to Visit</h3>
                  </div>
                  <p className="text-muted-foreground">{destination.bestSeason}</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-4">About {destination.name}</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {destination.shortDescription}
                </p>
                {destination.detailedInsight && (
                  <p className="text-muted-foreground leading-relaxed">
                    {destination.detailedInsight}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Landmark className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-semibold">Famous For</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {famousForItems.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {getIconForItem(item, idx)}
                      </div>
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-semibold">Things to Do</h2>
                </div>
                <div className="space-y-3">
                  {thingsToDoItems.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-semibold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm">{item}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {destination.highlights && destination.highlights.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Highlights</h2>
                  <ul className="space-y-2">
                    {destination.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                        <span className="text-primary mt-1">•</span>
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function generateFamousFor(destination: Destination): string[] {
  const name = destination.name.toLowerCase();
  
  const famousForMap: Record<string, string[]> = {
    "jaipur": ["Pink City architecture", "Hawa Mahal palace", "Amber Fort", "Traditional Rajasthani handicrafts", "Royal heritage and culture"],
    "udaipur": ["Lake Pichola boat rides", "City Palace museum", "Romantic sunset views", "Mewar paintings", "Traditional Rajasthani cuisine"],
    "goa": ["Beautiful beaches", "Portuguese heritage sites", "Vibrant nightlife", "Seafood delicacies", "Water sports adventures"],
    "mumbai": ["Gateway of India", "Bollywood film industry", "Marine Drive promenade", "Street food culture", "Historic architecture"],
    "delhi": ["Red Fort heritage", "India Gate memorial", "Diverse culinary scene", "Historical monuments", "Shopping markets"],
    "agra": ["Taj Mahal wonder", "Mughal architecture", "Agra Fort", "Marble handicrafts", "Petha sweets"],
    "varanasi": ["Sacred Ganges ghats", "Ancient temples", "Spiritual experiences", "Silk weaving", "Evening aarti ceremony"],
    "kerala": ["Backwater cruises", "Ayurvedic treatments", "Lush tea plantations", "Kathakali dance", "Spice gardens"],
    "manali": ["Snow-capped mountains", "Adventure sports", "Solang Valley", "Hadimba Temple", "Apple orchards"],
    "shimla": ["Colonial architecture", "Mall Road shopping", "Toy train ride", "Pine forests", "Pleasant summer climate"],
    "darjeeling": ["World-famous tea gardens", "Himalayan views", "Toy train heritage", "Buddhist monasteries", "Sunrise at Tiger Hill"],
    "rishikesh": ["Yoga and meditation", "River rafting", "Laxman Jhula bridge", "Spiritual ashrams", "Adventure camping"],
    "amritsar": ["Golden Temple", "Wagah Border ceremony", "Punjabi cuisine", "Jallianwala Bagh", "Rich Sikh heritage"],
  };

  if (famousForMap[name]) {
    return famousForMap[name];
  }

  return [
    `Rich cultural heritage of ${destination.state}`,
    "Local traditional cuisine",
    "Historical monuments and sites",
    "Natural scenic beauty",
    "Warm hospitality"
  ];
}

function generateThingsToDo(destination: Destination): string[] {
  const name = destination.name.toLowerCase();
  
  const thingsToDoMap: Record<string, string[]> = {
    "jaipur": ["Explore the magnificent Amber Fort", "Watch sunset from Nahargarh Fort", "Shop for traditional textiles at Johari Bazaar", "Visit the astronomical observatory Jantar Mantar", "Experience a traditional Rajasthani dinner"],
    "udaipur": ["Take a boat ride on Lake Pichola", "Explore the grand City Palace", "Watch cultural performances at Bagore Ki Haveli", "Visit the peaceful Saheliyon Ki Bari garden", "Enjoy rooftop dining with lake views"],
    "goa": ["Relax on the pristine beaches of Palolem or Baga", "Explore Old Goa's Portuguese churches", "Try water sports at Calangute Beach", "Visit the vibrant Saturday Night Market", "Enjoy fresh seafood at beach shacks"],
    "mumbai": ["Visit the iconic Gateway of India", "Explore the caves of Elephanta Island", "Walk along Marine Drive at sunset", "Experience the bustling Colaba Causeway", "Tour the famous Bollywood studios"],
    "delhi": ["Explore the historic Red Fort", "Visit the towering Qutub Minar", "Shop at Chandni Chowk markets", "Pay respects at India Gate", "Experience the peaceful Lotus Temple"],
    "agra": ["Marvel at the Taj Mahal at sunrise", "Explore the massive Agra Fort", "Visit the abandoned city of Fatehpur Sikri", "Shop for marble inlay crafts", "Taste authentic Mughlai cuisine"],
    "varanasi": ["Attend the evening Ganga Aarti ceremony", "Take a sunrise boat ride on the Ganges", "Explore the narrow galis and ghats", "Visit the ancient Kashi Vishwanath Temple", "Shop for Banarasi silk sarees"],
    "kerala": ["Cruise through the serene backwaters", "Experience authentic Ayurvedic spa treatments", "Visit the tea gardens of Munnar", "Watch a Kathakali dance performance", "Enjoy fresh Kerala cuisine"],
    "manali": ["Trek to the Solang Valley", "Visit the ancient Hadimba Temple", "Experience paragliding adventures", "Explore the hot springs at Vashisht", "Take a trip to Rohtang Pass"],
    "shimla": ["Walk along the iconic Mall Road", "Ride the heritage toy train", "Visit the historic Christ Church", "Explore the Viceregal Lodge", "Trek to Jakhu Temple"],
    "darjeeling": ["Watch sunrise from Tiger Hill", "Visit the famous tea estates", "Ride the UNESCO heritage toy train", "Explore the Peace Pagoda", "Visit the Himalayan Mountaineering Institute"],
    "rishikesh": ["Practice yoga at an ashram", "Go white water rafting", "Walk across Laxman Jhula", "Attend the evening aarti at Triveni Ghat", "Try bungee jumping or cliff diving"],
    "amritsar": ["Seek blessings at the Golden Temple", "Witness the Wagah Border ceremony", "Pay homage at Jallianwala Bagh", "Feast on Amritsari kulcha and lassi", "Explore the historic Partition Museum"],
  };

  if (thingsToDoMap[name]) {
    return thingsToDoMap[name];
  }

  return [
    `Explore the local markets and bazaars of ${destination.name}`,
    "Visit historical monuments and heritage sites",
    "Try authentic local cuisine and street food",
    "Experience local cultural performances",
    "Take scenic walks and photography tours"
  ];
}

function getIconForItem(item: string, index: number): JSX.Element {
  const lowerItem = item.toLowerCase();
  
  if (lowerItem.includes('food') || lowerItem.includes('cuisine') || lowerItem.includes('restaurant')) {
    return <UtensilsCrossed className="h-4 w-4 text-primary" />;
  }
  if (lowerItem.includes('mountain') || lowerItem.includes('hill') || lowerItem.includes('trek') || lowerItem.includes('valley')) {
    return <Mountain className="h-4 w-4 text-primary" />;
  }
  if (lowerItem.includes('shop') || lowerItem.includes('market') || lowerItem.includes('bazaar') || lowerItem.includes('handicraft')) {
    return <ShoppingBag className="h-4 w-4 text-primary" />;
  }
  if (lowerItem.includes('temple') || lowerItem.includes('fort') || lowerItem.includes('palace') || lowerItem.includes('heritage') || lowerItem.includes('monument')) {
    return <Landmark className="h-4 w-4 text-primary" />;
  }
  if (lowerItem.includes('view') || lowerItem.includes('sunset') || lowerItem.includes('sunrise') || lowerItem.includes('scenic')) {
    return <Camera className="h-4 w-4 text-primary" />;
  }
  
  const icons = [Landmark, Camera, UtensilsCrossed, Mountain, ShoppingBag];
  const IconComponent = icons[index % icons.length];
  return <IconComponent className="h-4 w-4 text-primary" />;
}
