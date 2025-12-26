// Referenced from blueprint:javascript_log_in_with_replit
import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
// Note: useEffect is still used by ScrollToTop component
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { KycRouteGuard } from "@/lib/KycRouteGuard";

function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Landing from "@/pages/landing";
import Search from "@/pages/search";
import SearchHistoryPage from "@/pages/search-history";
import PropertyDetails from "@/pages/property-details";
import Wishlist from "@/pages/wishlist";
import Messages from "@/pages/messages";
import OwnerProperties from "@/pages/owner-properties";
import AddProperty from "@/pages/add-property";
import Profile from "@/pages/profile";
import Destinations from "@/pages/destinations";
import DestinationDetails from "@/pages/destination-details";
import AdminDestinations from "@/pages/admin-destinations";
import AdminProperties from "@/pages/admin-properties";
import AdminKYC from "@/pages/admin-kyc";
import AdminAccess from "@/pages/admin-access";
import KYC from "@/pages/kyc";
import ListPropertyWizard from "@/pages/list-property-wizard";
import DevAdminLogin from "@/pages/dev-admin-login";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import NotFound from "@/pages/not-found";
import OwnerDashboard from "@/pages/owner-dashboard";
import OwnerBookings from "@/pages/owner-bookings";
import MyBookings from "@/pages/my-bookings";
import OwnerMessagesPage from "@/pages/owner-messages";
import OwnerProperty from "@/pages/owner-property";
import OwnerPropertyManage from "@/pages/owner-property-manage";
import OwnerEarnings from "@/pages/owner-earnings";
import OwnerReviews from "@/pages/owner-reviews";
import OwnerSettings from "@/pages/owner-settings";
import OwnerKyc from "@/pages/owner-kyc";
import ChooseListingMode from "@/pages/choose-listing-mode";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/my-bookings" component={MyBookings} />
      <Route path="/owner/dashboard" component={OwnerDashboard} />
      <Route path="/owner/bookings" component={OwnerBookings} />
      <Route path="/owner/messages" component={OwnerMessagesPage} />
      <Route path="/owner/property" component={OwnerProperty} />
      <Route path="/owner/properties" component={OwnerProperties} />
      <Route path="/owner/properties/new" component={AddProperty} />
      <Route path="/owner/properties/:id/edit" component={OwnerPropertyManage} />
      <Route path="/owner/earnings" component={OwnerEarnings} />
      <Route path="/owner/reviews" component={OwnerReviews} />
      <Route path="/owner/settings" component={OwnerSettings} />
      <Route path="/owner/kyc" component={OwnerKyc} />
      <Route path="/owner/choose-mode" component={ChooseListingMode} />
      <Route path="/wishlist" component={Wishlist} />
      <Route path="/search-history" component={SearchHistoryPage} />
      <Route path="/messages" component={Messages} />
      <Route path="/profile" component={Profile} />
      <Route path="/admin/destinations" component={AdminDestinations} />
      <Route path="/admin/properties" component={AdminProperties} />
      <Route path="/admin/kyc" component={AdminKYC} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/list-property" component={ListPropertyWizard} />
      <Route path="/admin-access" component={AdminAccess} />
      <Route path="/dev-admin" component={DevAdminLogin} />
      <Route path="/kyc" component={KYC} />
      <Route path="/search" component={Search} />
      <Route path="/properties" component={Search} />
      <Route path="/properties/:id" component={PropertyDetails} />
      <Route path="/destinations" component={Destinations} />
      <Route path="/destinations/:id" component={DestinationDetails} />
      <Route component={NotFound} />
    </Switch>
  );
}

// KYC route guard is now centralized in KycRouteGuard component
// All KYC-based redirects happen AFTER navigation, not during render

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  // Always show header on all pages including landing page
  const showHeader = true;

  return (
    <KycRouteGuard>
      <div className="flex flex-col min-h-screen">
        <ScrollToTop />
        {showHeader && <Header />}
        <div className="flex-1">
          <Router />
        </div>
        <Footer />
        <Toaster />
      </div>
    </KycRouteGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
