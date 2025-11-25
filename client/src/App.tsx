// Referenced from blueprint:javascript_log_in_with_replit
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
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
import DevAdminLogin from "@/pages/dev-admin-login";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {(!isAuthenticated || isLoading) && (
        <Route path="/" component={Landing} />
      )}
      {isAuthenticated && !isLoading && (
        <>
          <Route path="/" component={Home} />
          <Route path="/list-property">
            <Redirect to="/kyc" />
          </Route>
          <Route path="/wishlist" component={Wishlist} />
          <Route path="/search-history" component={SearchHistoryPage} />
          <Route path="/messages" component={Messages} />
          <Route path="/owner/properties" component={OwnerProperties} />
          <Route path="/owner/properties/new" component={AddProperty} />
          <Route path="/owner/properties/:id/edit" component={AddProperty} />
          <Route path="/admin/destinations" component={AdminDestinations} />
          <Route path="/admin/properties" component={AdminProperties} />
          <Route path="/admin/kyc" component={AdminKYC} />
          <Route path="/profile" component={Profile} />
        </>
      )}
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

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      {!isLoading && isAuthenticated && <Header />}
      <div className="flex-1">
        <Router />
      </div>
      <Footer />
      <Toaster />
    </div>
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
