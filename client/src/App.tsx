// Referenced from blueprint:javascript_log_in_with_replit
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Search from "@/pages/search";
import PropertyDetails from "@/pages/property-details";
import Wishlist from "@/pages/wishlist";
import OwnerProperties from "@/pages/owner-properties";
import AddProperty from "@/pages/add-property";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/search" component={Search} />
          <Route path="/properties/:id" component={PropertyDetails} />
          <Route path="/wishlist" component={Wishlist} />
          <Route path="/owner/properties" component={OwnerProperties} />
          <Route path="/owner/properties/new" component={AddProperty} />
          <Route path="/owner/properties/:id/edit" component={AddProperty} />
          <Route path="/profile" component={Profile} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <>
      {!isLoading && isAuthenticated && <Header />}
      <Router />
      <Toaster />
    </>
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
