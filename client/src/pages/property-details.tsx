import { useRoute } from "wouter";
import { PropertyDetailView } from "@/components/PropertyDetailView";
import NotFound from "@/pages/not-found";

export default function PropertyDetails() {
  const [, params] = useRoute("/properties/:id");
  const propertyId = params?.id;
  if (!propertyId) return <NotFound />;
  return <PropertyDetailView propertyId={propertyId} />;
}
