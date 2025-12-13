import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/OwnerLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  Building2,
  Plus,
  Eye,
  Edit,
  IndianRupee,
  MapPin,
  BedDouble,
  Users,
  Check,
  X,
} from "lucide-react";

interface Property {
  id: number;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pricePerNight: string;
  maxGuests: number;
  bedrooms: number;
  status: string;
  imageUrl?: string;
}

export default function OwnerProperty() {
  const { toast } = useToast();
  const [editingPrice, setEditingPrice] = useState<number | null>(null);
  const [newPrice, setNewPrice] = useState("");

  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ["/api/owner/properties"],
  });

  const updatePriceMutation = useMutation({
    mutationFn: async ({ id, price }: { id: number; price: string }) => {
      return apiRequest("PATCH", `/api/owner/properties/${id}`, { pricePerNight: price });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/properties"] });
      setEditingPrice(null);
      setNewPrice("");
      toast({
        title: "Price Updated",
        description: "Property price has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update property price.",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      published: { variant: "default", label: "Published" },
      draft: { variant: "secondary", label: "Draft" },
      pending: { variant: "outline", label: "Pending Review" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const config = statusConfig[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleEditPrice = (property: Property) => {
    setEditingPrice(property.id);
    setNewPrice(property.pricePerNight);
  };

  const handleSavePrice = (id: number) => {
    if (!newPrice || parseFloat(newPrice) <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price.",
        variant: "destructive",
      });
      return;
    }
    updatePriceMutation.mutate({ id, price: newPrice });
  };

  const handleCancelEdit = () => {
    setEditingPrice(null);
    setNewPrice("");
  };

  return (
    <OwnerLayout>
      <div className="space-y-6" data-testid="owner-property">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold">Your Properties</h2>
            <p className="text-sm text-muted-foreground">
              Manage your listed properties
            </p>
          </div>
          <Link href="/list-property">
            <Button data-testid="add-new-property">
              <Plus className="h-4 w-4 mr-2" />
              Add New Property
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : properties && properties.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {properties.map((property) => (
              <Card key={property.id} data-testid={`property-card-${property.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-lg truncate">{property.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {property.city}, {property.state}
                      </CardDescription>
                    </div>
                    {getStatusBadge(property.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {property.description}
                  </p>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-muted-foreground" />
                      <span>{property.bedrooms} Bedrooms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{property.maxGuests} Guests</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-muted-foreground" />
                      {editingPrice === property.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            className="h-7 w-20 text-sm"
                            data-testid={`price-input-${property.id}`}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleSavePrice(property.id)}
                            disabled={updatePriceMutation.isPending}
                            data-testid={`save-price-${property.id}`}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={handleCancelEdit}
                            data-testid={`cancel-price-${property.id}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditPrice(property)}
                          className="hover:underline"
                          data-testid={`edit-price-${property.id}`}
                        >
                          {formatCurrency(property.pricePerNight)}/night
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Link href={`/properties/${property.id}`}>
                      <Button size="sm" variant="outline" data-testid={`view-property-${property.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    <Link href={`/owner/properties/${property.id}/edit`}>
                      <Button size="sm" variant="outline" data-testid={`edit-property-${property.id}`}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Properties Yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Start earning by listing your first property on ZECOHO
              </p>
              <Link href="/list-property">
                <Button data-testid="list-first-property">
                  <Plus className="h-4 w-4 mr-2" />
                  List Your First Property
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </OwnerLayout>
  );
}
