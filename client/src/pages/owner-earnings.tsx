import { useQuery } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/OwnerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IndianRupee,
  TrendingUp,
  Calendar,
  CalendarDays,
} from "lucide-react";

interface OwnerStats {
  revenueToday: number;
  revenueThisMonth: number;
  bookingsToday: number;
  bookingsThisMonth: number;
}

export default function OwnerEarnings() {
  const { data: stats, isLoading } = useQuery<OwnerStats>({
    queryKey: ["/api/owner/stats"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <OwnerLayout>
      <div className="space-y-6" data-testid="owner-earnings">
        <div>
          <h2 className="text-2xl font-bold">Earnings Overview</h2>
          <p className="text-muted-foreground">Track your revenue and booking income</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-today-revenue">
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

          <Card data-testid="card-month-revenue">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold" data-testid="revenue-month-value">
                  {formatCurrency(stats?.revenueThisMonth || 0)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-today-bookings">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-bold" data-testid="bookings-today-value">
                  {stats?.bookingsToday || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-month-bookings">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Bookings</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-bold" data-testid="bookings-month-value">
                  {stats?.bookingsThisMonth || 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Earnings Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-muted-foreground">Commission Rate</span>
                <span className="font-bold text-green-600" data-testid="commission-rate">0% (ZERO)</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-muted-foreground">Your Share</span>
                <span className="font-bold text-green-600" data-testid="owner-share">100%</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-muted-foreground">Monthly Earnings</span>
                <span className="font-bold text-xl" data-testid="monthly-earnings">
                  {isLoading ? <Skeleton className="h-6 w-24" /> : formatCurrency(stats?.revenueThisMonth || 0)}
                </span>
              </div>
            </div>
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300" data-testid="zero-commission-note">
                <strong>ZECOHO Zero Commission:</strong> You keep 100% of your earnings. 
                No platform fees, no hidden charges.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </OwnerLayout>
  );
}
