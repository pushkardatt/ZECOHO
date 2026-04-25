import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Skeleton } from "@/components/ui/skeleton";
import { PropertyDetailView } from "@/components/PropertyDetailView";
import NotFound from "@/pages/not-found";
import type { Property } from "@shared/schema";

export default function HotelProperty() {
  const [, params] = useRoute("/hotels/:citySlug/:propertySlug");
  const citySlug = params?.citySlug;
  const propertySlug = params?.propertySlug;

  const {
    data: property,
    isLoading,
    error,
  } = useQuery<Property>({
    queryKey: ["/api/properties/by-slug", propertySlug],
    enabled: !!propertySlug,
  });

  if (!propertySlug || !citySlug) return <NotFound />;
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-96 w-full mb-4" />
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }
  if (error || !property) return <NotFound />;

  const cityName = property.propCity || property.destination || "";
  const description = (property.description || "").slice(0, 155);
  const image = property.images?.[0];
  const canonical = `https://www.zecoho.com/hotels/${citySlug}/${propertySlug}`;
  const title = `${property.title} in ${cityName} - Book Direct Zero Commission | ZECOHO`;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: property.title,
    address: {
      "@type": "PostalAddress",
      streetAddress:
        property.propStreetAddress || property.address || undefined,
      addressLocality: property.propCity || undefined,
      addressRegion: property.propState || undefined,
      postalCode: property.propPincode || undefined,
      addressCountry: "IN",
    },
  };
  if (property.starRating) {
    jsonLd.starRating = {
      "@type": "Rating",
      ratingValue: property.starRating,
    };
  }
  if (image) {
    jsonLd.image = [image];
  }

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        {image && <meta property="og:image" content={image} />}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <PropertyDetailView propertyId={property.id} />
    </>
  );
}
