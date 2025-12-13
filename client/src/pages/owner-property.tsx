import { useQuery } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/OwnerLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Building2,
  MapPin,
  IndianRupee,
  Users,
  Bed,
  Bath,
  Edit,
  Eye,
  Plus,
} from "lucide-react";

interface Property {
  id: string;
  title: string;
  destination: string;
  pricePerNight: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  status: string;
  images: string[];
}

interface OwnerStats {
  properties: Property[];
}

export default function OwnerProperty() {
  const { data: stats, isLoading } = useQuery<OwnerStats>({
    queryKey: ["/api/owner/stats"],
  });

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      published: { variant: "default", label: "Published" },
      draft: { variant: "secondary", label: "Draft" },
      pending: { variant: "outline", label: "Pending Review" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const c = config[status] || { variant: "secondary", label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  return (
    <OwnerLayout>
      <div className="space-y-6" data-testid="owner-property">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Your Properties</h2>
            <p className="text-muted-foreground">Manage your property listings</p>
          </div>
          <Link href="/list-property">
            <Button data-testid="add-new-property">
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : stats?.properties && stats.properties.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {stats.properties.map((property) => (
              <Card key={property.id} data-testid={`property-card-${property.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{property.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {property.destination}
                      </CardDescription>
                    </div>
                    {getStatusBadge(property.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        <span>{formatCurrency(property.pricePerNight)} / night</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>Up to {property.maxGuests} guests</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Bed className="h-4 w-4 text-muted-foreground" />
                        <span>{property.bedrooms || 0} bedrooms</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Bath className="h-4 w-4 text-muted-foreground" />
                        <span>{property.bathrooms || 0} bathrooms</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/properties/${property.id}`} className="flex-1">
                        <Button variant="outline" className="w-full" data-testid={`view-btn-${property.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </Link>
                      <Link href={`/owner/properties/${property.id}/edit`} className="flex-1">
                        <Button variant="outline" className="w-full" data-testid={`edit-btn-${property.id}`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No properties listed</h3>
                <p className="mt-2 text-muted-foreground">
                  Start earning by listing your property on ZECOHO
                </p>
                <Link href="/list-property">
                  <Button className="mt-6" data-testid="list-first-property">
                    List Your First Property
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </OwnerLayout>
  );
}
