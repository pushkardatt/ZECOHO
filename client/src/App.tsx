// Referenced from blueprint:javascript_log_in_with_replit
import { useEffect, useState, useCallback } from "react";
import { Switch, Route, useLocation } from "wouter";
// Note: useEffect is still used by ScrollToTop component
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useBookingUpdates } from "@/hooks/useBookingUpdates";
import type { UrgentBookingAlert } from "@/hooks/useBookingUpdates";
import { UrgentBookingAlertModal } from "@/components/UrgentBookingAlert";
import { KycRouteGuard } from "@/lib/KycRouteGuard";
import { usePreLoginBooking } from "@/hooks/usePreLoginBooking";

function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}

function PreLoginBookingRedirect() {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const { getRedirectUrl, clearBookingIntent } = usePreLoginBooking();
  
  useEffect(() => {
    if (isAuthenticated) {
      const redirectUrl = getRedirectUrl();
      if (redirectUrl && !location.startsWith("/properties/")) {
        clearBookingIntent();
        setLocation(redirectUrl);
      }
    }
  }, [isAuthenticated, location, getRedirectUrl, clearBookingIntent, setLocation]);
  
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
import AdminPolicies from "@/pages/admin-policies";
import AdminOwnerAgreements from "@/pages/admin-owner-agreements";
import AdminContactSettings from "@/pages/admin-contact-settings";
import AdminAboutUs from "@/pages/admin-about-us";
import AdminBookings from "@/pages/admin-bookings";
import AdminOwners from "@/pages/admin-owners";
import AdminInventory from "@/pages/admin-inventory";
import AdminUsers from "@/pages/admin-users";
import AdminSupport from "@/pages/admin-support";
import AdminHome from "@/pages/admin-home";
import ContactUs from "@/pages/contact-us";
import AboutUs from "@/pages/about-us";
import OwnerAgreementPage from "@/pages/owner-agreement";
import KYC from "@/pages/kyc";
import ListPropertyWizard from "@/pages/list-property-wizard";
import DevAdminLogin from "@/pages/dev-admin-login";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import NotFound from "@/pages/not-found";
import AuthError from "@/pages/auth-error";
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
import WriteReview from "@/pages/write-review";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import { ConsentModal } from "@/components/ConsentModal";
import { OwnerAgreementConsentModal } from "@/components/OwnerAgreementConsentModal";
import { CompareProvider } from "@/contexts/CompareContext";
import { CompareBar } from "@/components/CompareBar";
import ComparePage from "@/pages/compare";
import LogoGallery from "@/pages/logo-gallery";
import { SupportChat } from "@/components/SupportChat";
import { MobileBottomNav } from "@/components/MobileBottomNav";

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
      <Route path="/owner/:rest*">{() => {
        window.location.href = "/owner/dashboard";
        return null;
      }}</Route>
      <Route path="/wishlist" component={Wishlist} />
      <Route path="/search-history" component={SearchHistoryPage} />
      <Route path="/messages" component={Messages} />
      <Route path="/profile" component={Profile} />
      <Route path="/admin/destinations" component={AdminDestinations} />
      <Route path="/admin/properties" component={AdminProperties} />
      <Route path="/admin/kyc" component={AdminKYC} />
      <Route path="/admin/policies" component={AdminPolicies} />
      <Route path="/admin/owner-agreements" component={AdminOwnerAgreements} />
      <Route path="/admin/contact-settings" component={AdminContactSettings} />
      <Route path="/admin/about-us" component={AdminAboutUs} />
      <Route path="/admin/bookings" component={AdminBookings} />
      <Route path="/admin/owners" component={AdminOwners} />
      <Route path="/admin/inventory" component={AdminInventory} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/support" component={AdminSupport} />
      <Route path="/admin" component={AdminHome} />
      <Route path="/contact" component={ContactUs} />
      <Route path="/about-us" component={AboutUs} />
      <Route path="/owner-agreement" component={OwnerAgreementPage} />
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
      <Route path="/property/:propertyId/review" component={WriteReview} />
      <Route path="/destinations" component={Destinations} />
      <Route path="/destinations/:id" component={DestinationDetails} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/compare" component={ComparePage} />
      <Route path="/logo-gallery" component={LogoGallery} />
      <Route path="/auth-error" component={AuthError} />
      <Route component={NotFound} />
    </Switch>
  );
}

// KYC route guard is now centralized in KycRouteGuard component
// All KYC-based redirects happen AFTER navigation, not during render

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  // Global urgent alert state — fires regardless of which owner page is active
  const [urgentAlert, setUrgentAlert] = useState<UrgentBookingAlert | null>(null);

  const handleUrgentBooking = useCallback((data: UrgentBookingAlert) => {
    setUrgentAlert(data);
  }, []);

  // Auto-subscribe authenticated users to push notifications by default
  usePushNotifications(isAuthenticated);

  // Mount WebSocket at app root — handles notification_update events AND urgent booking alerts globally
  const isOwner = user?.userRole === "owner" || user?.additionalRoles?.includes("owner");
  useBookingUpdates({
    userId: user?.id,
    onUrgentBooking: isOwner ? handleUrgentBooking : undefined,
  });

  // Fetch current policy versions to check if user needs to re-consent
  const { data: policyVersions } = useQuery<{ termsVersion: number | null; privacyVersion: number | null }>({
    queryKey: ["/api/policies/versions/current"],
    enabled: isAuthenticated && !!user,
    staleTime: 60000,
  });

  // Fetch current owner agreement version
  const isOwnerRoute = location.startsWith("/owner/") || location === "/list-property";
  const isOwnerOrSwitching = user?.userRole === "owner" || user?.additionalRoles?.includes("owner") || isOwnerRoute;
  
  const { data: ownerAgreementVersion } = useQuery<{ version: number | null }>({
    queryKey: ["/api/owner-agreement/version/current"],
    enabled: isAuthenticated && !!user && isOwnerOrSwitching,
    staleTime: 60000,
  });

  // Always show header on all pages including landing page
  const showHeader = true;
  
  // Check if user needs to accept consent (authenticated but hasn't accepted terms/privacy)
  const hasNeverAccepted = !!(isAuthenticated && user && (!user.termsAccepted || !user.privacyAccepted));
  
  // Check if user needs to re-consent due to policy version update
  const needsVersionUpdate = !!(
    isAuthenticated && 
    user && 
    user.termsAccepted && 
    user.privacyAccepted &&
    policyVersions &&
    (
      (policyVersions.termsVersion !== null && (user.termsAcceptedVersion || 0) < policyVersions.termsVersion) ||
      (policyVersions.privacyVersion !== null && (user.privacyAcceptedVersion || 0) < policyVersions.privacyVersion)
    )
  );
  
  const needsConsent = hasNeverAccepted || needsVersionUpdate;
  
  // Don't show consent modal on terms/privacy pages so users can read them
  const isConsentPage = location === "/terms" || location === "/privacy";
  const showConsentModal = needsConsent && !isConsentPage;

  // Check if owner needs to accept owner agreement
  const ownerHasNeverAccepted = !!(
    isAuthenticated && 
    user && 
    isOwnerRoute &&
    ownerAgreementVersion?.version !== null &&
    !user.ownerAgreementAccepted
  );
  
  const ownerNeedsVersionUpdate = !!(
    isAuthenticated && 
    user && 
    isOwnerRoute &&
    user.ownerAgreementAccepted &&
    ownerAgreementVersion?.version !== null &&
    ownerAgreementVersion?.version !== undefined &&
    (user.ownerAgreementAcceptedVersion || 0) < (ownerAgreementVersion?.version || 0)
  );
  
  const needsOwnerAgreementConsent = ownerHasNeverAccepted || ownerNeedsVersionUpdate;
  
  // Don't show owner agreement modal on the agreement page so users can read it
  const isOwnerAgreementPage = location === "/owner-agreement";
  // Only show owner agreement modal if general consent is not needed (prioritize general consent first)
  const showOwnerAgreementModal = needsOwnerAgreementConsent && !isOwnerAgreementPage && !showConsentModal;

  return (
    <CompareProvider>
      <KycRouteGuard>
        <div className="flex flex-col min-h-screen">
          <ScrollToTop />
          <PreLoginBookingRedirect />
          {showHeader && <Header />}
          <div className="flex-1 pt-14 md:pt-0 pb-12 md:pb-0">
            <Router />
          </div>
          {location === "/" && <Footer />}
          <CompareBar />
          <MobileBottomNav />
          {user && <SupportChat />}
          <Toaster />
          <ConsentModal 
            open={showConsentModal} 
            userName={user?.firstName || undefined}
            isVersionUpdate={needsVersionUpdate && !hasNeverAccepted}
          />
          <OwnerAgreementConsentModal
            open={showOwnerAgreementModal}
            userName={user?.firstName || undefined}
            isVersionUpdate={ownerNeedsVersionUpdate && !ownerHasNeverAccepted}
          />
          {/* Global urgent booking alert — shown on ANY page the owner is on */}
          <UrgentBookingAlertModal
            alert={urgentAlert}
            onDismiss={() => setUrgentAlert(null)}
          />
        </div>
      </KycRouteGuard>
    </CompareProvider>
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
