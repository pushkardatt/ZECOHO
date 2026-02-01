import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/OwnerLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useKycGuard } from "@/hooks/useKycGuard";
import { Link } from "wouter";
import {
  IndianRupee,
  TrendingUp,
  CalendarCheck,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  XCircle,
  Calendar,
  CheckCircle,
  Clock,
  Ban,
  AlertTriangle,
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

interface MonthlySummary {
  year: number;
  month: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  rejected: number;
  noShow: number;
  pending: number;
  totalRevenue: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function OwnerEarnings() {
  const { isKycRejected } = useKycGuard();
  
  // Get current date for default month/year
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  // State for month filter
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  
  const { data: stats, isLoading } = useQuery<EarningsStats>({
    queryKey: ["/api/owner/stats"],
  });
  
  // Fetch monthly summary based on selected month/year
  const { data: monthlySummary, isLoading: isLoadingMonthly } = useQuery<MonthlySummary>({
    queryKey: ["/api/owner/monthly-summary", selectedYear, selectedMonth],
  });
  
  // Generate year options (last 3 years)
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);

  if (isKycRejected) {
    return (
      <OwnerLayout>
        <Alert variant="destructive" className="mb-6" data-testid="kyc-rejected-block">
          <XCircle className="h-5 w-5" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>Your KYC has been rejected. Please fix your KYC to view earnings.</span>
            <Link href="/owner/kyc">
              <Button variant="destructive" size="sm" data-testid="btn-fix-kyc">
                Fix KYC & Resubmit
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      </OwnerLayout>
    );
  }

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

        {/* Monthly Summary Section with Filter */}
        <Card data-testid="card-monthly-summary">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Monthly Summary
                </CardTitle>
                <CardDescription>
                  Booking and earnings breakdown for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={String(selectedMonth)}
                  onValueChange={(value) => setSelectedMonth(parseInt(value))}
                >
                  <SelectTrigger className="w-[130px]" data-testid="select-month">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((month, index) => (
                      <SelectItem key={index + 1} value={String(index + 1)}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(selectedYear)}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger className="w-[100px]" data-testid="select-year">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingMonthly ? (
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Revenue Highlight */}
                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Revenue for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                      </p>
                      <p className="text-3xl font-bold text-primary" data-testid="monthly-revenue-value">
                        {formatCurrency(monthlySummary?.totalRevenue || 0)}
                      </p>
                    </div>
                    <IndianRupee className="h-10 w-10 text-primary/50" />
                  </div>
                </div>

                {/* Booking Status Breakdown */}
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                  <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg" data-testid="stat-completed">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">Completed</span>
                    </div>
                    <p className="text-2xl font-bold">{monthlySummary?.completed || 0}</p>
                  </div>
                  
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg" data-testid="stat-confirmed">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarCheck className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Confirmed</span>
                    </div>
                    <p className="text-2xl font-bold">{monthlySummary?.confirmed || 0}</p>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg" data-testid="stat-pending">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Pending</span>
                    </div>
                    <p className="text-2xl font-bold">{monthlySummary?.pending || 0}</p>
                  </div>
                  
                  <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg" data-testid="stat-cancelled">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-700 dark:text-red-400">Cancelled</span>
                    </div>
                    <p className="text-2xl font-bold">{monthlySummary?.cancelled || 0}</p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 dark:bg-gray-950/30 rounded-lg" data-testid="stat-rejected">
                    <div className="flex items-center gap-2 mb-2">
                      <Ban className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-400">Rejected</span>
                    </div>
                    <p className="text-2xl font-bold">{monthlySummary?.rejected || 0}</p>
                  </div>
                  
                  <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg" data-testid="stat-noshow">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-700 dark:text-orange-400">No Show</span>
                    </div>
                    <p className="text-2xl font-bold">{monthlySummary?.noShow || 0}</p>
                  </div>
                </div>

                {/* Total Bookings for Month */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Bookings this Month</span>
                    <span className="text-xl font-bold" data-testid="monthly-total-bookings">
                      {(monthlySummary?.completed || 0) + 
                       (monthlySummary?.confirmed || 0) + 
                       (monthlySummary?.pending || 0) + 
                       (monthlySummary?.cancelled || 0) + 
                       (monthlySummary?.rejected || 0) + 
                       (monthlySummary?.noShow || 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </OwnerLayout>
  );
}
