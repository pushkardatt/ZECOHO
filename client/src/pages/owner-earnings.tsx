import { useQuery } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/OwnerLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IndianRupee,
  TrendingUp,
  CalendarCheck,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface EarningsStats {
  revenueToday: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  bookingsToday: number;
  bookingsThisMonth: number;
  bookingsLastMonth: number;
  totalRevenue: number;
  totalBookings: number;
}

export default function OwnerEarnings() {
  const { data: stats, isLoading } = useQuery<EarningsStats>({
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

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const revenueGrowth = stats
    ? calculateGrowth(stats.revenueThisMonth, stats.revenueLastMonth)
    : 0;
  const bookingsGrowth = stats
    ? calculateGrowth(stats.bookingsThisMonth, stats.bookingsLastMonth)
    : 0;

  return (
    <OwnerLayout>
      <div className="space-y-6" data-testid="owner-earnings">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">ZERO Commission</CardTitle>
            </div>
            <CardDescription>
              Unlike other platforms that charge 15-25% commission, ZECOHO charges ZERO.
              You keep 100% of your earnings!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant="default" className="text-sm py-1 px-3">
                0% Platform Fee
              </Badge>
              <span className="text-sm text-muted-foreground">
                No hidden charges, no booking fees
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-revenue-today">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold" data-testid="revenue-today-value">
                  {formatCurrency(stats?.revenueToday || 0)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-revenue-month">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="revenue-month-value">
                    {formatCurrency(stats?.revenueThisMonth || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    {revenueGrowth >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500" />
                    )}
                    <span className={revenueGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                      {Math.abs(revenueGrowth).toFixed(1)}%
                    </span>
                    vs last month
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-bookings-today">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Bookings</CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid="bookings-today-value">
                  {stats?.bookingsToday || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-bookings-month">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Bookings</CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="bookings-month-value">
                    {stats?.bookingsThisMonth || 0}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    {bookingsGrowth >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500" />
                    )}
                    <span className={bookingsGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                      {Math.abs(bookingsGrowth).toFixed(1)}%
                    </span>
                    vs last month
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card data-testid="card-total-revenue">
            <CardHeader>
              <CardTitle>Total Revenue</CardTitle>
              <CardDescription>All time earnings from your properties</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-12 w-32" />
              ) : (
                <div className="text-3xl font-bold" data-testid="total-revenue-value">
                  {formatCurrency(stats?.totalRevenue || 0)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-total-bookings">
            <CardHeader>
              <CardTitle>Total Bookings</CardTitle>
              <CardDescription>All time bookings across your properties</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-12 w-20" />
              ) : (
                <div className="text-3xl font-bold" data-testid="total-bookings-value">
                  {stats?.totalBookings || 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </OwnerLayout>
  );
}
