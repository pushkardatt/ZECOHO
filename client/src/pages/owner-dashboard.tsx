import { useQuery } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/OwnerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  CalendarCheck,
  IndianRupee,
  Building2,
  Star,
  TrendingUp,
  Eye,
  Edit,
  MessageSquare,
} from "lucide-react";

interface OwnerStats {
  bookingsToday: number;
  bookingsThisMonth: number;
  revenueToday: number;
  revenueThisMonth: number;
  propertyStatus: string;
  avgRating: number;
  reviewCount: number;
  properties: { id: string; title: string; status: string; pricePerNight: string }[];
}

export default function OwnerDashboard() {
  const { data: stats, isLoading } = useQuery<OwnerStats>({
    queryKey: ["/api/owner/stats"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      published: { variant: "default", label: "Published" },
      draft: { variant: "secondary", label: "Draft" },
      pending: { variant: "outline", label: "Pending Review" },
      rejected: { variant: "destructive", label: "Rejected" },
      none: { variant: "secondary", label: "No Property" },
    };
    const config = statusConfig[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <OwnerLayout>
      <div className="space-y-6" data-testid="owner-dashboard">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-bookings">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bookings</CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="bookings-today">
                    {stats?.bookingsToday || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {stats?.bookingsThisMonth || 0} this month
                    </span>
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-revenue">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="revenue-today">
                    {formatCurrency(stats?.revenueToday || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {formatCurrency(stats?.revenueThisMonth || 0)} this month
                    </span>
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-property-status">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Property Status</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="property-count">
                    {stats?.properties?.length || 0}
                  </div>
                  <div className="mt-1">
                    {getStatusBadge(stats?.propertyStatus || "none")}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-rating">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold flex items-center gap-1" data-testid="avg-rating">
                    {stats?.avgRating?.toFixed(1) || "0.0"}
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.reviewCount || 0} review{stats?.reviewCount !== 1 ? "s" : ""}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card data-testid="quick-actions">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/owner/bookings">
                <Button className="w-full justify-start" variant="outline" data-testid="action-view-bookings">
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  View Bookings
                </Button>
              </Link>
              <Link href="/owner/messages">
                <Button className="w-full justify-start" variant="outline" data-testid="action-messages">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Check Messages
                </Button>
              </Link>
              <Link href="/owner/property">
                <Button className="w-full justify-start" variant="outline" data-testid="action-edit-property">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Property
                </Button>
              </Link>
              <Link href="/owner/reviews">
                <Button className="w-full justify-start" variant="outline" data-testid="action-view-reviews">
                  <Star className="mr-2 h-4 w-4" />
                  View Reviews
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card data-testid="properties-list">
            <CardHeader>
              <CardTitle>Your Properties</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : stats?.properties && stats.properties.length > 0 ? (
                <div className="space-y-3">
                  {stats.properties.map((property) => (
                    <div
                      key={property.id}
                      className="flex items-center justify-between p-3 rounded-md border"
                      data-testid={`property-item-${property.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{property.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(parseFloat(property.pricePerNight))} / night
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {getStatusBadge(property.status)}
                        <Link href={`/properties/${property.id}`}>
                          <Button size="icon" variant="ghost" data-testid={`view-property-${property.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">No properties yet</p>
                  <Link href="/list-property">
                    <Button className="mt-4" data-testid="add-property">
                      List Your Property
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </OwnerLayout>
  );
}
