import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { ChevronRight } from "lucide-react";
import { PropertyCard } from "@/components/PropertyCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import type { Property } from "@shared/schema";
import NotFound from "@/pages/not-found";

const CITY_SLUG_MAP: Record<string, string> = {
  goa: "Goa",
  indore: "Indore",
  manali: "Manali",
  shimla: "Shimla",
  jaipur: "Jaipur",
  delhi: "Delhi",
};

const CANONICAL_ORIGIN = "https://www.zecoho.com";
const JSON_LD_CAP = 20;

export default function CityHotels() {
  const params = useParams<{ citySlug: string }>();
  const citySlug = (params?.citySlug || "").toLowerCase();
  const cityName = CITY_SLUG_MAP[citySlug];

  const { user } = useAuth();

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    refetchInterval: 300000,
    enabled: !!cityName,
  });

  const { data: wishlists = [] } = useQuery<any[]>({
    queryKey: ["/api/wishlists"],
    enabled: !!cityName && user?.userRole === "guest",
  });

  if (!cityName) {
    return <NotFound />;
  }

  const wishlistedPropertyIds = new Set(
    wishlists.map((w: any) => w.propertyId),
  );

  const cityLower = cityName.toLowerCase();
  const cityProperties = properties.filter((p) => {
    if (p.status !== "published") return false;
    const destinationLower = (p.destination || "").toLowerCase();
    const titleLower = (p.title || "").toLowerCase();
    const propCityLower = (p.propCity || "").toLowerCase();
    const propStateLower = (p.propState || "").toLowerCase();
    return (
      destinationLower.includes(cityLower) ||
      titleLower.includes(cityLower) ||
      propCityLower.includes(cityLower) ||
      propStateLower.includes(cityLower)
    );
  });

  const pageUrl = `${CANONICAL_ORIGIN}/hotels/${citySlug}`;
  const pageTitle = `Hotels in ${cityName} - Zero Commission Booking | ZECOHO`;
  const pageDescription = `Book hotels in ${cityName} with zero commission. Best prices guaranteed. No hidden charges.`;

  const jsonLdItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Hotels in ${cityName}`,
    numberOfItems: Math.min(cityProperties.length, JSON_LD_CAP),
    itemListElement: cityProperties.slice(0, JSON_LD_CAP).map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "Hotel",
        name: p.title,
        url: `${CANONICAL_ORIGIN}/properties/${p.id}`,
        image: (p as any).images?.[0] || undefined,
        address: {
          "@type": "PostalAddress",
          addressLocality: p.propCity || cityName,
          addressRegion: p.propState || undefined,
          addressCountry: "IN",
        },
        ...(p.rating && Number(p.rating) > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: Number(p.rating),
                reviewCount: p.reviewCount || 1,
              },
            }
          : {}),
      },
    })),
  };

  const jsonLdBreadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${CANONICAL_ORIGIN}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Hotels",
        item: `${CANONICAL_ORIGIN}/search`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: cityName,
        item: pageUrl,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={pageUrl} />
        <script type="application/ld+json">
          {JSON.stringify(jsonLdItemList)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(jsonLdBreadcrumbs)}
        </script>
      </Helmet>

      <div className="container px-4 md:px-6 py-6">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
            <li>
              <Link
                href="/"
                className="hover:text-foreground"
                data-testid="breadcrumb-home"
              >
                Home
              </Link>
            </li>
            <ChevronRight className="h-3.5 w-3.5" />
            <li>
              <Link
                href="/search"
                className="hover:text-foreground"
                data-testid="breadcrumb-hotels"
              >
                Hotels
              </Link>
            </li>
            <ChevronRight className="h-3.5 w-3.5" />
            <li
              className="text-foreground font-medium"
              data-testid="breadcrumb-city"
            >
              {cityName}
            </li>
          </ol>
        </nav>

        <header className="mb-6">
          <h1
            className="text-2xl md:text-3xl font-bold mb-2"
            data-testid="h1-city-title"
          >
            Hotels in {cityName}
          </h1>
          <p
            className="text-muted-foreground max-w-3xl"
            data-testid="text-city-intro"
          >
            Discover verified hotels in {cityName} with zero commission booking.
            Pay only the best price directly to the hotel — no hidden fees, no
            middleman charges. Book your {cityName} stay on ZECOHO and save up
            to 25% compared to other travel sites.
          </p>
        </header>

        {!isLoading && (
          <p
            className="text-sm text-muted-foreground mb-4"
            data-testid="text-city-result-count"
          >
            {cityProperties.length}{" "}
            {cityProperties.length === 1 ? "hotel" : "hotels"} available in{" "}
            {cityName}
          </p>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/3] rounded-lg" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : cityProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cityProperties.map((property) => (
              <PropertyCard
                key={property.id}
                variant="grid"
                property={{
                  ...property,
                  isWishlisted: wishlistedPropertyIds.has(property.id),
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p
              className="text-lg text-muted-foreground mb-4"
              data-testid="text-no-hotels"
            >
              No hotels available in {cityName} yet.
            </p>
            <Link
              href="/search"
              className="text-primary hover:underline"
              data-testid="link-browse-all"
            >
              Browse all hotels
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
